from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    document_type = Column(String(50), nullable=False)   # Aadhar / PAN / Passport / Driving License / Offer Letter / Experience Letter / Other
    document_number = Column(String(100), nullable=True)
    file_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="documents")
