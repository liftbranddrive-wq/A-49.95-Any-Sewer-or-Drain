from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base  # Import your SQLAlchemy Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_title = Column(String(255), nullable=False)
    service_icon = Column(String(100), nullable=True, default="pipe")
    start_time = Column(DateTime, nullable=False)
    status = Column(String(50), default="CONFIRMED")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Optional relationship to User model
    # user = relationship("User", back_populates="bookings")