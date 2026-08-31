from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean
from datetime import datetime
from app.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(200), nullable=False, index=True)
    joining_date = Column(String(50), nullable=True) # Auto added creation/joining date
    is_rbs = Column(Boolean, nullable=False, default=True)
    rbs_type = Column(String(20), nullable=True, default="Debit")  # Credit, Debit

    # Contact Details
    contact_person = Column(String(100), nullable=True)
    contact_phone = Column(String(30), nullable=True)
    contact_email = Column(String(100), nullable=True)

    # Bank Details
    bank_name = Column(String(100), nullable=True)
    account_number = Column(String(50), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    branch_name = Column(String(100), nullable=True)

    # Address
    address = Column(Text, nullable=True)
    city = Column(String(50), nullable=True)
    state = Column(String(50), nullable=True)
    pincode = Column(String(20), nullable=True)

    # Payment Platform Fields
    bank_platform = Column(String(100), nullable=True)  # Payoneer, PayPal, PingPong, etc.
    virtual_account_no = Column(String(100), nullable=True)
    routing_no = Column(String(50), nullable=True)
    accountant_name = Column(String(100), nullable=True)
    bank_data = Column(Text, nullable=True)
    account_mail = Column(String(150), nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
