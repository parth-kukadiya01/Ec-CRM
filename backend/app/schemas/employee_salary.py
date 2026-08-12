from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class SalaryCreate(BaseModel):
    base_salary: float = 0
    hra: float = 0
    da: float = 0
    special_allowance: float = 0
    bonus: float = 0
    deductions: float = 0
    net_salary: Optional[float] = None
    effective_from: Optional[date] = None
    payment_mode: str = "Bank"
    status: str = "Active"
    notes: Optional[str] = None

class SalaryUpdate(BaseModel):
    base_salary: Optional[float] = None
    hra: Optional[float] = None
    da: Optional[float] = None
    special_allowance: Optional[float] = None
    bonus: Optional[float] = None
    deductions: Optional[float] = None
    net_salary: Optional[float] = None
    effective_from: Optional[date] = None
    payment_mode: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class SalaryResponse(BaseModel):
    id: int
    user_id: int
    base_salary: float
    hra: float
    da: float
    special_allowance: float
    bonus: float
    deductions: float
    net_salary: float
    effective_from: Optional[date] = None
    payment_mode: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
