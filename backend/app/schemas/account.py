from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AccountBase(BaseModel):
    account_name: str
    category: Optional[str] = "Company" # Company, Partner
    account_type: Optional[str] = "Partner" # User, Partner, 3rd Party
    marketplace: Optional[str] = None
    
    # Tax & Banking
    gst_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    
    # Contact Details
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    # Logistics & Purchase links
    shipment_type: Optional[str] = None
    purchase_company: Optional[str] = None
    
    # Foreign Keys to Company & Partner entities
    company_id: Optional[int] = None
    partner_id: Optional[int] = None
    
    # Partner Specific Configuration
    partner_type: Optional[str] = None # Service, Partner with %
    partner_share_percentage: Optional[float] = 0.0

    notes: Optional[str] = None
    required_documents: Optional[str] = None
    uploaded_documents: Optional[str] = None
    shipping_enabled: Optional[bool] = True
    default_shipping_partner: Optional[str] = "FedEx Express"

    # Enterprise PDF Spreadsheet Fields
    born_date: Optional[str] = None
    user_name: Optional[str] = None
    balance_usd: Optional[float] = 0.0
    total_orders: Optional[int] = 0
    total_listings: Optional[int] = 0
    first_payment: Optional[bool] = False
    brand_gtin: Optional[str] = None
    dor: Optional[str] = None
    bank_payoneer: Optional[str] = None
    winning_listing: Optional[str] = None
    listing_strategy: Optional[str] = None
    mark_status: Optional[str] = "Active"
    mail: Optional[str] = None
    mail_pass: Optional[str] = None
    account_pass: Optional[str] = None
    card_code: Optional[str] = None
    authenticator_code: Optional[str] = None
    support_file: Optional[str] = None

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    category: Optional[str] = None
    account_type: Optional[str] = None
    marketplace: Optional[str] = None
    gst_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    shipment_type: Optional[str] = None
    purchase_company: Optional[str] = None
    company_id: Optional[int] = None
    partner_id: Optional[int] = None
    partner_type: Optional[str] = None
    partner_share_percentage: Optional[float] = None
    notes: Optional[str] = None
    required_documents: Optional[str] = None
    uploaded_documents: Optional[str] = None
    shipping_enabled: Optional[bool] = None
    default_shipping_partner: Optional[str] = None

    born_date: Optional[str] = None
    user_name: Optional[str] = None
    balance_usd: Optional[float] = None
    total_orders: Optional[int] = None
    total_listings: Optional[int] = None
    first_payment: Optional[bool] = None
    brand_gtin: Optional[str] = None
    dor: Optional[str] = None
    bank_payoneer: Optional[str] = None
    winning_listing: Optional[str] = None
    listing_strategy: Optional[str] = None
    mark_status: Optional[str] = None
    mail: Optional[str] = None
    mail_pass: Optional[str] = None
    account_pass: Optional[str] = None
    card_code: Optional[str] = None
    authenticator_code: Optional[str] = None
    support_file: Optional[str] = None

class AccountResponse(AccountBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

