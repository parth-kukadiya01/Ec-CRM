from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AccountBase(BaseModel):
    account_name: str
    account_type: str = "Partner" # User, Partner, 3rd Party
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    notes: Optional[str] = None
    required_documents: Optional[str] = None
    shipping_enabled: Optional[bool] = True
    default_shipping_partner: Optional[str] = "FedEx Express"

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    account_type: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    notes: Optional[str] = None
    required_documents: Optional[str] = None
    shipping_enabled: Optional[bool] = None
    default_shipping_partner: Optional[str] = None

class AccountResponse(AccountBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
