from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExpenseClaimCreate(BaseModel):
    title: str
    amount: float
    category: str = "Travel & Logistics"
    date: str
    receipt_image: Optional[str] = None
    notes: Optional[str] = None

class ExpenseClaimStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    approval_proof: Optional[str] = None

class ExpenseClaimResponse(BaseModel):
    id: int
    user_id: int
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    title: str
    amount: float
    category: str
    date: str
    status: str
    receipt_image: Optional[str] = None
    notes: Optional[str] = None
    approval_proof: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
