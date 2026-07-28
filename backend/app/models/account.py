from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String(150), nullable=False, index=True)
    account_type = Column(String(50), nullable=False, default="Partner") # User, Partner, 3rd Party
    bank_name = Column(String(100), nullable=True)
    account_number = Column(String(50), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    branch_name = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
