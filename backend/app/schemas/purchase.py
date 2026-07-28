from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class PurchaseCreate(BaseModel):
    order_id: int
    order_date: Optional[date] = None
    product_name: str
    purchase_value: float = 0.0
    estimated_shipment_date: Optional[date] = None
    account_name: Optional[str] = None
    qty: int = 1

class PurchaseUpdate(BaseModel):
    purchase_value: Optional[float] = None
    estimated_shipment_date: Optional[date] = None
    account_name: Optional[str] = None
    status: Optional[str] = None

class PurchaseResponse(BaseModel):
    id: int
    order_id: int
    order_date: date
    product_name: str
    purchase_value: float
    estimated_shipment_date: Optional[date] = None
    account_name: Optional[str] = None
    qty: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
