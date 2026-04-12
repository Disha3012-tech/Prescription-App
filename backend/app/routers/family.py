from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/family", tags=["Family"])

class FamilyMemberCreate(BaseModel):
    user_id: str
    name: str
    relation: str
    age: Optional[str] = None
    blood_group: Optional[str] = None

@router.get("/{user_id}")
async def get_family(user_id: str, db: Session = Depends(get_db)):
    members = db.query(models.FamilyMember).filter(models.FamilyMember.user_id == user_id).all()
    # For each member, count meds and prescriptions
    results = []
    for m in members:
        med_count = db.query(models.Medication).filter(models.Medication.member_id == m.id).count()
        presc_count = db.query(models.Prescription).filter(models.Prescription.member_id == m.id).count()
        # Find meds needing refill
        urgent_meds = db.query(models.Medication).filter(
            models.Medication.member_id == m.id,
            models.Medication.remaining_quantity <= models.Medication.refill_threshold
        ).all()
        
        results.append({
            "id": m.id,
            "name": m.name,
            "relation": m.relation,
            "age": m.age,
            "bloodGroup": m.blood_group,
            "medsCount": med_count,
            "prescriptionsCount": presc_count,
            "urgentMedsCount": len(urgent_meds),
            "meds": [
                {"name": med.name, "remaining": med.remaining_quantity} 
                for med in db.query(models.Medication).filter(models.Medication.member_id == m.id).limit(3).all()
            ]
        })
    return results

@router.post("/")
async def add_family_member(req: FamilyMemberCreate, db: Session = Depends(get_db)):
    new_member = models.FamilyMember(
        user_id=req.user_id,
        name=req.name,
        relation=req.relation,
        age=req.age,
        blood_group=req.blood_group
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return {"status": "success", "id": new_member.id}

@router.delete("/{member_id}")
async def delete_family_member(member_id: str, db: Session = Depends(get_db)):
    member = db.query(models.FamilyMember).filter(models.FamilyMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Unlink prescriptions and medications instead of deleting them? 
    # Or just let them be orphaned. The CASCADE in User handles User deletion.
    # For simplicity, just delete the member.
    db.delete(member)
    db.commit()
    return {"status": "success"}
