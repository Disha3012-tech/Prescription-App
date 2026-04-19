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
import httpx
import re
import requests
import urllib.request
import urllib.parse
import asyncio
from app.ocr import extract_text
from app.clean import clean_text
from app.matcher import detect_medicines
from app.llm_corrector import correct_medicines
from app.structurer import structure_medicines
from app.explain import explain_medicine
from app.llm import call_llm_chat, call_llm, call_llm_vision
import math
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
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19000",
        "http://localhost:19006",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(presc_router)
app.include_router(medications_router)
app.include_router(symptoms_router)
app.include_router(family_router)

@app.get("/api/health-score")
async def get_health_score(user_id: str, db: Session = Depends(get_db)):
    medications = db.query(models.Medication).filter(models.Medication.user_id == user_id).all()
    if not medications:
        return {"score": 72, "trend": "+0 this week"}
    total_doses = 0
    taken_doses = 0
    for med in medications:
        times = db.query(models.MedicationTime).filter(models.MedicationTime.medication_id == med.id).all()
        total_doses += len(times)
        taken_doses += sum(1 for t in times if t.taken)
    
    score = 72
    if total_doses > 0:
        adherence = taken_doses / total_doses
        score = min(100, 72 + int(adherence * 28))
        
    return {"score": score, "trend": f"+{int(adherence * 10)} this week"}

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
        # 1. OCR
        ocr_data = extract_text(file_path)
        raw_text = ocr_data["full_text"]
        ocr_words = ocr_data["words"]
        avg_confidence = ocr_data["avg_confidence"]

        print(f"=== RAW OCR (confidence: {avg_confidence}) ===")
        print(raw_text[:300])

        if not raw_text.strip():
            return {"status": "error", "message": "No readable text found in image"}

        # 2. Clean text
        cleaned_text = clean_text(raw_text)

        # Decide: use vision directly if OCR confidence is too low
        word_count = len(cleaned_text.split())
        use_vision = avg_confidence < 55 or word_count < 10

        if use_vision:
            print("[VISION FALLBACK] OCR too noisy — sending image directly to Claude vision")
            
            from app.structurer import COUNTRY_SHORTHAND
            shorthand = COUNTRY_SHORTHAND.get(country, COUNTRY_SHORTHAND["India"])
            
            vision_prompt = f"""You are a clinical pharmacist reading a handwritten prescription from {country}.

Read EVERY line of the prescription carefully. Extract ALL medicines listed in the advice/prescription section.

Prescription shorthand for {country}:
{shorthand}

IMPORTANT RULES:
1. If you see the same medicine name twice (e.g. "Nikoran" and "Nikoan"), they are the SAME medicine — include it only ONCE with the best reading.
2. Look carefully at numbers next to medicine names — those are dosages (e.g. "500" = 500mg, "40" = 40mg).
3. Time indicators like "4 PM", "night", "morning", "BD", "OD" are frequencies — include them.
4. Lines with dashes (———) often connect a medicine name on the left to a dose/frequency on the right.
5. Do NOT include: doctor name, patient name, clinic address, dates, diagnoses, registration numbers.
6. The "Advice" section is where medicines are listed — focus there.

Return ONLY a valid JSON array, no markdown:
[{{
  "name": "exact medicine name as written",
  "form": "tablet or syrup or capsule or drops or injection or cream",
  "dosage": "e.g. 500 mg or 40 mg or 4 ml — empty string if not visible",
  "frequency": "in plain English e.g. once daily or twice daily or at night or at 4 PM",
  "duration": "e.g. 3 days or 1 month — empty string if not visible",
  "confidence": 0.0-1.0
}}]"""

            try:
                vision_raw = call_llm_vision(file_path, vision_prompt)
                print("Vision response:", vision_raw)
                
                clean_v = vision_raw.strip().strip("```json").strip("```").strip()
                structured = json.loads(clean_v)
                
                # Normalize fields
                for item in structured:
                    item["confidence"] = float(item.get("confidence", 0.75))
                    item["uncertain"] = item["confidence"] < 0.6
                    item["bbox"] = None
                    # Ensure no null values
                    for field in ["form", "dosage", "frequency", "duration"]:
                        if item.get(field) is None:
                            item[field] = ""

                medicine_highlights = [
                    {
                        "medicine": s.get("name"),
                        "bbox": None,
                        "confidence": s.get("confidence", 0.75),
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
                print(f"[VISION ERROR] {e} — falling through to OCR pipeline")
                # Fall through to normal pipeline if vision fails

        # NORMAL PATH — OCR confidence good enough
        # 3. Rough medicine detection
        fuzzy_candidates = detect_medicines(cleaned_text)

        # 4. LLM correction
        corrected_meds = correct_medicines(
            meds=[],
            text=cleaned_text,
            country=country,
            trocr_text=ocr_data.get("trocr_text", ""),
            fuzzy_candidates=fuzzy_candidates
        )

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

import math

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def is_open_now(opening_hours_str: str):
    if not opening_hours_str:
        return None
    s = opening_hours_str.lower().strip()
    if s == "24/7":
        return True
    days = ["mo", "tu", "we", "th", "fr", "sa", "su"]
    today = days[datetime.now().weekday()]
    now_minutes = datetime.now().hour * 60 + datetime.now().minute
    for part in s.split(";"):
        part = part.strip()
        match = re.search(r'(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})', part)
        if match and today in part:
            open_m = int(match.group(1)) * 60 + int(match.group(2))
            close_m = int(match.group(3)) * 60 + int(match.group(4))
            return open_m <= now_minutes <= close_m
    return None

# Keywords that indicate a result is NOT a pharmacy
NON_PHARMACY_KEYWORDS = [
    "hospital", "clinic", "doctor", "nursing", "school", "college",
    "hotel", "restaurant", "cafe", "shop", "store", "market", "mall",
    "salon", "beauty", "gym", "fitness", "bank", "atm", "temple",
    "church", "mosque", "office", "agency", "courier", "petrol", "fuel",
]

def is_likely_pharmacy(name: str, tags: dict = None) -> bool:
    """Filter out results that are clearly not pharmacies."""
    if not name:
        return False
    name_lower = name.lower()
    
    # Reject if name contains non-pharmacy keywords
    for kw in NON_PHARMACY_KEYWORDS:
        if kw in name_lower:
            return False
    
    # Accept if name contains pharmacy-related words
    pharmacy_words = ["pharma", "pharmacy", "medical", "medicine", "drug", 
                      "chemist", "health", "medic", "dispensary", "apollo",
                      "med ", "meds", "rx", "care", "wellness"]
    for kw in pharmacy_words:
        if kw in name_lower:
            return True
    
    # For Overpass results, trust the amenity=pharmacy tag completely
    if tags and tags.get("amenity") == "pharmacy":
        return True
    
    # For Nominatim, if name doesn't match any known word, be skeptical
    # but still include it (Overpass already filtered by amenity tag)
    return True


def parse_overpass_results(elements: list, user_lat: float, user_lng: float) -> list:
    results = []
    seen = set()
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name or name.lower() in seen:
            continue

        if not is_likely_pharmacy(name, tags):
            continue

        seen.add(name.lower())

        # Center coordinates for ways, or direct lat/lon for nodes
        plat = el.get("lat") or el.get("center", {}).get("lat")
        plng = el.get("lon") or el.get("center", {}).get("lon")

        if plat is None or plng is None:
            continue

        dist = haversine_km(user_lat, user_lng, float(plat), float(plng))

        # Address construction
        addr_parts = [
            tags.get("addr:housenumber"),
            tags.get("addr:street"),
            tags.get("addr:suburb") or tags.get("addr:city")
        ]
        address = ", ".join([p for p in addr_parts if p])

        results.append({
            "id": str(el.get("id", "")),
            "title": name,
            "latitude": float(plat),
            "longitude": float(plng),
            "rating": None,
            "address": address or "Address not specified",
            "open_now": is_open_now(tags.get("opening_hours")),
            "place_id": None,
            "distanceKm": round(dist, 3),
        })

    results.sort(key=lambda x: x["distanceKm"])
    return results


def parse_nominatim_results(items: list, user_lat: float, user_lng: float) -> list:
    results = []
    seen = set()
    for item in items:
        # Nominatim returns name in 'display_name' or 'namedetails'
        name = item.get("namedetails", {}).get("name") or item.get("name") or (item.get("display_name", "").split(",")[0] if item.get("display_name") else "Unknown")
        if not name or name.lower() in seen:
            continue

        if not is_likely_pharmacy(name):
            continue

        seen.add(name.lower())

        try:
            plat = float(item["lat"])
            plng = float(item["lon"])
        except (KeyError, ValueError, TypeError):
            continue

        dist = haversine_km(user_lat, user_lng, plat, plng)

        # Nominatim display_name is usually a full address
        full_address = item.get("display_name", "")

        results.append({
            "id": str(item.get("osm_id", "")),
            "title": name,
            "latitude": plat,
            "longitude": plng,
            "rating": None,
            "address": full_address,
            "open_now": None,  # Nominatim doesn't provide opening hours usually
            "place_id": str(item.get("place_id", "")),
            "distanceKm": round(dist, 3),
        })
    results.sort(key=lambda x: x["distanceKm"])
    return results

import asyncio
import time

# ── Simple in-memory cache (geohash ~500m grid) ──────────────────────────────
_pharmacy_cache: dict = {}
CACHE_TTL_SECONDS = 60 * 60  # 1 hour

def _cache_key(lat: float, lng: float) -> str:
    """Round to ~500m grid for cache bucketing."""
    return f"{round(lat, 2)},{round(lng, 2)}"

def _cache_get(lat, lng):
    key = _cache_key(lat, lng)
    entry = _pharmacy_cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL_SECONDS:
        print(f"[CACHE] HIT for {key}")
        return entry["data"]
    return None

def _cache_set(lat, lng, data):
    key = _cache_key(lat, lng)
    _pharmacy_cache[key] = {"ts": time.time(), "data": data}

# ── Overpass: parallel fetch with per-mirror timeout ─────────────────────────
async def fetch_overpass(lat: float, lng: float, radius: int = 3000):
    overpass_query = f"""
[out:json][timeout:20];
(
  node["amenity"="pharmacy"](around:{radius},{lat},{lng});
  way["amenity"="pharmacy"](around:{radius},{lat},{lng});
);
out center tags;
"""
    mirrors = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
        "https://overpass.openstreetmap.ru/api/interpreter",
    ]

    async def try_mirror(mirror: str):
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(connect=6, read=22, write=6, pool=6)) as client:
                resp = await client.post(
                    mirror,
                    data={"data": overpass_query},
                    headers={"User-Agent": "PrescriptionApp/1.0"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("elements"):
                        print(f"[OVERPASS] ✓ {mirror} → {len(data['elements'])} elements")
                        return data
                print(f"[OVERPASS] {mirror} → HTTP {resp.status_code}, empty or no elements")
        except Exception as e:
            print(f"[OVERPASS] {mirror} failed: {type(e).__name__}: {e}")
        return None

    # Race all mirrors — return first non-None result
    tasks = [asyncio.create_task(try_mirror(m)) for m in mirrors]
    try:
        for done in asyncio.as_completed(tasks):
            result = await done
            if result:
                # Cancel remaining tasks
                for t in tasks:
                    t.cancel()
                return result
    except asyncio.CancelledError:
        pass
    return None


# ── Nominatim: primary fallback ───────────────────────────────────────────────
async def fetch_nominatim(lat: float, lng: float):
    delta = 0.018  # ~2 km
    url = (
        f"https://nominatim.openstreetmap.org/search"
        f"?amenity=pharmacy"
        f"&viewbox={lng-delta},{lat+delta},{lng+delta},{lat-delta}"
        f"&bounded=1&format=json&limit=30&addressdetails=1&namedetails=1"
    )
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(url, headers={"User-Agent": "PrescriptionApp/1.0"})
            if resp.status_code == 200:
                items = resp.json()
                items = [
                    i for i in items
                    if i.get("category") == "amenity" and i.get("type") == "pharmacy"
                ]
                items.sort(key=lambda x: haversine_km(lat, lng, float(x["lat"]), float(x["lon"])))
                print(f"[NOMINATIM] ✓ {len(items)} pharmacies")
                return items
            print(f"[NOMINATIM] HTTP {resp.status_code}")
    except Exception as e:
        print(f"[NOMINATIM] Failed: {type(e).__name__}: {e}")
    return []


# ── Photon: secondary fallback (runs on OSM data, very reliable) ──────────────
async def fetch_photon(lat: float, lng: float):
    """
    Photon by Komoot — OSM-based geocoder, very reliable, no rate limits for small usage.
    https://photon.komoot.io
    """
    url = (
        f"https://photon.komoot.io/api/"
        f"?q=pharmacy&lat={lat}&lon={lng}&limit=20&lang=en"
    )
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(url, headers={"User-Agent": "PrescriptionApp/1.0"})
            if resp.status_code == 200:
                features = resp.json().get("features", [])
                # Filter: only amenity=pharmacy
                features = [
                    f for f in features
                    if f.get("properties", {}).get("osm_value") == "pharmacy"
                ]
                # Sort by distance
                features.sort(key=lambda f: haversine_km(
                    lat, lng,
                    f["geometry"]["coordinates"][1],
                    f["geometry"]["coordinates"][0],
                ))
                print(f"[PHOTON] ✓ {len(features)} pharmacies")
                return features
            print(f"[PHOTON] HTTP {resp.status_code}")
    except Exception as e:
        print(f"[PHOTON] Failed: {type(e).__name__}: {e}")
    return []


def parse_photon_results(features: list, user_lat: float, user_lng: float) -> list:
    results = []
    seen = set()
    for f in features:
        props = f.get("properties", {})
        name = props.get("name")
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())

        coords = f.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            continue
        plng, plat = float(coords[0]), float(coords[1])
        if not (-90 <= plat <= 90 and -180 <= plng <= 180):
            continue

        addr_parts = list(filter(None, [
            props.get("housenumber"),
            props.get("street"),
            props.get("suburb") or props.get("district") or props.get("city"),
        ]))
        dist = haversine_km(user_lat, user_lng, plat, plng)

        results.append({
            "id": str(props.get("osm_id", "")),
            "title": name,
            "latitude": plat,
            "longitude": plng,
            "rating": None,
            "address": ", ".join(addr_parts),
            "open_now": None,
            "place_id": None,
            "distanceKm": round(dist, 3),
        })

    results.sort(key=lambda x: x["distanceKm"])
    return results


# ── Main endpoint ─────────────────────────────────────────────────────────────
@app.get("/api/pharmacies/nearby")
async def get_nearby_pharmacies(lat: float, lng: float, limit: int = 20):
    # 1. Check cache first
    cached = _cache_get(lat, lng)
    if cached:
        return {"status": "success", "pharmacies": cached[:limit], "source": "cache"}

    # 2. Try Overpass (all mirrors in parallel)
    overpass_data = await fetch_overpass(lat, lng, radius=3000)
    if overpass_data and overpass_data.get("elements"):
        results = parse_overpass_results(overpass_data["elements"], lat, lng)
        if results:
            _cache_set(lat, lng, results)
            return {"status": "success", "pharmacies": results[:limit], "source": "overpass"}

    # 3. Nominatim fallback
    print("[FALLBACK] Trying Nominatim...")
    nominatim_items = await fetch_nominatim(lat, lng)
    if nominatim_items:
        results = parse_nominatim_results(nominatim_items, lat, lng)
        if results:
            _cache_set(lat, lng, results)
            return {"status": "success", "pharmacies": results[:limit], "source": "nominatim"}

    # 4. Photon fallback (most reliable, OSM-backed)
    print("[FALLBACK] Trying Photon...")
    photon_features = await fetch_photon(lat, lng)
    if photon_features:
        results = parse_photon_results(photon_features, lat, lng)
        if results:
            _cache_set(lat, lng, results)
            return {"status": "success", "pharmacies": results[:limit], "source": "photon"}

    return {"status": "error", "pharmacies": [], "message": "All pharmacy data sources failed."}

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
    member_id: Optional[str] = None

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
                image_hash=req.image_hash,
                member_id=req.member_id
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
            # Access nested AI result
            exp = r.get("explanation", {})
            new_med = models.Medication(
                user_id=req.user_id,
                prescription_id=new_record.id,
                name=r.get("medicine", "Unknown"),
                dose=r.get("dosage", "Standard dose"),
                color=c["color"],
                color_bg=c["bg"],
                explanation_json=json.dumps(r), # Cache explanation during scan
                member_id=req.member_id
            )
            db.add(new_med)
            db.commit()
            db.refresh(new_med)
            
            # Use the intelligent schedule from AI
            schedule = exp.get("schedule", [
                {"time": "8:00 AM", "label": "Morning", "icon": "weather-sunny"},
                {"time": "8:00 PM", "label": "Evening", "icon": "weather-sunset"}
            ])
            
            times_to_add = []
            for s in schedule:
                times_to_add.append(
                    models.MedicationTime(
                        medication_id=new_med.id, 
                        label=s.get("label", "Dose"), 
                        time=s.get("time", "12:00 PM"), 
                        taken=False, 
                        icon=s.get("icon", "pill")
                    )
                )
            if times_to_add:
                db.add_all(times_to_add)
                db.commit()

    return {
        "status": "success", 
        "prescription_id": new_record.id if new_record is not None else None,
        "results": results,
        "country": req.country,
        "currency": req.currency,
        "avg_confidence": req.avg_confidence
    }

@app.get("/health")
def health():
    return {"status": "ok"}
