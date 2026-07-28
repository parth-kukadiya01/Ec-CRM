from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.schemas.role import RoleResponse

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role_id: Optional[int] = None
    is_admin: bool = False
    is_partner: bool = False
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    personal_details: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    salary_summary: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[int] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    is_partner: Optional[bool] = None
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    personal_details: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    salary_summary: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    is_admin: bool
    is_active: bool
    is_partner: bool = False
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    role_id: Optional[int] = None
    role: Optional[RoleResponse] = None
    personal_details: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    salary_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
