from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.database import Base

class MonthlyAdminCost(Base):
    __tablename__ = "monthly_admin_costs"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(String(7), unique=True, index=True, nullable=False) # Format: YYYY-MM
    admin_cost = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
