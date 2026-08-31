from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class PurchaseCreate(BaseModel):
    order_id: int
    order_date: Optional[date] = None
    product_name: str
    purchase_value: float = 0.0
    other_cost: float = 0.0
    extra_cost: float = 0.0
    delivery_code: Optional[str] = None
    estimated_shipment_date: Optional[date] = None
    account_name: Optional[str] = None
    purchase_partner_name: Optional[str] = None
    payment_status: Optional[str] = "Paid"
    notes: Optional[str] = None
    company: Optional[str] = None
    qty: int = 1
    sku: Optional[str] = None
    gst_type: Optional[str] = "GST"
    bank: Optional[str] = None
    po_number: Optional[str] = None

class PurchaseUpdate(BaseModel):
    purchase_value: Optional[float] = None
    other_cost: Optional[float] = None
    extra_cost: Optional[float] = None
    delivery_code: Optional[str] = None
    estimated_shipment_date: Optional[date] = None
    account_name: Optional[str] = None
    purchase_partner_name: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    sku: Optional[str] = None
    gst_type: Optional[str] = None
    bank: Optional[str] = None
    po_number: Optional[str] = None

class PurchaseResponse(BaseModel):
    id: int
    order_id: int
    order_date: date
    product_name: str
    purchase_value: float
    other_cost: float = 0.0
    extra_cost: float = 0.0
    delivery_code: Optional[str] = None
    estimated_shipment_date: Optional[date] = None
    account_name: Optional[str] = None
    purchase_partner_name: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None
    company: Optional[str] = None
    qty: int
    sku: Optional[str] = None
    gst_type: Optional[str] = "GST"
    bank: Optional[str] = None
    po_number: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
