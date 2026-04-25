from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    push_token = Column(String, nullable=True)
    streak = Column(Integer, default=0)
    last_activity_date = Column(DateTime, default=datetime.now)
    last_streak_date = Column(DateTime, nullable=True)
    prescriptions = relationship("Prescription", back_populates="owner", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="owner", cascade="all, delete-orphan")
    family_members = relationship("FamilyMember", back_populates="owner", cascade="all, delete-orphan")
    symptom_lookups = relationship("SymptomLookup", back_populates="owner", cascade="all, delete-orphan")

class PendingUser(Base):
    __tablename__ = "pending_users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    full_name = Column(String)
    email = Column(String, index=True)
    phone = Column(String, nullable=True)
    hashed_password = Column(String)
    otp_code = Column(String)
    otp_expires_at = Column(DateTime)

class FamilyMember(Base):
    __tablename__ = "family_members"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    relation = Column(String)
    age = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="family_members")
    prescriptions = relationship("Prescription", back_populates="member")
    medications = relationship("Medication", back_populates="member")

class Prescription(Base):
    __tablename__ = "prescriptions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    date = Column(DateTime, default=datetime.utcnow)
    raw_text = Column(Text)
    avg_confidence = Column(Float)
    results_json = Column(Text) # JSON string
    country = Column(String)
    currency = Column(String)
    image_url = Column(String)
    image_hash = Column(String, index=True)
    member_id = Column(String, ForeignKey("family_members.id"), nullable=True)

    owner = relationship("User", back_populates="prescriptions")
    member = relationship("FamilyMember", back_populates="prescriptions")

class Medication(Base):
    __tablename__ = "medications"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    prescription_id = Column(String, ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=True)
    name = Column(String)
    dose = Column(String)
    color = Column(String)
    color_bg = Column(String)
    frequency = Column(String, nullable=True)
    form = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    
    # Refill Tracking
    total_quantity = Column(Float, default=30.0) 
    remaining_quantity = Column(Float, default=30.0)
    refill_threshold = Column(Float, default=5.0) # Notify when <= 5 left
    is_refill_reminder_on = Column(Boolean, default=True)
    bottle_count        = Column(Integer, nullable=True)   # NEW: number of bottles/packs
    pills_per_bottle    = Column(Integer, nullable=True)   # NEW: pills per bottle
    notify_email        = Column(Boolean, default=True)    # NEW
    notify_push         = Column(Boolean, default=True)
    last_refill_alert_at = Column(DateTime, nullable=True)
    explanation_json = Column(Text, nullable=True) # AI generated details cached
    owner = relationship("User", back_populates="medications")
    member = relationship("FamilyMember", back_populates="medications")
    member_id = Column(String, ForeignKey("family_members.id"), nullable=True)
    times = relationship("MedicationTime", back_populates="medication", cascade="all, delete-orphan")

class MedicationTime(Base):
    __tablename__ = "medication_times"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    medication_id = Column(String, ForeignKey("medications.id"))
    label = Column(String)
    time = Column(String)
    taken = Column(Boolean, default=False)
    icon = Column(String)

    medication = relationship("Medication", back_populates="times")

class SymptomLookup(Base):
    __tablename__ = "symptom_lookups"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    query = Column(String)
    result_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="symptom_lookups")
class DoseLog(Base):
    __tablename__ = "dose_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    medication_time_id = Column(String, ForeignKey("medication_times.id", ondelete="CASCADE"))
    user_id = Column(String, ForeignKey("users.id"))
    date = Column(String, index=True)   # Store as "YYYY-MM-DD"
    taken = Column(Boolean, default=False)

    medication_time = relationship("MedicationTime")
