from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from typing import List, Optional
from datetime import date as date_type
from pydantic import BaseModel
from ..utils import check_and_reset_daily, update_streak_on_dose

router = APIRouter(prefix="/api/medications", tags=["Medications"])

@router.get("", response_model=List[schemas.MedicationResponse])
async def get_medications(
    user_id: str,
    member_id: Optional[str] = None,
    date: Optional[str] = None,       # ← NEW: "YYYY-MM-DD"
    db: Session = Depends(get_db)
):
    check_and_reset_daily(user_id, db)
    target_date = date or date_type.today().isoformat()

    query = db.query(models.Medication).filter(models.Medication.user_id == user_id)
    if member_id:
        query = query.filter(models.Medication.member_id == member_id)
    else:
        query = query.filter(models.Medication.member_id == None)

    meds = query.all()

    # Overlay taken status from DoseLog for the target date
    for med in meds:
        for t in med.times:
            log = db.query(models.DoseLog).filter(
                models.DoseLog.medication_time_id == t.id,
                models.DoseLog.date == target_date,
            ).first()
            t.taken = log.taken if log else False   # Override in-memory only

    return meds

@router.post("", response_model=schemas.MedicationResponse)
async def create_medication(req: schemas.MedicationCreate, db: Session = Depends(get_db)):
    # Simple color assignment for manual entry
    colors = [
        {"color": "#3B82F6", "bg": "#DBEAFE"},
        {"color": "#D97706", "bg": "#FEF3C7"},
        {"color": "#8B5CF6", "bg": "#EDE9FE"},
        {"color": "#10B981", "bg": "#D1FAE5"}
    ]
    import random
    c = random.choice(colors)

    new_med = models.Medication(
        user_id=req.user_id,
        member_id=req.member_id,
        name=req.name,
        dose=req.dose,
        frequency=req.frequency,
        form=req.form,
        duration=req.duration,
        color=c["color"],
        color_bg=c["bg"]
    )
    db.add(new_med)
    db.commit()
    db.refresh(new_med)

    # Add default or requested times
    if req.times:
        for t in req.times:
            db_time = models.MedicationTime(
                medication_id=new_med.id,
                label=t.label,
                time=t.time,
                icon=t.icon or "weather-sunny"
            )
            db.add(db_time)
    else:
        # Ask LLM for the schedule
        from ..llm import call_llm
        import json, re
        prompt = f"""
        A patient just manually added a medicine. 
        Medicine name: {req.name}
        Dose/Instructions provided: {req.dose}

        Determine the most clinically appropriate precise schedule (exact best times) and clear labels. 
        Do not just output 8 AM/8 PM unless genuinely optimal.
        
        Return ONLY valid JSON in this format:
        [
          {{"time": "HH:MM AM/PM", "label": "Clinical instruction (e.g., With Dinner)", "icon": "weather-sunny"}}
        ]
        """
        try:
            raw = call_llm(prompt)
            match = re.search(r'\[.*\]', raw, re.DOTALL)
            schedule = json.loads(match.group()) if match else None
            
            if schedule and isinstance(schedule, list):
                for s in schedule:
                    db_time = models.MedicationTime(
                        medication_id=new_med.id,
                        label=s.get("label", "Dose"),
                        time=s.get("time", "12:00 PM"),
                        icon=s.get("icon", "pill")
                    )
                    db.add(db_time)
            else:
                raise Exception("Fallback to generic schedule needed")
        except Exception as e:
            print("Failed to generate schedule from LLM:", e)
            t1 = models.MedicationTime(medication_id=new_med.id, label="Morning Dose", time="08:00 AM", taken=False, icon="weather-sunny")
            t2 = models.MedicationTime(medication_id=new_med.id, label="Evening Dose", time="08:00 PM", taken=False, icon="weather-sunset")
            db.add_all([t1, t2])
    
    db.commit()
    db.refresh(new_med)
    return new_med

@router.delete("/{medication_id}")
async def delete_medication(medication_id: str, db: Session = Depends(get_db)):
    med = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med)
    db.commit()
    return {"status": "success"}

# ─── Refill Tracking ─────────────────────────────────────────────────────────

class RefillUpdateRequest(BaseModel):
    remaining_quantity: Optional[float] = None
    is_refill_reminder_on: Optional[bool] = None
    refill_threshold: Optional[float] = None
    total_quantity: Optional[float] = None

@router.put("/{medication_id}/refill")
async def update_refill(medication_id: str, req: RefillUpdateRequest, db: Session = Depends(get_db)):
    med = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    if req.remaining_quantity is not None:
        med.remaining_quantity = req.remaining_quantity
    if req.is_refill_reminder_on is not None:
        med.is_refill_reminder_on = req.is_refill_reminder_on
    if req.refill_threshold is not None:
        med.refill_threshold = req.refill_threshold
    if req.total_quantity is not None:
        med.total_quantity = req.total_quantity
    
    db.commit()
    return {"status": "success"}

@router.get("/needs-refill")
async def get_needs_refill(user_id: str, member_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Returns medications where remaining_quantity <= refill_threshold"""
    query = db.query(models.Medication).filter(
        models.Medication.user_id == user_id,
        models.Medication.is_refill_reminder_on == True,
    )
    if member_id:
        query = query.filter(models.Medication.member_id == member_id)
    else:
        query = query.filter(models.Medication.member_id == None)
    
    meds = query.all()
    needs_refill = [m for m in meds if (m.remaining_quantity or 30) <= (m.refill_threshold or 5)]
    return {"count": len(needs_refill), "medications": [{"id": m.id, "name": m.name, "remaining": m.remaining_quantity} for m in needs_refill]}

# ─── Medicine Explainer ───────────────────────────────────────────────────────

@router.get("/{medication_id}/explain")
async def explain_medication(medication_id: str, country: str = "India", currency: str = "INR", db: Session = Depends(get_db)):
    """Use AI to explain a specific medication in the user's language/country context"""
    med = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Return cached if exists
    if med.explanation_json:
        try:
            import json
            return json.loads(med.explanation_json)
        except:
            pass

    try:
        from ..explain import explain_medicine
        result = explain_medicine(
            {"name": med.name, "dosage": med.dose},
            country=country,
            currency=currency
        )
        # Save to cache
        import json
        med.explanation_json = json.dumps(result)
        db.commit()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search-explain")
async def search_explain_medication(name: str, country: str = "India", currency: str = "INR"):
    """Search for any medicine and get AI explanation without a DB record"""
    try:
        from ..explain import explain_medicine
        result = explain_medicine(
            {"name": name, "dosage": "General information"},
            country=country,
            currency=currency
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Times toggle ─────────────────────────────────────────────────────────────

@router.put("/{medication_id}/times/{time_id}/toggle")
async def toggle_time(
    medication_id: str,
    time_id: str,
    date: Optional[str] = None,   # ← accept date param e.g. "2025-04-26"
    db: Session = Depends(get_db)
):
    target_date = date or date_type.today().isoformat()

    # Find or create a DoseLog entry for this specific day
    log = db.query(models.DoseLog).filter(
        models.DoseLog.medication_time_id == time_id,
        models.DoseLog.date == target_date,
    ).first()

    if not log:
        time_entry = db.query(models.MedicationTime).filter(
            models.MedicationTime.id == time_id
        ).first()
        if not time_entry:
            raise HTTPException(status_code=404, detail="Time entry not found")

        med = db.query(models.Medication).filter(
            models.Medication.id == medication_id
        ).first()

        log = models.DoseLog(
            medication_time_id=time_id,
            user_id=med.user_id,
            date=target_date,
            taken=True,
        )
        db.add(log)
    else:
        log.taken = not log.taken

    # Decrement quantity and update streak only when marking as taken
    if log.taken:
        med = db.query(models.Medication).filter(
            models.Medication.id == medication_id
        ).first()
        if med and med.remaining_quantity and med.remaining_quantity > 0:
            med.remaining_quantity = max(0, med.remaining_quantity - 1)
        update_streak_on_dose(med.user_id, db)

    db.commit()
    return {"status": "success", "taken": log.taken}

class TimeUpdateRequest(BaseModel):
    time: str

@router.put("/{medication_id}/times/{time_id}")
async def update_time(medication_id: str, time_id: str, req: TimeUpdateRequest, db: Session = Depends(get_db)):
    time_entry = db.query(models.MedicationTime).filter(models.MedicationTime.id == time_id).first()
    if not time_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    time_entry.time = req.time
    db.commit()
    return {"status": "success"}
