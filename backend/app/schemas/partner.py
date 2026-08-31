from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PartnerBase(BaseModel):
    partner_name: str
    joining_date: Optional[str] = None
    partner_type: Optional[str] = "Service"  # Service, Partner with %
    partner_share_percentage: Optional[float] = 0.0
    is_rbs: Optional[bool] = True
    rbs_type: Optional[str] = "Credit"  # Credit, Debit
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    bank_platform: Optional[str] = None
    virtual_account_no: Optional[str] = None
    routing_no: Optional[str] = None
    accountant_name: Optional[str] = None
    bank_data: Optional[str] = None
    account_mail: Optional[str] = None
    notes: Optional[str] = None

class PartnerCreate(PartnerBase):
    pass

class PartnerUpdate(BaseModel):
    partner_name: Optional[str] = None
    joining_date: Optional[str] = None
    partner_type: Optional[str] = None
    partner_share_percentage: Optional[float] = None
    is_rbs: Optional[bool] = None
    rbs_type: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    bank_platform: Optional[str] = None
    virtual_account_no: Optional[str] = None
    routing_no: Optional[str] = None
    accountant_name: Optional[str] = None
    bank_data: Optional[str] = None
    account_mail: Optional[str] = None
    notes: Optional[str] = None

class PartnerResponse(PartnerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
