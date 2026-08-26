import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

# Import database and models
from database import get_db
from models import auth_models
from models.bookings import Booking

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", "super_secret_jwt_key_liftbrand_2026")
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ==================== AUTH DEPENDENCIES ====================

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[auth_models.User]:
    # 1. If no Bearer token is provided in the request, safely return None for guest requests
    if not token:
        return None

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(auth_models.User).filter(auth_models.User.email == email).first()
    if user is None:
        raise credentials_exception

    return user


def get_current_admin(
    current_user: auth_models.User = Depends(get_current_user)
) -> auth_models.User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


# ==================== PYDANTIC SCHEMAS ====================

class UserAdminUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    role: Optional[str] = None


class UserAdminCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    address: str
    password: str
    role: str = "user"


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    address: str
    role: str

    class Config:
        from_attributes = True


class BookingAdminResponse(BaseModel):
    id: int
    user_id: int
    service_title: str
    service_icon: Optional[str] = "pipe"
    start_time: str
    status: str
    notes: Optional[str] = ""
    created_at: str

    class Config:
        from_attributes = True


# ==================== ROUTER SETUP ====================

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])


# 1. READ ALL USERS
@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    admin: auth_models.User = Depends(get_current_admin)
):
    return db.query(auth_models.User).all()


# 2. READ SINGLE USER
@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    admin: auth_models.User = Depends(get_current_admin)
):
    user = db.query(auth_models.User).filter(auth_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# 3. CREATE USER (ADMIN DIRECT)
@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    user_data: UserAdminCreate,
    db: Session = Depends(get_db),
    admin: auth_models.User = Depends(get_current_admin)
):
    clean_email = user_data.email.lower().strip()
    if db.query(auth_models.User).filter(auth_models.User.email == clean_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = auth_models.User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=clean_email,
        phone=user_data.phone,
        address=user_data.address,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# 4. UPDATE USER
@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_by_admin(
    user_id: int,
    user_data: UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: auth_models.User = Depends(get_current_admin)
):
    user = db.query(auth_models.User).filter(auth_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "email" and value:
            value = value.lower().strip()
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


# 5. DELETE USER
@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user_by_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: auth_models.User = Depends(get_current_admin)
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Admin cannot delete their own account")

    user = db.query(auth_models.User).filter(auth_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": f"User with ID {user_id} deleted successfully"}


# 6. READ ALL SYSTEM BOOKINGS
@router.get("/bookings", response_model=List[BookingAdminResponse])
def get_all_bookings(
    db: Session = Depends(get_db),
    admin: auth_models.User = Depends(get_current_admin)
):
    """Fetch all bookings created across all users."""
    bookings = db.query(Booking).order_by(Booking.start_time.desc()).all()
    return [
        {
            "id": b.id,
            "user_id": b.user_id,
            "service_title": b.service_title,
            "service_icon": b.service_icon or "pipe",
            "start_time": b.start_time.isoformat() if hasattr(b.start_time, "isoformat") else str(b.start_time),
            "status": b.status or "CONFIRMED",
            "notes": b.notes or "",
            "created_at": b.created_at.isoformat() if hasattr(b.created_at, "isoformat") else str(b.created_at),
        }
        for b in bookings
    ]


# 7. READ BOOKINGS FOR A SPECIFIC USER
@router.get("/users/{user_id}/bookings", response_model=List[BookingAdminResponse])
def get_user_bookings_by_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: auth_models.User = Depends(get_current_admin)
):
    """Fetch all bookings for a single target user."""
    user = db.query(auth_models.User).filter(auth_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_bookings = db.query(Booking).filter(Booking.user_id == user_id).order_by(Booking.start_time.desc()).all()
    return [
        {
            "id": b.id,
            "user_id": b.user_id,
            "service_title": b.service_title,
            "service_icon": b.service_icon or "pipe",
            "start_time": b.start_time.isoformat() if hasattr(b.start_time, "isoformat") else str(b.start_time),
            "status": b.status or "CONFIRMED",
            "notes": b.notes or "",
            "created_at": b.created_at.isoformat() if hasattr(b.created_at, "isoformat") else str(b.created_at),
        }
        for b in user_bookings
    ]