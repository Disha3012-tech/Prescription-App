from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    identifier: str # Email or Phone
    password: str

class OTPVerify(BaseModel):
    user_id: str
    otp: str

class OTPResend(BaseModel):
    user_id: str

class UserResponse(UserBase):
    id: str
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class PrescriptionHistoryItem(BaseModel):
    id: str
    date: datetime
    raw_text: str
    avg_confidence: float
    results: List[dict]
    country: str
    currency: str
    image_url: Optional[str] = None
    class Config:
        from_attributes = True

class HistoryResponse(BaseModel):
    status: str
    history: List[PrescriptionHistoryItem]

class MedicationTimeBase(BaseModel):
    label: str
    time: str
    taken: bool = False
    icon: str

class MedicationTimeResponse(MedicationTimeBase):
    id: str
    medication_id: str
    class Config:
        from_attributes = True

class MedicationBase(BaseModel):
    name: str
    dose: str
    frequency: Optional[str] = None
    form: Optional[str] = None
    duration: Optional[str] = None
    color: str
    color_bg: str

class MedicationTimeCreate(BaseModel):
    label: str
    time: str
    icon: Optional[str] = None

class MedicationCreate(BaseModel):
    user_id: str
    member_id: Optional[str] = None
    name: str
    dose: str
    frequency: Optional[str] = None
    form: Optional[str] = None
    duration: Optional[str] = None
    times: Optional[List[MedicationTimeCreate]] = None

class MedicationResponse(MedicationBase):
    id: str
    user_id: str
    prescription_id: Optional[str] = None
    explanation_json: Optional[str] = None
    times: List[MedicationTimeResponse]
    class Config:
        from_attributes = True
