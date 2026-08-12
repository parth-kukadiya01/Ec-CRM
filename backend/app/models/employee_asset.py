from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class EmployeeAsset(Base):
    __tablename__ = "employee_assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    asset_name = Column(String(100), nullable=False)
    asset_type = Column(String(50), nullable=False)     # Laptop / Phone / ID Card / Vehicle / Uniform / Other
    serial_number = Column(String(100), nullable=True)
    asset_value = Column(String(50), nullable=True)      # Estimated value

    assigned_date = Column(Date, nullable=True)
    return_date = Column(Date, nullable=True)
    condition = Column(String(20), default="Good")        # New / Good / Fair / Damaged / Returned
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="assets")
