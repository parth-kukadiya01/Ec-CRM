from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)

    # Partner / Account linking
    is_partner = Column(Boolean, default=False)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    account_name = Column(String(100), nullable=True)

    # Employee specific details
    personal_details = Column(Text, nullable=True) # Address, DOB, gender, etc.
    bank_name = Column(String(100), nullable=True)
    account_number = Column(String(50), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    salary_summary = Column(Text, nullable=True) # Base salary, allowances, etc.

    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="users")
