from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentCreate(BaseModel):
    document_type: str
    document_number: Optional[str] = None
    file_url: Optional[str] = None
    notes: Optional[str] = None

class DocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    file_url: Optional[str] = None
    notes: Optional[str] = None

class DocumentResponse(BaseModel):
    id: int
    user_id: int
    document_type: str
    document_number: Optional[str] = None
    file_url: Optional[str] = None
    notes: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True
