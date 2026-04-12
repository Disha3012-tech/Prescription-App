from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import uuid
import shutil
import os
import json
import hashlib
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

import re

from app.ocr import extract_text
from app.clean import clean_text
from app.matcher import detect_medicines
from app.llm_corrector import correct_medicines
from app.structurer import structure_medicines
from app.explain import explain_medicine
from app.llm import call_llm_chat, call_llm

# ─── Models ───────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    country: Optional[str] = "India"

# ─── Modular imports ──────────────────────────────────────────────────────

from app.database import init_db, get_db
from app import models
from app.routers.auth import router as auth_router
from app.routers.prescriptions import router as presc_router
from app.routers.medications import router as medications_router
from app.routers.symptoms import router as symptoms_router
from app.routers.family import router as family_router

app = FastAPI(title="Prescription Analyzer API")

# Initialize database
init_db()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(presc_router)
app.include_router(medications_router)
app.include_router(symptoms_router)
app.include_router(family_router)

# ─── Endpoints ────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(req: ChatRequest):
    country = req.country or "India"
    system_prompt = {
        "role": "system",
        "content": f"You are a friendly, knowledgeable medical assistant for patients in {country}. Explain medicines in simple English. Mention generics available in {country}. Give disclaimers. Do not diagnose. Use symbols (•, 💊, ⚠️) and bold text (**important**) to make information easy to read."
    }
    messages = [system_prompt] + [m.dict() for m in req.messages]
    try:
        response = call_llm_chat(messages)
        return {"status": "success", "content": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
class DrugInteractionRequest(BaseModel):
    drug1: str
    drug2: str
    country: Optional[str] = "India"

@app.post("/drug-interaction")
async def drug_interaction(req: DrugInteractionRequest):
    drug1 = req.drug1.strip()
    drug2 = req.drug2.strip()

    # ── Step 1: Pull FDA-certified interaction data ──────────────────────
    fda_text = ""
    try:
        # Search drug1's label for mentions of drug2
        fda_url = (
            f"https://api.fda.gov/drug/label.json"
            f"?search=openfda.brand_name:\"{drug1}\"+AND+drug_interactions:\"{drug2}\"&limit=1"
        )
        fda_resp = requests.get(fda_url, timeout=8)
        fda_data = fda_resp.json()

        if "results" in fda_data:
            fda_text = fda_data["results"][0].get("drug_interactions", [""])[0]

        # Fallback: search by generic name
        if not fda_text:
            fda_url2 = (
                f"https://api.fda.gov/drug/label.json"
                f"?search=openfda.generic_name:\"{drug1}\"+AND+drug_interactions:\"{drug2}\"&limit=1"
            )
            fda_resp2 = requests.get(fda_url2, timeout=8)
            fda_data2 = fda_resp2.json()
            if "results" in fda_data2:
                fda_text = fda_data2["results"][0].get("drug_interactions", [""])[0]

    except Exception as e:
        print(f"[FDA ERROR]: {e}")
        fda_text = ""

    print(f"[FDA TEXT]: {fda_text[:300] if fda_text else 'No FDA data found'}")

    # ── Step 2: LLM structures the FDA data (or uses own knowledge if FDA empty) ──
    if fda_text:
        source_instruction = f"""The following is the OFFICIAL FDA drug interaction text for {drug1}:

--- FDA LABEL ---
{fda_text[:2000]}
--- END FDA LABEL ---

Based STRICTLY on this FDA text, extract and structure the interaction with {drug2}."""
    else:
        source_instruction = f"""No FDA label data was found for this specific combination.
Use your certified pharmacological knowledge to assess the interaction between {drug1} and {drug2}.
Be conservative — if uncertain, lean toward 'mild' not 'safe'."""

    prompt = f"""You are a clinical pharmacologist. {source_instruction}

Return ONLY a valid JSON object (no markdown, no backticks):
{{
  "drug1": "{drug1}",
  "drug2": "{drug2}",
  "severity": "safe or mild or dangerous",
  "summary": "One precise clinical sentence",
  "mechanism": "Pharmacological mechanism",
  "whatHappens": "Clinical symptoms/outcomes",
  "recommendation": "Specific advice for patient in {req.country}",
  "diceyConditions": "Conditions that increase risk (elderly, kidney disease, pregnancy, etc.)",
  "alternatives": ["safer alternative if needed"],
  "sources": "{'FDA drug label database' if fda_text else 'Clinical pharmacology knowledge'}"
}}

severity must be exactly: "safe", "mild", or "dangerous".
If in doubt between levels, choose the MORE cautious one."""

    try:
        raw = call_llm(prompt)
        print(f"[LLM RAW]: {raw}")
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="LLM did not return valid JSON")
        result = json.loads(match.group())
        # Flag whether FDA data was used
        result["fda_verified"] = bool(fda_text)
        return {"status": "success", "result": result}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON parse error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/analyze-prescription")
async def analyze(
    file: UploadFile = File(...),
    country: str = Form(default="India"),
    currency: str = Form(default="INR"),
    user_id: Optional[str] = Form(default=None),
    db: Session = Depends(get_db)
):
    ext = file.filename.split(".")[-1]
    file_path = f"{UPLOAD_FOLDER}/{uuid.uuid4()}.{ext}"

    try:
        content = await file.read()
        image_hash = hashlib.md5(content).hexdigest()
        await file.seek(0)

        # Check for existing prescription with same hash for this user
        if user_id:
            existing = db.query(models.Prescription).filter(
                models.Prescription.user_id == user_id,
                models.Prescription.image_hash == image_hash
            ).first()
            
            if existing:
                print(f"[DUPLICATE DETECTED]: Returning existing analysis for hash {image_hash}")
                return {
                    "status": "success",
                    "is_duplicate": True,
                    "existing_id": existing.id,
                    "raw_text": existing.raw_text,
                    "avg_confidence": existing.avg_confidence,
                    "results": json.loads(existing.results_json),
                    "image_url": existing.image_url,
                    "country": existing.country,
                    "currency": existing.currency,
                    "medicine_highlights": [] # Not stored in DB currently, but we can skip highlighting if it's already confirmed
                }

        with open(file_path, "wb") as buffer:
            buffer.write(content)

        # 1. OCR
        ocr_data = extract_text(file_path)
        raw_text = ocr_data["full_text"]
        ocr_words = ocr_data["words"]
        avg_confidence = ocr_data["avg_confidence"]

        if not raw_text.strip():
            return {"status": "error", "message": "No readable text found in image"}

        # 2. Clean text
        cleaned_text = clean_text(raw_text)

        # 3. Rough medicine detection
        rough_meds = detect_medicines(cleaned_text)

        # 4. LLM correction (using primary OCR + TrOCR as secondary evidence)
        trocr_text = ocr_data.get("trocr_text", "")
        corrected_meds = correct_medicines(rough_meds, cleaned_text, country, trocr_text=trocr_text)

        # 5. Structure extraction
        structured = structure_medicines(corrected_meds, cleaned_text, country, ocr_words=ocr_words)

        medicine_highlights = [
            {
                "medicine": s.get("name"),
                "bbox": s.get("bbox"),
                "confidence": s.get("confidence", 0.7),
                "uncertain": s.get("uncertain", False),
            }
            for s in structured
        ]

        return {
            "status": "success",
            "raw_text": raw_text,
            "cleaned_text": cleaned_text,
            "avg_confidence": avg_confidence,
            "ocr_words": ocr_words,
            "medicine_highlights": medicine_highlights,
            "country": country,
            "currency": currency,
            "results": structured,
            "image_url": f"/uploads/{file_path.split('/')[-1]}",
            "image_hash": image_hash
        }

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise e

import urllib.request
import urllib.parse

@app.get("/api/pharmacies/nearby")
def get_nearby_pharmacies(lat: float, lng: float):
    query = {
        "format": "json", "q": "pharmacy", "lat": lat, "lon": lng, 
        "bounded": 1, "viewbox": f"{lng-0.05},{lat+0.05},{lng+0.05},{lat-0.05}", "limit": 10
    }
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(query)
    req = urllib.request.Request(url, headers={"User-Agent": "PrescriptionApp/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
        results = []
        for i, item in enumerate(data):
            title = item.get("name")
            if not title: title = "Local Pharmacy"
            results.append({
                "id": str(item.get("place_id", i)),
                "title": title,
                "latitude": float(item.get("lat")),
                "longitude": float(item.get("lon"))
            })
        # If API returns nothing in area, return empty instead of dummy so it reflects 
        # real location accurately.
        return {"status": "success", "pharmacies": results}
    except Exception as e:
        return {"status": "error", "pharmacies": []}
class ConfirmRequest(BaseModel):
    confirmed_medicines: List[dict]   # [{name, dosage, frequency, duration, form}]
    country: Optional[str] = "India"
    currency: Optional[str] = "INR"
    user_id: Optional[str] = None
    raw_text: Optional[str] = ""
    avg_confidence: Optional[float] = 0.0
    image_url: Optional[str] = None
    image_hash: Optional[str] = None
    prescription_id: Optional[str] = None

@app.post("/confirm-medicines")
async def confirm_medicines(req: ConfirmRequest, db: Session = Depends(get_db)):
    """
    Called after user reviews the highlight+confirm UI.
    Runs explain() only on user-confirmed medicines and saves to DB.
    """
    results = []
    for med in req.confirmed_medicines:
        explanation = explain_medicine(med, req.country, req.currency)
        results.append(explanation)

    if req.user_id and results:
        if req.prescription_id:
            new_record = db.query(models.Prescription).filter(models.Prescription.id == req.prescription_id).first()
            if new_record:
                new_record.results_json = json.dumps(results)
                new_record.raw_text = req.raw_text
                new_record.avg_confidence = req.avg_confidence
                if req.image_url:
                    new_record.image_url = req.image_url
                db.query(models.Medication).filter(models.Medication.prescription_id == req.prescription_id).delete()
            else:
                return {"status": "error", "message": "Record not found"}
        else:
            new_record = models.Prescription(
                user_id=req.user_id,
                date=datetime.utcnow(),
                raw_text=req.raw_text,
                avg_confidence=req.avg_confidence,
                results_json=json.dumps(results),
                country=req.country,
                currency=req.currency,
                image_url=req.image_url,
                image_hash=req.image_hash
            )
            db.add(new_record)
        db.commit()
        db.refresh(new_record)

        colors = [
            {"color": "#3B82F6", "bg": "#DBEAFE"},
            {"color": "#D97706", "bg": "#FEF3C7"},
            {"color": "#8B5CF6", "bg": "#EDE9FE"},
            {"color": "#10B981", "bg": "#D1FAE5"}
        ]
        for idx, r in enumerate(results):
            c = colors[idx % len(colors)]
            new_med = models.Medication(
                user_id=req.user_id,
                prescription_id=new_record.id,
                name=r.get("medicine", "Unknown"),
                dose=r.get("dosage", "Standard dose"),
                color=c["color"],
                color_bg=c["bg"]
            )
            db.add(new_med)
            db.commit()
            db.refresh(new_med)
            t1 = models.MedicationTime(medication_id=new_med.id, label="Morning", time="8:00 AM", taken=False, icon="weather-sunny")
            t2 = models.MedicationTime(medication_id=new_med.id, label="Evening", time="8:00 PM", taken=False, icon="weather-sunset")
            db.add_all([t1, t2])
            db.commit()

    return {
        "status": "success", 
        "results": results,
        "country": req.country,
        "currency": req.currency,
        "avg_confidence": req.avg_confidence
    }

@app.get("/health")
def health():
    return {"status": "ok"}
