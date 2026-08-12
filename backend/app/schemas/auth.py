from pydantic import BaseModel, EmailStr
from typing import Optional, List

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserAuthResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    is_partner: bool = False
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    role_name: Optional[str] = None
    permissions: List[str] = []

    class Config:
        from_attributes = True
