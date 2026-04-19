from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json
from ..database import get_db
from .. import models, schemas
from pydantic import BaseModel
from typing import List, Optional
from fastapi import HTTPException

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])

@router.get("/history", response_model=schemas.HistoryResponse)
async def get_history(user_id: str, member_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Prescription).filter(models.Prescription.user_id == user_id)
    if member_id:
        query = query.filter(models.Prescription.member_id == member_id)
    else:
        query = query.filter(models.Prescription.member_id == None)
    
    rows = query.order_by(models.Prescription.date.desc()).all()
    
    history = []
    for row in rows:
        history.append({
            "id": row.id,
            "date": row.date,
            "raw_text": row.raw_text,
            "avg_confidence": row.avg_confidence,
            "results": json.loads(row.results_json),
            "country": row.country,
            "currency": row.currency,
            "image_url": row.image_url
        })
    return {"status": "success", "history": history}

class ManualPrescriptionRequest(BaseModel):
    user_id: str
    member_id: Optional[str] = None
    condition: str
    doctor: Optional[str] = "Unknown Doctor"
    notes: Optional[str] = ""

@router.post("/manual")
async def create_manual_prescription(req: ManualPrescriptionRequest, db: Session = Depends(get_db)):
    from datetime import datetime
    new_record = models.Prescription(
        user_id=req.user_id,
        date=datetime.utcnow(),
        raw_text=req.notes,
        avg_confidence=1.0, 
        results_json=json.dumps([{
            "medicine": "Checkup",
            "explanation": {
                "brand_name": req.doctor,
                "medicine_class": req.condition,
                "what_it_does": req.notes
            }
        }]),
        doctor=req.doctor,
        member_id=req.member_id,
        country="Manual",
        currency="N/A"
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return {"status": "success", "id": new_record.id}


class EditPrescriptionRequest(BaseModel):
    results: List[dict]

@router.put("/{prescription_id}")
async def update_prescription(prescription_id: str, req: EditPrescriptionRequest, db: Session = Depends(get_db)):
    record = db.query(models.Prescription).filter(models.Prescription.id == prescription_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    
    old_results = json.loads(record.results_json) if record.results_json else []
    
    # 1. Update Prescription history
    record.results_json = json.dumps(req.results)
    
    # 2. Sync Medications (dose tracker)
    # Delete old medications tied to this scan
    db.query(models.Medication).filter(models.Medication.prescription_id == prescription_id).delete()
            
    # Add newly edited medications
    colors = [
        {"color": "#3B82F6", "bg": "#DBEAFE"},
        {"color": "#D97706", "bg": "#FEF3C7"},
        {"color": "#8B5CF6", "bg": "#EDE9FE"},
        {"color": "#10B981", "bg": "#D1FAE5"}
    ]
    for idx, new_med in enumerate(req.results):
        med_name = new_med.get("medicine") or new_med.get("name", "Unknown")
        med_dose = new_med.get("dosage") or new_med.get("dose", "Standard dose")
        c = colors[idx % len(colors)]
        
        nm = models.Medication(
            user_id=record.user_id,
            prescription_id=prescription_id,
            member_id=record.member_id,
            name=med_name,
            dose=med_dose,
            color=c["color"],
            color_bg=c["bg"]
        )
        db.add(nm)
        db.commit()
        db.refresh(nm)
        
        t1 = models.MedicationTime(medication_id=nm.id, label="Morning", time="8:00 AM", taken=False, icon="weather-sunny")
        t2 = models.MedicationTime(medication_id=nm.id, label="Evening", time="8:00 PM", taken=False, icon="weather-sunset")
        db.add_all([t1, t2])

    db.commit()
    return {"status": "success"}

@router.delete("/{prescription_id}")
async def delete_prescription(prescription_id: str, db: Session = Depends(get_db)):
    record = db.query(models.Prescription).filter(models.Prescription.id == prescription_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Also delete associated tracked meds
    db.query(models.Medication).filter(models.Medication.prescription_id == prescription_id).delete()

    db.delete(record)
    db.commit()
    return {"status": "success"}
