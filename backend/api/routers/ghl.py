import os
import httpx
from datetime import datetime, timezone
from typing import Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from pathlib import Path

# Auth dependency
from api.routers.auth import get_current_user

# Notification helpers and NotificationRecord model
from .notifications import send_expo_push_notification, get_admin_tokens, NotificationRecord

# Database dependency and model imports
from database import get_db
from models.services import Service
from models.bookings import Booking

# Points to root folder where .env is located
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

router = APIRouter(prefix="/api/auth/ghl", tags=["GoHighLevel Integration"])

GHL_API_KEY = os.getenv("GHL_API_KEY", "")
GHL_LOCATION_ID = os.getenv("GHL_LOCATION_ID", "")
GHL_BASE_URL = "https://services.leadconnectorhq.com"


# ==================== PYDANTIC SCHEMAS ====================

class SlotsRequest(BaseModel):
    serviceId: Optional[Union[int, str]] = None
    service_id: Optional[Union[int, str]] = None
    startDate: int  # Timestamp in ms
    endDate: int    # Timestamp in ms

    @property
    def get_service_id(self) -> Union[int, str]:
        return self.serviceId if self.serviceId is not None else self.service_id


class BookAppointmentRequest(BaseModel):
    serviceId: Optional[Union[int, str]] = None
    service_id: Optional[Union[int, str]] = None
    selectedSlot: Optional[str] = None
    selected_slot: Optional[str] = None
    startTime: Optional[str] = None
    start_time: Optional[str] = None
    firstName: Optional[str] = ""
    first_name: Optional[str] = ""
    lastName: Optional[str] = ""
    last_name: Optional[str] = ""
    email: EmailStr
    phone: str
    additionalInformation: Optional[str] = ""
    additional_information: Optional[str] = ""
    notes: Optional[str] = ""
    consent: Optional[bool] = True

    @property
    def get_service_id(self) -> Union[int, str]:
        return self.serviceId if self.serviceId is not None else self.service_id

    @property
    def get_slot(self) -> str:
        return self.selectedSlot or self.selected_slot or self.startTime or self.start_time or ""

    @property
    def get_first_name(self) -> str:
        return (self.firstName or self.first_name or "").strip()

    @property
    def get_last_name(self) -> str:
        return (self.lastName or self.last_name or "").strip()


# ==================== HELPER FUNCTIONS ====================

def get_calendar_id_from_db(service_id: Union[int, str], db: Session) -> tuple[str, str]:
    """Fetches the service from DB and returns (ghl_calendar_id, service_title)."""
    search_id = int(service_id) if str(service_id).isdigit() else service_id
    service = db.query(Service).filter(Service.id == search_id, Service.is_active == True).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service with ID '{service_id}' not found or is inactive."
        )
    
    if not service.ghl_calendar_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service '{service.title}' does not have a GoHighLevel Calendar ID configured."
        )
        
    return service.ghl_calendar_id, service.title


def sanitize_phone_number(phone: str) -> str:
    cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
    if not cleaned.startswith("+"):
        cleaned = "+1" + cleaned  # Default to US/Canada +1 prefix if missing
    return cleaned


def get_ghl_headers():
    token = GHL_API_KEY.strip().strip('"').strip("'")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GHL_API_KEY is not configured or failed to load from environment variables."
        )

    return {
        "Authorization": f"Bearer {token}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
    }


# ==================== ENDPOINTS ====================

@router.post("/slots")
async def get_ghl_slots(payload: SlotsRequest, db: Session = Depends(get_db)):
    """Fetches available slots for a given service directly from GoHighLevel."""
    service_id = payload.get_service_id
    if not service_id:
        raise HTTPException(status_code=400, detail="Missing serviceId or service_id in request body.")

    calendar_id, _ = get_calendar_id_from_db(service_id, db)

    url = f"{GHL_BASE_URL}/calendars/{calendar_id}/free-slots"
    params = {
        "startDate": str(payload.startDate),
        "endDate": str(payload.endDate),
        "timezone": "America/New_York",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                url,
                headers=get_ghl_headers(),
                params=params,
                timeout=10.0,
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"GHL Slot Fetch Failed: {response.text}",
                )
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Network error connecting to GoHighLevel: {exc}",
            )


@router.post("/book")
async def book_ghl_appointment(
    payload: BookAppointmentRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upserts contact into GHL, creates appointment, saves booking to local MySQL DB, and notifies admins."""
    service_id = payload.get_service_id
    slot_str = payload.get_slot
    first_name = payload.get_first_name
    last_name = payload.get_last_name

    if not service_id:
        raise HTTPException(status_code=400, detail="Missing serviceId or service_id.")
    if not slot_str:
        raise HTTPException(status_code=400, detail="Missing selectedSlot or startTime.")

    calendar_id, service_title = get_calendar_id_from_db(service_id, db)
    formatted_phone = sanitize_phone_number(payload.phone)

    # Fetch icon from Service model if available
    search_sid = int(service_id) if str(service_id).isdigit() else service_id
    service_obj = db.query(Service).filter(Service.id == search_sid).first()
    service_icon = getattr(service_obj, "icon", "pipe") or "pipe"

    ghl_appt_id = None
    ghl_res_data = {}

    # Attempt GoHighLevel Sync
    async with httpx.AsyncClient() as client:
        try:
            contact_url = f"{GHL_BASE_URL}/contacts/upsert"
            contact_payload = {
                "locationId": GHL_LOCATION_ID,
                "firstName": first_name,
                "lastName": last_name,
                "email": payload.email,
                "phone": formatted_phone,
            }

            contact_response = await client.post(
                contact_url,
                headers=get_ghl_headers(),
                json=contact_payload,
                timeout=10.0,
            )

            if contact_response.status_code in [200, 201]:
                contact_data = contact_response.json()
                contact_id = contact_data.get("contact", {}).get("id")

                if contact_id:
                    appointment_url = f"{GHL_BASE_URL}/calendars/events/appointments"
                    appointment_payload = {
                        "calendarId": calendar_id,
                        "locationId": GHL_LOCATION_ID,
                        "startTime": slot_str,
                        "contactId": contact_id,
                        "title": f"{first_name} {last_name} - {service_title}",
                        "notes": payload.notes or payload.additionalInformation or payload.additional_information,
                        "appointmentStatus": "confirmed",
                    }

                    booking_response = await client.post(
                        appointment_url,
                        headers=get_ghl_headers(),
                        json=appointment_payload,
                        timeout=10.0,
                    )

                    if booking_response.status_code in [200, 201]:
                        ghl_res_data = booking_response.json()
                        ghl_appt_id = ghl_res_data.get("id") or ghl_res_data.get("event", {}).get("id")
                    else:
                        print(f"⚠️ GHL Appointment Error ({booking_response.status_code}): {booking_response.text}")
            else:
                print(f"⚠️ GHL Contact Error ({contact_response.status_code}): {contact_response.text}")

        except Exception as ghl_err:
            print(f"⚠️ GoHighLevel Sync Exception: {str(ghl_err)}")

    # Parse ISO start time safely
    try:
        clean_slot = slot_str.replace("Z", "+00:00")
        start_dt = datetime.fromisoformat(clean_slot)
    except Exception:
        start_dt = datetime.now(timezone.utc)

    # Save to local MySQL DB
    try:
        notes_text = payload.notes or payload.additionalInformation or payload.additional_information or ""

        new_booking = Booking(
            user_id=current_user.id,
            service_title=service_title,
            service_icon=service_icon,
            start_time=start_dt,
            status="CONFIRMED",
            notes=notes_text
        )
        
        db.add(new_booking)
        db.commit()
        db.refresh(new_booking)

        print(f"✅ SUCCESSFULLY SAVED BOOKING TO MYSQL | ID: {new_booking.id} | USER: {current_user.id}")

        # Store notification record in DB explicitly for the Admin Screen Feed
        customer_name = f"{first_name} {last_name}".strip() or getattr(current_user, "email", "A customer")
        booking_time_str = start_dt.strftime("%b %d, %Y at %I:%M %p")
        
        notif_title = "📅 New Service Booked!"
        notif_message = f"{customer_name} booked '{service_title}' for {booking_time_str}."

        db_record = NotificationRecord(
            title=notif_title,
            message=notif_message,
            target_type="admin",
            notification_type="booking_created"
        )
        db.add(db_record)
        db.commit()

        # Trigger Admin-Only Push Notification via Background Task
        admin_tokens = get_admin_tokens(db)
        if admin_tokens:
            background_tasks.add_task(
                send_expo_push_notification,
                tokens=admin_tokens,
                title=notif_title,
                body=notif_message,
                extra_data={
                    "screen": "Admin",
                    "target_role": "admin",
                    "action": "booking_created",
                    "booking_id": str(new_booking.id)
                }
            )

        return {
            "status": "success",
            "message": "Appointment scheduled and saved successfully",
            "booking_id": new_booking.id,
            "booking": ghl_res_data,
        }
    except Exception as db_err:
        db.rollback()
        print(f"❌ DATABASE INSERT ERROR: {str(db_err)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save booking to local database: {str(db_err)}"
        )


@router.get("/my-bookings")
async def get_my_bookings(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Fetches all previous and upcoming bookings for the authenticated user from MySQL."""
    try:
        user_bookings = (
            db.query(Booking)
            .filter(Booking.user_id == current_user.id)
            .order_by(Booking.start_time.desc())
            .all()
        )

        result = []
        for b in user_bookings:
            start_time_iso = b.start_time.isoformat() if getattr(b, "start_time", None) and hasattr(b.start_time, "isoformat") else str(getattr(b, "start_time", ""))
            created_at_iso = b.created_at.isoformat() if getattr(b, "created_at", None) and hasattr(b.created_at, "isoformat") else str(getattr(b, "created_at", ""))

            result.append({
                "id": b.id,
                "service_title": b.service_title,
                "service_icon": b.service_icon or "pipe",
                "start_time": start_time_iso,
                "status": b.status or "CONFIRMED",
                "notes": b.notes or "",
                "created_at": created_at_iso,
            })

        return {"bookings": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user bookings: {str(e)}"
        )


@router.get("/debug-all-bookings")
def debug_all_bookings(db: Session = Depends(get_db)):
    all_bookings = db.query(Booking).all()
    return {
        "count": len(all_bookings),
        "records": [
            {
                "id": b.id,
                "user_id": b.user_id,
                "service_title": b.service_title,
                "service_icon": b.service_icon,
                "start_time": str(b.start_time),
                "status": b.status,
                "notes": b.notes,
                "created_at": str(b.created_at)
            }
            for b in all_bookings
        ]
    }


@router.get("/test-create-booking")
def test_create_booking(user_id: int = 1, db: Session = Depends(get_db)):
    """Bypasses Auth and GHL to test direct MySQL insertion."""
    try:
        test_booking = Booking(
            user_id=user_id,
            service_title="Test Pipe Inspection",
            service_icon="pipe",
            start_time=datetime.now(timezone.utc),
            status="CONFIRMED",
            notes="Direct test insertion"
        )
        db.add(test_booking)
        db.commit()
        db.refresh(test_booking)
        return {"status": "success", "created_id": test_booking.id}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}