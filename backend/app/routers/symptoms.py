from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import re
from ..database import get_db
from .. import models
from ..llm import call_llm

router = APIRouter(prefix="/api/symptoms", tags=["Symptoms"])

class SymptomRequest(BaseModel):
    query: str
    user_id: str

@router.post("/lookup")
async def lookup_symptom(req: SymptomRequest, db: Session = Depends(get_db)):
    # 1. Check cache
    cached = db.query(models.SymptomLookup).filter(
        models.SymptomLookup.query == req.query.lower().strip()
    ).first()
    
    if cached:
        return json.loads(cached.result_json)

    # 2. Call LLM
    prompt = f"""You are a medical information assistant. The user has the symptom: "{req.query}".
Return ONLY a valid JSON object (no markdown, no preamble):
{{
  "symptom": "{req.query}",
  "overview": "Detailed english explanation",
  "urgency": "Low or Medium or High",
  "urgencyNote": "one line about when to seek care",
  "medicineClasses": [
    {{
      "class": "Name",
      "description": "what it does",
      "examples": ["Ex 1", "Ex 2"],
      "howItHelps": "mechanism"
    }}
  ],
  "doctorTip": "few tips",
  "lifestyle": ["tip 1", "tip 2"],
  "disclaimer": true
}}
Keep it concise and non-alarming."""

    try:
        raw_resp = call_llm(prompt)
        # Extract JSON
        match = re.search(r'\{.*\}', raw_resp, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="LLM failed to return JSON")
        
        result_json = match.group()
        result_data = json.loads(result_json)
        
        # 3. Save to cache
        new_lookup = models.SymptomLookup(
            user_id=req.user_id,
            query=req.query.lower().strip(),
            result_json=result_json
        )
        db.add(new_lookup)
        db.commit()
        
        return result_data
    except Exception as e:
        print(f"[SYMPTOM ERROR]: {e}")
        raise HTTPException(status_code=500, detail=str(e))
