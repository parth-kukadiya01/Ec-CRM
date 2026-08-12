from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

class EmployeeSalary(Base):
    __tablename__ = "employee_salaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    base_salary = Column(Float, default=0)
    hra = Column(Float, default=0)              # House Rent Allowance
    da = Column(Float, default=0)               # Dearness Allowance
    special_allowance = Column(Float, default=0)
    bonus = Column(Float, default=0)
    deductions = Column(Float, default=0)
    net_salary = Column(Float, default=0)

    effective_from = Column(Date, default=date.today)
    payment_mode = Column(String(20), default="Bank")   # Bank / Cash / UPI
    status = Column(String(20), default="Active")        # Active / Revised / Stopped
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="salaries")
