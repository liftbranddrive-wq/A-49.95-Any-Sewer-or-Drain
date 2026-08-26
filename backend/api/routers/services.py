from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

# Database and Model imports
from database import get_db
from models.services import Service
from models import auth_models

# Notification helper imports and NotificationRecord model
from .notifications import (
    send_expo_push_notification,
    get_regular_user_tokens,
    NotificationRecord,
)

router = APIRouter(prefix="/api/services", tags=["Services Management"])


# ==================== PYDANTIC SCHEMAS ====================

class ServiceCreateUpdate(BaseModel):
    title: str = Field(..., min_length=1, description="Service title is required")
    description: Optional[str] = ""
    duration: Optional[str] = "30 mins"
    icon: Optional[str] = "construct-outline"
    ghl_calendar_id: Optional[str] = None
    is_active: bool = True


class ServiceResponse(ServiceCreateUpdate):
    id: int

    class Config:
        from_attributes = True


def get_admin_tokens(db: Session) -> List[str]:
    """Retrieves push tokens exclusively for Admin users."""
    admin_tokens = [
        u.push_token
        for u in db.query(auth_models.User)
        .filter(
            auth_models.User.push_token.isnot(None),
            func.lower(auth_models.User.role) == "admin"
        ).all()
    ]
    return list(set(admin_tokens))


# ==================== ENDPOINTS ====================

@router.get("", response_model=List[ServiceResponse])
async def get_active_services(db: Session = Depends(get_db)):
    """Public endpoint: returns active services for client booking."""
    return db.query(Service).filter(Service.is_active == True).all()


@router.get("/admin/all", response_model=List[ServiceResponse])
async def get_all_admin_services(db: Session = Depends(get_db)):
    """Admin endpoint: GET /api/services/admin/all."""
    return db.query(Service).all()


@router.post("/admin", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    payload: ServiceCreateUpdate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    """Admin endpoint: POST /api/services/admin"""
    try:
        clean_title = payload.title.strip() if payload.title else ""
        clean_desc = payload.description.strip() if payload.description else ""
        clean_cal_id = (
            payload.ghl_calendar_id.strip() 
            if payload.ghl_calendar_id and payload.ghl_calendar_id.strip() 
            else None
        )

        new_service = Service(
            title=clean_title,
            description=clean_desc,
            duration=payload.duration or "30 mins",
            icon=payload.icon or "construct-outline",
            ghl_calendar_id=clean_cal_id,
            is_active=payload.is_active,
        )
        db.add(new_service)
        db.commit()
        db.refresh(new_service)

        # Construct notification content
        notif_title = "🆕 New Service Available!"
        notif_message = f"We now offer {new_service.title}. Tap to check details and book!"

        # 1. Save to local DB with target_type="regular" so it matches the frontend notification screen query
        db_record = NotificationRecord(
            title=notif_title,
            message=notif_message,
            target_type="regular",  
            notification_type="service_created"
        )
        db.add(db_record)
        db.commit()

        # 2. Trigger push notification in background for all regular authenticated users
        all_tokens = get_regular_user_tokens(db)

        if all_tokens:
            background_tasks.add_task(
                send_expo_push_notification,
                tokens=all_tokens,
                title=notif_title,
                body=notif_message,
                extra_data={
                    "screen": "Services", 
                    "service_id": str(new_service.id), 
                    "target_role": "regular",
                    "action": "service_created"
                }
            )

        return new_service
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database creation error: {str(e)}"
        )


@router.put("/admin/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    payload: ServiceCreateUpdate,
    db: Session = Depends(get_db)
):
    """Admin endpoint: PUT /api/services/admin/{service_id}"""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service with ID {service_id} not found."
        )

    try:
        clean_title = payload.title.strip() if payload.title else ""
        clean_desc = payload.description.strip() if payload.description else ""
        clean_cal_id = (
            payload.ghl_calendar_id.strip() 
            if payload.ghl_calendar_id and payload.ghl_calendar_id.strip() 
            else None
        )

        service.title = clean_title
        service.description = clean_desc
        service.duration = payload.duration or "30 mins"
        service.icon = payload.icon or "construct-outline"
        service.ghl_calendar_id = clean_cal_id
        service.is_active = payload.is_active

        db.commit()
        db.refresh(service)
        return service
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update error: {str(e)}"
        )


@router.delete("/admin/{service_id}", status_code=status.HTTP_200_OK)
async def delete_service(service_id: int, db: Session = Depends(get_db)):
    """Admin endpoint: DELETE /api/services/admin/{service_id}"""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service with ID {service_id} not found."
        )

    db.delete(service)
    db.commit()
    return {"status": "success", "message": f"Service {service_id} successfully deleted."}