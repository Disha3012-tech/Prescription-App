from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid

from ..database import get_db
from .. import schemas, models
from ..core.security import hash_password, verify_password
from ..core.email import generate_otp, send_otp_email
from ..core.jwt_handler import generate_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/social-login")
async def social_login(
    payload: schemas.SocialLoginRequest,
    db: Session = Depends(get_db),
):
    # Check if user already exists
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    
    if not user:
        # Create new user for social login (no password needed as it's social)
        user = models.User(
            full_name=payload.full_name,
            email=payload.email,
            phone="",
            hashed_password="SOCIAL_LOGIN_PROVIDER_" + payload.provider.upper()
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
            
    token = generate_token(data={"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone
        }
    }

@router.post("/register", status_code=201)
async def register_user(
    user: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Check if user already exists
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Check if there's already a pending registration for this email
    pending = db.query(models.PendingUser).filter(models.PendingUser.email == user.email).first()
    if pending:
        db.delete(pending)
        db.commit()

    otp = generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    new_pending = models.PendingUser(
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        hashed_password=hash_password(user.password),
        otp_code=otp,
        otp_expires_at=expires,
    )
    
    try:
        db.add(new_pending)
        db.commit()
        db.refresh(new_pending)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

    # Send email in background
    background_tasks.add_task(send_otp_email, user.email, otp, user.full_name)

    return {
        "status": "success",
        "message": "Please check your email for a 6-digit verification code.",
        "user_id": new_pending.id,
        "requires_verification": True,
    }

@router.post("/verify-otp")
def verify_otp(payload: schemas.OTPVerify, db: Session = Depends(get_db)):
    pending = db.query(models.PendingUser).filter(models.PendingUser.id == payload.user_id).first()
    if not pending:
        raise HTTPException(status_code=404, detail="Verification session not found")

    # Check OTP
    # Ensure timezone awareness for comparison
    expires_at = pending.otp_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    if pending.otp_code != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Create the actual User record
    new_user = models.User(
        full_name=pending.full_name,
        email=pending.email,
        phone=pending.phone,
        hashed_password=pending.hashed_password,
    )
    
    try:
        db.add(new_user)
        # Delete from pending
        db.delete(pending)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to finalize registration: {str(e)}")

    token = generate_token(data={"sub": new_user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id, 
            "full_name": new_user.full_name, 
            "email": new_user.email, 
            "phone": new_user.phone
        },
    }

@router.post("/login")
def login(request: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.email == request.identifier) |
        (models.User.phone == request.identifier)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with that email or phone number"
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    access_token = generate_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
        }
    }

@router.post("/resend-otp")
async def resend_otp(
    payload: schemas.OTPResend,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    pending = db.query(models.PendingUser).filter(models.PendingUser.id == payload.user_id).first()
    if not pending:
        raise HTTPException(status_code=404, detail="Verification session not found")

    otp = generate_otp()
    pending.otp_code = otp
    pending.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.commit()

    background_tasks.add_task(send_otp_email, pending.email, otp, pending.full_name)
    return {"status": "success", "message": "New verification code sent to your email"}

@router.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: str, updates: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if updates.full_name is not None:
        user.full_name = updates.full_name
    if updates.email is not None:
        user.email = updates.email
    if updates.phone is not None:
        user.phone = updates.phone
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"status": "success", "message": "User deleted successfully"}
