import os
from typing import Optional, List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, DateTime, Text, func
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import httpx
from datetime import datetime

from database import get_db, Base
from models import auth_models
from .admin_authorization import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
scheduler = AsyncIOScheduler()

# ==================== DATABASE MODEL ====================
class NotificationRecord(Base):
    __tablename__ = "notification_records"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    target_type = Column(String(50), nullable=False) # 'admin' or 'regular'
    notification_type = Column(String(50), nullable=False) # 'call_triggered', 'booking_created', 'new_service_added', 'weekly_promo'
    service_id = Column(Integer, nullable=True) # Linked service ID for click navigation
    created_at = Column(DateTime, default=datetime.utcnow)

# ==================== PYDANTIC SCHEMAS ====================
class TokenRequest(BaseModel):
    push_token: str

class CustomPushRequest(BaseModel):
    title: str
    body: str
    screen: Optional[str] = "Home"
    notification_type: Optional[str] = "new_service_added"
    service_id: Optional[int] = None

class CallNotifyRequest(BaseModel):
    caller_name: Optional[str] = "A customer"
    phone_number: Optional[str] = None

class BookingNotifyRequest(BaseModel):
    service_name: str
    booking_date: str
    service_id: Optional[int] = None


# ==================== STRICT TOKEN FILTER HELPERS ====================

def get_admin_tokens(db: Session) -> List[str]:
    """Retrieves push tokens exclusively for users with role == 'admin'."""
    admin_tokens = [
        u.push_token
        for u in db.query(auth_models.User)
        .filter(
            auth_models.User.push_token.isnot(None),
            auth_models.User.push_token != "",
            func.lower(func.coalesce(auth_models.User.role, "")) == "admin",
        )
        .all()
    ]
    return list(set(admin_tokens))

def get_regular_user_tokens(db: Session) -> List[str]:
    """Retrieves push tokens strictly for authenticated users where role != 'admin'."""
    admin_tokens = {
        u.push_token
        for u in db.query(auth_models.User)
        .filter(
            auth_models.User.push_token.isnot(None),
            func.lower(auth_models.User.role) == "admin",
        )
        .all()
    }

    non_admin_db_tokens = [
        u.push_token
        for u in db.query(auth_models.User)
        .filter(
            auth_models.User.push_token.isnot(None),
            auth_models.User.push_token != "",
            func.lower(auth_models.User.role) != "admin",
        )
        .all()
    ]

    combined = [t for t in non_admin_db_tokens if t not in admin_tokens]
    return list(set(combined))


# ==================== TOKEN REGISTRATION ====================

@router.post("/register-token")
def register_token(
    data: TokenRequest,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    current_user.push_token = data.push_token.strip()
    db.commit()
    return {"message": "Push token registered successfully"}


@router.post("/unregister-token")
def unregister_token(
    data: TokenRequest,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    current_user.push_token = None
    db.commit()
    return {"message": "Push token removed successfully"}


# ==================== FETCH NOTIFICATIONS ENDPOINT ====================

@router.get("")
@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(get_current_user),
):
    """
    Returns role-filtered notification history safely supporting both trailing slash variations.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    raw_role = getattr(current_user, "role", "") or ""
    is_admin = str(raw_role).strip().lower() == "admin"

    if is_admin:
        records = db.query(NotificationRecord).filter(
            NotificationRecord.target_type == "admin"
        ).order_by(NotificationRecord.created_at.desc()).all()
    else:
        records = db.query(NotificationRecord).filter(
            NotificationRecord.target_type == "regular"
        ).order_by(NotificationRecord.created_at.desc()).all()

    return [
        {
            "id": r.id,
            "title": r.title,
            "message": r.message,
            "type": r.notification_type,
            "service_id": r.service_id,
            "time": r.created_at.strftime("%b %d, %I:%M %p") if r.created_at else "Just now"
        }
        for r in records
    ]


# ==================== PUSH SENDER HELPER ====================

async def send_expo_push_notification(
    tokens: List[str], title: str, body: str, extra_data: dict = None
):
    valid_tokens = [t for t in tokens if t and t.startswith("ExponentPushToken")]
    if not valid_tokens:
        return

    messages = [
        {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": extra_data or {},
            "priority": "high",
        }
        for token in valid_tokens
    ]

    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=5.0,
            )
        except Exception as e:
            print(f"--- [PUSH SERVICE] Failed to send push: {e} ---")


# ==================== REGULAR USER NOTIFICATIONS & PROMOS ====================

@router.post("/send-test")
async def send_test_notification(
    payload: CustomPushRequest, db: Session = Depends(get_db)
):
    target_tokens = get_regular_user_tokens(db)

    db_record = NotificationRecord(
        title=payload.title,
        message=payload.body,
        target_type="regular",
        notification_type=payload.notification_type,
        service_id=payload.service_id
    )
    db.add(db_record)
    db.commit()

    if target_tokens:
        await send_expo_push_notification(
            tokens=target_tokens,
            title=payload.title,
            body=payload.body,
            extra_data={"screen": payload.screen, "target_role": "regular", "service_id": payload.service_id},
        )
    return {"message": "Notification sent and stored for regular users."}


async def send_weekend_promotion():
    from database import SessionLocal
    db = SessionLocal()
    try:
        tokens = get_regular_user_tokens(db)
        title = "💰 $5 Weekend Promo Offer!"
        body = "Get $5 OFF on any plumbing or drain service when you book or call through the app today!"
        
        db_record = NotificationRecord(
            title=title,
            message=body,
            target_type="regular",
            notification_type="weekly_promo"
        )
        db.add(db_record)
        db.commit()

        if tokens:
            await send_expo_push_notification(
                tokens=tokens,
                title=title,
                body=body,
                extra_data={"screen": "Services", "target_role": "regular"},
            )
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(send_weekend_promotion, "cron", day_of_week="sat,sun", hour=9, minute=0)
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()


# ==================== ADMIN NOTIFICATIONS ====================

@router.post("/notify-call")
async def notify_admin_on_call(
    payload: CallNotifyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(get_current_user),
):
    admin_tokens = get_admin_tokens(db)

    caller_identity = "A customer"
    if current_user:
        caller_identity = getattr(current_user, "full_name", None) or getattr(current_user, "first_name", None) or current_user.email
    elif payload.caller_name:
        caller_identity = payload.caller_name

    phone_info = f" ({payload.phone_number})" if payload.phone_number else ""
    title = "📞 Incoming Call Triggered!"
    body = f"{caller_identity}{phone_info} just tapped to call from the app."

    db_record = NotificationRecord(
        title=title,
        message=body,
        target_type="admin",
        notification_type="call_triggered"
    )
    db.add(db_record)
    db.commit()

    if admin_tokens:
        background_tasks.add_task(
            send_expo_push_notification,
            tokens=admin_tokens,
            title=title,
            body=body,
            extra_data={"screen": "Admin", "target_role": "admin", "action": "call_initiated"},
        )

    return {"status": "success", "message": "Admin call notification logged and queued."}


@router.post("/notify-booking")
async def notify_admin_on_booking(
    payload: BookingNotifyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(get_current_user),
):
    admin_tokens = get_admin_tokens(db)
    
    customer_name = "A customer"
    if current_user:
        customer_name = getattr(current_user, "full_name", None) or current_user.email

    title = "📅 New Service Booked!"
    body = f"{customer_name} booked '{payload.service_name}' for {payload.booking_date}."

    db_record = NotificationRecord(
        title=title,
        message=body,
        target_type="admin",
        notification_type="booking_created",
        service_id=payload.service_id
    )
    db.add(db_record)
    db.commit()

    if admin_tokens:
        background_tasks.add_task(
            send_expo_push_notification,
            tokens=admin_tokens,
            title=title,
            body=body,
            extra_data={"screen": "Admin", "target_role": "admin", "action": "booking_created", "service_id": payload.service_id},
        )

    return {"status": "success", "message": "Admin booking notification logged and queued."}