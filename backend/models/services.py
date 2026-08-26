# models.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    duration = Column(String(50), nullable=False)  # e.g., "30-45 mins" or "1 hour"
    icon = Column(String(50), nullable=False, default="construct-outline")  # Expo Ionicons icon name
    is_active = Column(Boolean, default=True)      # Toggle visibility on client side
    ghl_calendar_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())