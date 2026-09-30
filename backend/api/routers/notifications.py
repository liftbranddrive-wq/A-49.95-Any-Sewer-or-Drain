import os
from typing import Optional, List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import httpx
from datetime import datetime

from database import get_db, SessionLocal
from models import auth_models
# Import your Notification model from your shared models file, or define it here if it's local
# from models.notification_model import Notification 
from .admin_authorization import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
scheduler = AsyncIOScheduler()

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
            auth_models.func.lower(auth_models.func.coalesce(auth_models.User.role, "")) == "admin",
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
            auth_models.func.lower(auth_models.User.role) == "admin",
        )
        .all()
    }

    non_admin_db_tokens = [
        u.push_token
        for u in db.query(auth_models.User)
        .filter(
            auth_models.User.push_token.isnot(None),
            auth_models.User.push_token != "",
            auth_models.func.lower(auth_models.User.role) != "admin",
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
    Returns notifications specifically belonging to the logged-in user.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    # Fetch notifications tied to the user's ID using your exact Notification model
    records = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

    return [
        {
            "id": r.id,
            "title": r.title,
            "message": r.body, # Map 'body' column to 'message' for the frontend
            "read": r.is_read,  # Correctly mapped to your database is_read boolean
            "time": r.created_at.strftime("%b %d, %I:%M %p") if r.created_at else "Just now"
        }
        for r in records
    ]


# ==================== MARK NOTIFICATION AS READ ====================

@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    record = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    record.is_read = True
    db.commit()
    return {"status": "success", "message": "Notification marked as read"}


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


# ==================== HELPER TO SAVE & BROADCAST ====================

def create_and_send_notification_to_users(db: Session, user_ids: List[int], title: str, body: str, extra_data: dict = None):
    """Saves notification rows for specific user IDs in database"""
    for uid in user_ids:
        db_record = Notification(
            user_id=uid,
            title=title,
            body=body,
            is_read=False
        )
        db.add(db_record)
    db.commit()


# ==================== SCHEDULED WEEKEND PROMO CRON ====================

async def send_weekend_promo_cron():
    """Automated cron job running every weekend to dispatch $5 promo exclusively to opted-in regular users."""
    db = SessionLocal()
    try:
        eligible_users = db.query(auth_models.User).filter(
            auth_models.User.marketing_push_enabled == True,
            auth_models.User.push_token.isnot(None),
            auth_models.User.push_token != "",
            auth_models.func.lower(auth_models.func.coalesce(auth_models.User.role, "")) != "admin"
        ).all()

        tokens = [u.push_token for u in eligible_users]
        user_ids = [u.id for u in eligible_users]

        if not tokens:
            return

        title = "$5 Weekend Promo!"
        body = "Enjoy your exclusive $5 discount this weekend. Tap to claim your savings!"

        create_and_send_notification_to_users(db, user_ids, title, body)

        await send_expo_push_notification(
            tokens=tokens,
            title=title,
            body=body,
            extra_data={"screen": "Home", "notification_type": "weekend_promo"}
        )
    finally:
        db.close()


# ==================== SCHEDULER LIFECYCLE MANAGEMENT ====================

def start_scheduler():
    if not scheduler.running:
        # Schedule the $5 promo to run every Saturday at 10:00 AM
        scheduler.add_job(send_weekend_promo_cron, 'cron', day_of_week='sat', hour=10, minute=0)
        scheduler.start()

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()


# ==================== REGULAR USER NOTIFICATIONS & PROMOS ====================

@router.post("/send-test")
async def send_test_notification(
    payload: CustomPushRequest, db: Session = Depends(get_db)
):
    target_users = db.query(auth_models.User).filter(
        auth_models.User.push_token.isnot(None),
        auth_models.User.push_token != "",
        auth_models.func.lower(auth_models.func.coalesce(auth_models.User.role, "")) != "admin"
    ).all()

    target_tokens = [u.push_token for u in target_users]
    target_user_ids = [u.id for u in target_users]

    # Save to database for each regular user
    create_and_send_notification_to_users(db, target_user_ids, payload.title, payload.body)

    if target_tokens:
        await send_expo_push_notification(
            tokens=target_tokens,
            title=payload.title,
            body=payload.body,
            extra_data={"screen": payload.screen, "service_id": payload.service_id},
        )
    return {"message": "Notification sent and stored for regular users."}


# ==================== ADMIN NOTIFICATIONS ====================

@router.post("/notify-call")
async def notify_admin_on_call(
    payload: CallNotifyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(get_current_user),
):
    admins = db.query(auth_models.User).filter(
        auth_models.User.push_token.isnot(None),
        auth_models.func.lower(auth_models.User.role) == "admin"
    ).all()

    admin_tokens = [a.push_token for a in admins]
    admin_ids = [a.id for a in admins]

    caller_identity = "A customer"
    if current_user:
        caller_identity = getattr(current_user, "full_name", None) or getattr(current_user, "first_name", None) or current_user.email
    elif payload.caller_name:
        caller_identity = payload.caller_name

    phone_info = f" ({payload.phone_number})" if payload.phone_number else ""
    title = "📞 Incoming Call Triggered!"
    body = f"{caller_identity}{phone_info} just tapped to call from the app."

    # Save notification for all admins
    create_and_send_notification_to_users(db, admin_ids, title, body)

    if admin_tokens:
        background_tasks.add_task(
            send_expo_push_notification,
            tokens=admin_tokens,
            title=title,
            body=body,
            extra_data={"screen": "Admin", "action": "call_initiated"},
        )

    return {"status": "success", "message": "Admin call notification logged and queued."}


@router.post("/notify-booking")
async def notify_admin_on_booking(
    payload: BookingNotifyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: auth_models.User = Depends(get_current_user),
):
    admins = db.query(auth_models.User).filter(
        auth_models.User.push_token.isnot(None),
        auth_models.func.lower(auth_models.User.role) == "admin"
    ).all()

    admin_tokens = [a.push_token for a in admins]
    admin_ids = [a.id for a in admins]
    
    customer_name = "A customer"
    if current_user:
        customer_name = getattr(current_user, "full_name", None) or current_user.email

    title = "📅 New Service Booked!"
    body = f"{customer_name} booked '{payload.service_name}' for {payload.booking_date}."

    # Save notification for all admins
    create_and_send_notification_to_users(db, admin_ids, title, body)

    if admin_tokens:
        background_tasks.add_task(
            send_expo_push_notification,
            tokens=admin_tokens,
            title=title,
            body=body,
            extra_data={"screen": "Admin", "action": "booking_created", "service_id": payload.service_id},
        )

    return {"status": "success", "message": "Admin booking notification logged and queued."}