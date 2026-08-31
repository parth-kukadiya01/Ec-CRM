from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey
from datetime import datetime
from app.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String(150), nullable=False, index=True)
    category = Column(String(50), nullable=False, default="Company") # Company, Partner
    account_type = Column(String(50), nullable=False, default="Partner") # User, Partner, 3rd Party
    marketplace = Column(String(100), nullable=True) # Amazon, eBay, Walmart, Etsy, Shopify, etc.
    
    # Tax & Banking
    gst_number = Column(String(50), nullable=True)
    bank_name = Column(String(100), nullable=True)
    account_number = Column(String(50), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    branch_name = Column(String(100), nullable=True)
    
    # Contact Details
    contact_person = Column(String(100), nullable=True)
    contact_phone = Column(String(30), nullable=True)
    contact_email = Column(String(100), nullable=True)
    contact_address = Column(Text, nullable=True)
    city = Column(String(50), nullable=True)
    state = Column(String(50), nullable=True)
    pincode = Column(String(20), nullable=True)

    # Logistics & Purchase links
    shipment_type = Column(String(100), nullable=True)
    purchase_company = Column(String(150), nullable=True)
    
    # Foreign Keys to Company & Partner entities
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="SET NULL"), nullable=True)
    
    # Partner Specific Configuration
    partner_type = Column(String(50), nullable=True) # Service, Partner with %
    partner_share_percentage = Column(Float, nullable=True, default=0.0)

    notes = Column(Text, nullable=True)

    # Dynamic document requirements & shipping defaults
    required_documents = Column(Text, nullable=True) # JSON array string of required doc objects
    uploaded_documents = Column(Text, nullable=True) # JSON array string of actual uploaded file objects
    shipping_enabled = Column(Boolean, default=True)
    default_shipping_partner = Column(String(100), nullable=True, default="FedEx Express")

    # Enterprise PDF Spreadsheet Fields
    born_date = Column(String(50), nullable=True)
    user_name = Column(String(100), nullable=True)
    balance_usd = Column(Float, nullable=True, default=0.0)
    total_orders = Column(Integer, nullable=True, default=0)
    total_listings = Column(Integer, nullable=True, default=0)
    first_payment = Column(Boolean, default=False)
    brand_gtin = Column(String(100), nullable=True)
    dor = Column(String(150), nullable=True)
    bank_payoneer = Column(Text, nullable=True)
    winning_listing = Column(String(150), nullable=True)
    listing_strategy = Column(String(150), nullable=True)
    mark_status = Column(String(50), nullable=True, default="Active")
    mail = Column(String(150), nullable=True)
    mail_pass = Column(String(100), nullable=True)
    account_pass = Column(String(100), nullable=True)
    card_code = Column(String(100), nullable=True)
    authenticator_code = Column(String(100), nullable=True)
    support_file = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

