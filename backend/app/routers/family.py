"""
family.py — Enhanced Family Profiles Router
Optimized queries, full CRUD, health scoring, and typed responses.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from .. import models

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/family", tags=["Family"])

# ─────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────

VALID_BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
VALID_RELATIONS = {"Spouse", "Child", "Parent", "Sibling", "Grandparent", "Other"}

class FamilyMemberCreate(BaseModel):
    user_id: str
    name: str = Field(..., min_length=1, max_length=80)
    relation: str
    age: Optional[str] = None
    blood_group: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be blank")
        return v.strip().title()

    @field_validator("relation")
    @classmethod
    def validate_relation(cls, v: str) -> str:
        if not v:
            raise ValueError("Relation is required")
        v_titled = v.strip().title()
        if v_titled not in VALID_RELATIONS:
            raise ValueError(f"Relation must be one of {sorted(VALID_RELATIONS)}")
        return v_titled

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if v and v not in VALID_BLOOD_GROUPS:
                raise ValueError(f"blood_group must be one of {sorted(VALID_BLOOD_GROUPS)}")
        return v or None

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_stripped = v.strip()
        if not v_stripped:
            return None
        try:
            age_int = int(v_stripped)
            if not (0 <= age_int <= 130):
                raise ValueError("Age must be between 0 and 130")
            return str(age_int)
        except ValueError:
            raise ValueError("Age must be a valid integer")


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    relation: Optional[str] = None
    age: Optional[str] = None
    blood_group: Optional[str] = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().title() if v else v

    @field_validator("relation")
    @classmethod
    def validate_relation(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_titled = v.strip().title()
        if v_titled and v_titled not in VALID_RELATIONS:
            raise ValueError(f"Relation must be one of {sorted(VALID_RELATIONS)}")
        return v_titled

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if v and v not in VALID_BLOOD_GROUPS:
                raise ValueError(f"blood_group must be one of {sorted(VALID_BLOOD_GROUPS)}")
        return v or None


class MedSummary(BaseModel):
    id: str
    name: str
    dose: Optional[str] = None
    remaining: float = 0.0
    total: float = 30.0
    refill_threshold: float = 5.0
    needs_refill: bool = False
    days_left_estimate: Optional[int] = None


class FamilyMemberResponse(BaseModel):
    id: str
    name: str
    relation: str
    age: Optional[str]
    blood_group: Optional[str]
    created_at: datetime
    meds_count: int
    prescriptions_count: int
    urgent_meds_count: int
    health_score: int           # 0-100 composite health adherence score
    health_label: str           # "Excellent" / "Good" / "Needs Attention" / "Critical"
    meds: List[MedSummary]


class FamilyStatsResponse(BaseModel):
    total_members: int
    total_meds: int
    total_prescriptions: int
    meds_needing_refill: int
    overall_health_score: int   # family-wide average


class CreateResponse(BaseModel):
    status: str
    id: str
    member: FamilyMemberResponse


# ─────────────────────────────────────────────
# Helper: build enriched member dict
# ─────────────────────────────────────────────

def _days_left(med: models.Medication) -> Optional[int]:
    """Rough days-left estimate: remaining / doses_per_day."""
    doses_per_day = len(med.times) if med.times else 1
    if doses_per_day == 0:
        return None
    try:
        return int(med.remaining_quantity / doses_per_day)
    except Exception:
        return None


def _compute_health_score(meds: List[models.Medication]) -> tuple[int, str]:
    if not meds:
        return 100, "Excellent"

    # 1. Refill-based baseline (30% weight)
    refill_score = 100
    total_times = 0
    taken_times = 0
    
    for m in meds:
        # Refill deduction
        rem = m.remaining_quantity if m.remaining_quantity is not None else 30.0
        thr = m.refill_threshold if m.refill_threshold is not None else 5.0
        if rem <= 0:
            refill_score -= 20
        elif rem <= thr:
            refill_score -= 10
        
        # Collect time stats
        for t in m.times:
            total_times += 1
            if t.taken:
                taken_times += 1

    refill_score = max(0, refill_score)
    
    # 2. Adherence-based component (70% weight)
    adherence_pct = (taken_times / total_times * 100) if total_times > 0 else 100
    
    # Composite score
    score = int(adherence_pct)
    score = max(0, min(100, score))

    if score >= 85:
        label = "Excellent"
    elif score >= 65:
        label = "Good"
    elif score >= 40:
        label = "Needs Attention"
    else:
        label = "Critical"

    return score, label


def _serialize_member(
    m: models.FamilyMember,
    meds: List[models.Medication],
    presc_count: int,
) -> FamilyMemberResponse:
    urgent = [med for med in meds if med.remaining_quantity <= med.refill_threshold]
    score, label = _compute_health_score(meds)

    med_summaries = []
    for med in meds:
        rem = med.remaining_quantity if med.remaining_quantity is not None else 0.0
        total = med.total_quantity if med.total_quantity is not None else 30.0
        thr = med.refill_threshold if med.refill_threshold is not None else 5.0
        
        med_summaries.append(
            MedSummary(
                id=med.id,
                name=med.name or "Unknown Medicine",
                dose=med.dose,
                remaining=rem,
                total=total,
                refill_threshold=thr,
                needs_refill=(rem <= thr),
                days_left_estimate=_days_left(med),
            )
        )

    return FamilyMemberResponse(
        id=m.id,
        name=m.name,
        relation=m.relation,
        age=m.age,
        blood_group=m.blood_group,
        created_at=m.created_at,
        meds_count=len(meds),
        prescriptions_count=presc_count,
        urgent_meds_count=len(urgent),
        health_score=score,
        health_label=label,
        meds=med_summaries,
    )


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@router.get(
    "/{user_id}",
    response_model=List[FamilyMemberResponse],
    summary="List all family members with enriched stats",
)
async def get_family(
    user_id: str,
    search: Optional[str] = Query(None, description="Filter by name (case-insensitive)"),
    db: Session = Depends(get_db),
):
    """
    Returns all family members for a user, each enriched with:
    - medication counts and summaries (with days-left estimates)
    - prescription counts
    - urgent refill counts
    - a 0-100 health adherence score

    Uses a single DB round-trip per aggregate via joined loading — no N+1.
    """
    _assert_user_exists(user_id, db)

    query = (
        db.query(models.FamilyMember)
        .filter(models.FamilyMember.user_id == user_id)
        .options(
            joinedload(models.FamilyMember.medications).joinedload(models.Medication.times),
            joinedload(models.FamilyMember.prescriptions),
        )
        .order_by(models.FamilyMember.created_at)
    )

    if search:
        query = query.filter(
            models.FamilyMember.name.ilike(f"%{search.strip()}%")
        )

    members = query.all()

    results = [
        _serialize_member(m, m.medications, len(m.prescriptions))
        for m in members
    ]
    return results


@router.get(
    "/{user_id}/stats",
    response_model=FamilyStatsResponse,
    summary="Aggregate health stats across the entire family",
)
async def get_family_stats(user_id: str, db: Session = Depends(get_db)):
    """Single-query family-wide stats — no Python-side loops."""
    _assert_user_exists(user_id, db)

    member_ids_subq = (
        db.query(models.FamilyMember.id)
        .filter(models.FamilyMember.user_id == user_id)
        .subquery()
    )

    total_members = (
        db.query(func.count(models.FamilyMember.id))
        .filter(models.FamilyMember.user_id == user_id)
        .scalar() or 0
    )

    total_meds = (
        db.query(func.count(models.Medication.id))
        .filter(models.Medication.member_id.in_(member_ids_subq))
        .scalar() or 0
    )

    total_prescriptions = (
        db.query(func.count(models.Prescription.id))
        .filter(models.Prescription.member_id.in_(member_ids_subq))
        .scalar() or 0
    )

    refill_count = (
        db.query(func.count(models.Medication.id))
        .filter(
            models.Medication.member_id.in_(member_ids_subq),
            models.Medication.remaining_quantity <= models.Medication.refill_threshold,
        )
        .scalar() or 0
    )

    # Health score: 100 - (15 * refill_pct)
    overall_score = 100
    if total_meds > 0:
        deduction = int((refill_count / total_meds) * 60)
        overall_score = max(0, 100 - deduction)

    return FamilyStatsResponse(
        total_members=total_members,
        total_meds=total_meds,
        total_prescriptions=total_prescriptions,
        meds_needing_refill=refill_count,
        overall_health_score=overall_score,
    )


@router.get(
    "/member/{member_id}",
    response_model=FamilyMemberResponse,
    summary="Get a single family member's full detail",
)
async def get_member(member_id: str, db: Session = Depends(get_db)):
    m = _fetch_member_or_404(member_id, db, load_relations=True)
    return _serialize_member(m, m.medications, len(m.prescriptions))


@router.post(
    "/",
    response_model=CreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new family member",
)
async def add_family_member(req: FamilyMemberCreate, db: Session = Depends(get_db)):
    _assert_user_exists(req.user_id, db)

    # Prevent duplicates (same name + relation under same user)
    existing = (
        db.query(models.FamilyMember)
        .filter(
            models.FamilyMember.user_id == req.user_id,
            func.lower(models.FamilyMember.name) == req.name.lower(),
            models.FamilyMember.relation == req.relation,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A {req.relation} named '{req.name}' already exists in this family.",
        )

    new_member = models.FamilyMember(
        user_id=req.user_id,
        name=req.name,
        relation=req.relation,
        age=req.age,
        blood_group=req.blood_group,
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    # Re-fetch with relations for response
    new_member = _fetch_member_or_404(new_member.id, db, load_relations=True)
    serialized = _serialize_member(new_member, new_member.medications, len(new_member.prescriptions))

    logger.info("Family member created: %s (user=%s)", new_member.id, req.user_id)
    return CreateResponse(status="success", id=new_member.id, member=serialized)


@router.patch(
    "/{member_id}",
    response_model=FamilyMemberResponse,
    summary="Partially update a family member's profile",
)
async def update_family_member(
    member_id: str,
    req: FamilyMemberUpdate,
    db: Session = Depends(get_db),
):
    """PATCH — only the supplied fields are updated."""
    m = _fetch_member_or_404(member_id, db)

    update_data = req.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields provided for update.",
        )

    # Map snake_case body → model attribute names
    field_map = {"blood_group": "blood_group"}
    for field, value in update_data.items():
        attr = field_map.get(field, field)
        setattr(m, attr, value)

    db.commit()
    db.refresh(m)

    m = _fetch_member_or_404(member_id, db, load_relations=True)
    return _serialize_member(m, m.medications, len(m.prescriptions))


@router.delete(
    "/{member_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a family member and handle their records",
)
async def delete_family_member(
    member_id: str,
    unlink_records: bool = Query(
        True,
        description=(
            "If true (default), prescriptions & medications are unlinked "
            "(member_id set to NULL) so the user's history is preserved. "
            "If false, all linked records are hard-deleted with the member."
        ),
    ),
    db: Session = Depends(get_db),
):
    m = _fetch_member_or_404(member_id, db)

    if unlink_records:
        # Preserve the user's medication/prescription history by unlinking
        db.query(models.Medication).filter(
            models.Medication.member_id == member_id
        ).update({"member_id": None}, synchronize_session=False)

        db.query(models.Prescription).filter(
            models.Prescription.member_id == member_id
        ).update({"member_id": None}, synchronize_session=False)
    else:
        # Hard-delete linked records first (no ORM cascade on FamilyMember→Medication)
        db.query(models.Medication).filter(
            models.Medication.member_id == member_id
        ).delete(synchronize_session=False)

        db.query(models.Prescription).filter(
            models.Prescription.member_id == member_id
        ).delete(synchronize_session=False)

    db.delete(m)
    db.commit()

    logger.info("Family member deleted: %s (unlink=%s)", member_id, unlink_records)
    return {"status": "success", "unlinked_records": unlink_records}


# ─────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────

def _assert_user_exists(user_id: str, db: Session) -> None:
    if not db.query(models.User).filter(models.User.id == user_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )


def _fetch_member_or_404(
    member_id: str,
    db: Session,
    load_relations: bool = False,
) -> models.FamilyMember:
    q = db.query(models.FamilyMember).filter(models.FamilyMember.id == member_id)
    if load_relations:
        q = q.options(
            joinedload(models.FamilyMember.medications).joinedload(models.Medication.times),
            joinedload(models.FamilyMember.prescriptions),
        )
    m = q.first()
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Family member '{member_id}' not found.",
        )
    return m
