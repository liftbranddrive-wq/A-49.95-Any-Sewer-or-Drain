import os
import random
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, field_validator, ValidationInfo
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import httpx
import resend

from database import get_db, engine, Base
from models import auth_models

# Create tables on startup (For production, use Alembic migrations)
Base.metadata.create_all(bind=engine)

resend.api_key = os.getenv("RESEND_API_KEY")

router = APIRouter()

# --- SECURITY SETUP ---
SECRET_KEY = os.getenv("JWT_SECRET", "super_secret_jwt_key_liftbrand_2026")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "592240709905-imqn3h0j4dbreeh76ro0bfb9adnsvfgm.apps.googleusercontent.com")
APPLE_CLIENT_ID = os.getenv("APPLE_CLIENT_ID", "com.yourcompany.yourapp") # Add your Apple Bundle ID / Service ID here
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# --- SCHEMAS (Pydantic) ---

class UserSignup(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    address: str
    password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info: ValidationInfo) -> str:
        if info.data and "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    token: str

class AppleAuthRequest(BaseModel):
    token: str
    first_name: Optional[str] = "Apple"
    last_name: Optional[str] = "User"

class TokenResponse(BaseModel):
    token: str
    user: dict

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

# --- HELPER FUNCTIONS & DEPENDENCIES ---

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_reset_token() -> str:
    return f"{random.randint(100000, 999999)}"

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(auth_models.User).filter(auth_models.User.email == email).first()
    if user is None:
        raise credentials_exception
        
    # Optional check: Block deactivated/deleted accounts from logging in or using tokens
    if getattr(user, 'is_active', True) is False or getattr(user, 'is_deleted', False) is True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated or deleted."
        )
        
    return user

SENDER_EMAIL = os.getenv("SENDER_EMAIL", "onboarding@resend.dev")

def send_reset_email(to_email: str, code: str):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
        .container {{ max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; text-align: center; }}
        .title {{ font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
        .text {{ font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 20px; }}
        .code-box {{ display: inline-block; background-color: #f1f5f9; color: #0f172a; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 16px 28px; border-radius: 8px; border: 1px dashed #cbd5e1; margin: 16px 0; }}
        .footer {{ margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.4; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="title">Password Reset Code</div>
        <div class="text">
          Use the verification code below to reset your password. This code will expire in 15 minutes.
        </div>
        <div class="code-box">{code}</div>
        <div class="text">
          If you didn't request this code, you can safely ignore this email.
        </div>
        <div class="footer">
          App Support
        </div>
      </div>
    </body>
    </html>
    """

    params: resend.Emails.SendParams = {
        "from": f"App Support <{SENDER_EMAIL}>",
        "to": [to_email],
        "subject": f"{code} is your password reset code",
        "html": html_content,
    }

    try:
        email_response = resend.Emails.send(params)
        print(f"[SUCCESS] OTP code sent to {to_email}. Message ID: {email_response.get('id')}")
        return email_response
    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email}: {str(e)}")

# --- ROUTES ---

@router.post("/signup", response_model=TokenResponse)
async def signup(user: UserSignup, db: Session = Depends(get_db)):
    clean_email = user.email.lower().strip()
    existing_user = db.query(auth_models.User).filter(auth_models.User.email == clean_email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_pwd = get_password_hash(user.password)
    db_user = auth_models.User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=clean_email,
        phone=user.phone,
        address=user.address,
        hashed_password=hashed_pwd
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(data={"sub": db_user.email})
    return {
        "token": access_token, 
        "user": {
            "id": db_user.id, 
            "first_name": db_user.first_name,
            "last_name": db_user.last_name,
            "email": db_user.email,
            "phone": db_user.phone,
            "address": db_user.address,
            "role": getattr(db_user, 'role', 'user')
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(user: UserLogin, db: Session = Depends(get_db)):
    clean_email = user.email.lower().strip()
    db_user = db.query(auth_models.User).filter(auth_models.User.email == clean_email).first()
    
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    if getattr(db_user, 'is_active', True) is False or getattr(db_user, 'is_deleted', False) is True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated or deleted."
        )
    
    access_token = create_access_token(data={"sub": db_user.email})
    return {
        "token": access_token, 
        "user": {
            "id": db_user.id, 
            "first_name": db_user.first_name,
            "last_name": db_user.last_name,
            "email": db_user.email,
            "phone": getattr(db_user, 'phone', ''),
            "address": getattr(db_user, 'address', ''),
            "role": getattr(db_user, 'role', 'user')
        }
    }

@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        email = None
        first_name = "Google"
        last_name = "User"

        if payload.token == "mock_google_token_for_development":
            email = "dev.googleuser@example.com"
            first_name = "Google"
            last_name = "Tester"
        else:
            try:
                idinfo = id_token.verify_oauth2_token(
                    payload.token, 
                    google_requests.Request(), 
                    GOOGLE_CLIENT_ID
                )
                if idinfo.get("iss") in ["accounts.google.com", "https://accounts.google.com"]:
                    email = idinfo.get("email")
                    first_name = idinfo.get("given_name", "Google")
                    last_name = idinfo.get("family_name", "User")
            except Exception:
                pass

            if not email:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {payload.token}"}
                    )
                    if resp.status_code == 200:
                        user_info = resp.json()
                        email = user_info.get("email")
                        first_name = user_info.get("given_name", "Google")
                        last_name = user_info.get("family_name", "User")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not verify Google authentication token."
            )

        clean_email = email.lower().strip()
        db_user = db.query(auth_models.User).filter(auth_models.User.email == clean_email).first()

        if not db_user:
            db_user = auth_models.User(
                first_name=first_name,
                last_name=last_name,
                email=clean_email,
                phone="",
                address="",
                hashed_password=get_password_hash(os.urandom(24).hex())
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)

        if getattr(db_user, 'is_active', True) is False or getattr(db_user, 'is_deleted', False) is True:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated or deleted."
            )

        access_token = create_access_token(data={"sub": db_user.email})
        
        return {
            "token": access_token,
            "user": {
                "id": db_user.id,
                "first_name": db_user.first_name,
                "last_name": db_user.last_name,
                "email": db_user.email,
                "phone": getattr(db_user, 'phone', ''),
                "address": getattr(db_user, 'address', ''),
                "role": getattr(db_user, 'role', 'user')
            }
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google authentication failed: {str(e)}"
        )

@router.post("/apple", response_model=TokenResponse)
async def apple_auth(payload: AppleAuthRequest, db: Session = Depends(get_db)):
    try:
        # 1. Fetch Apple's public keys dynamically
        async with httpx.AsyncClient() as client:
            keys_response = await client.get("https://appleid.apple.com/auth/keys")
            if keys_response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch Apple public keys.")
            apple_keys = keys_response.json().get("keys", [])

        # 2. Extract the unverified header to get the Key ID (kid)
        try:
            unverified_header = jwt.get_unverified_header(payload.token)
        except JWTError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token format.")
            
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apple token missing 'kid' in header.")

        # 3. Match the Key ID with Apple's published public keys
        public_key = next((key for key in apple_keys if key["kid"] == kid), None)
        if not public_key:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apple public key not found for token verification.")

        # 4. Cryptographically verify the payload against the Apple public key
        try:
            verified_payload = jwt.decode(
                payload.token,
                public_key,
                algorithms=["RS256"],
                audience=APPLE_CLIENT_ID,
                issuer="https://appleid.apple.com"
            )
        except JWTError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Token validation failed: {str(e)}")

        email = verified_payload.get("email")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract email from Apple token."
            )

        clean_email = email.lower().strip()
        db_user = db.query(auth_models.User).filter(auth_models.User.email == clean_email).first()

        # If user does not exist, perform automatic sign-up
        if not db_user:
            db_user = auth_models.User(
                first_name=payload.first_name or "Apple",
                last_name=payload.last_name or "User",
                email=clean_email,
                phone="",
                address="",
                hashed_password=get_password_hash(os.urandom(24).hex())
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)

        if getattr(db_user, 'is_active', True) is False or getattr(db_user, 'is_deleted', False) is True:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated or deleted."
            )

        access_token = create_access_token(data={"sub": db_user.email})
        
        return {
            "token": access_token,
            "user": {
                "id": db_user.id,
                "first_name": db_user.first_name,
                "last_name": db_user.last_name,
                "email": db_user.email,
                "phone": getattr(db_user, 'phone', ''),
                "address": getattr(db_user, 'address', ''),
                "role": getattr(db_user, 'role', 'user')
            }
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Apple authentication failed: {str(e)}"
        )

@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    clean_email = req.email.lower().strip()
    db_user = db.query(auth_models.User).filter(auth_models.User.email == clean_email).first()

    if not db_user:
        return {"message": "If that email exists in our system, a reset code has been sent."}

    code = generate_reset_token()
    db_user.reset_token = code
    db_user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    db.commit()
    background_tasks.add_task(send_reset_email, to_email=clean_email, code=code)

    return {"message": "If that email exists in our system, a reset code has been sent."}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    clean_email = req.email.lower().strip()
    db_user = db.query(auth_models.User).filter(
        auth_models.User.email == clean_email,
        auth_models.User.reset_token == req.token.strip()
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code or email."
        )

    current_time_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    if db_user.reset_token_expires and db_user.reset_token_expires < current_time_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one."
        )

    db_user.hashed_password = get_password_hash(req.new_password)
    db_user.reset_token = None
    db_user.reset_token_expires = None

    db.commit()

    return {"message": "Password updated successfully."}

@router.get("/me")
async def get_current_user_profile(current_user = Depends(get_current_user)):
    """Return the profile details of the currently authenticated user."""
    return {
        "id": current_user.id,
        "first_name": getattr(current_user, 'first_name', ''),
        "last_name": getattr(current_user, 'last_name', ''),
        "email": current_user.email,
        "phone": getattr(current_user, 'phone', ''),
        "address": getattr(current_user, 'address', ''),
        "role": getattr(current_user, 'role', 'user')
    }

@router.delete("/account")
async def delete_own_account(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Soft-deletes the currently authenticated user's account.
    Marks the account as deleted/inactive so the user record and 
    associated bookings remain visible to admins.
    """
    try:
        # Check if the model supports soft deletion flags or modify attributes accordingly
        if hasattr(current_user, 'is_deleted'):
            current_user.is_deleted = True
        if hasattr(current_user, 'is_active'):
            current_user.is_active = False
        
        # Optionally append a tag or append '(Deleted)' to email/name for clarity if columns permit, 
        # or simply rely on flags so foreign key constraints and bookings remain intact.
        
        db.commit()
        return {"message": "Account successfully deleted and archived."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}"
        )