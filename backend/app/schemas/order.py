from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class OrderCreate(BaseModel):
    order_date: Optional[date] = None
    last_shipment_date: Optional[date] = None
    product_id: Optional[int] = None
    product_name: str
    qty: int = 1
    product_price: float = 0.0
    commission_price: float = 0.0
    product_image: Optional[str] = None
    shipment_address_1: str
    shipment_address_2: Optional[str] = None
    buyer_name: str
    mobile_number: str
    account_id: Optional[int] = None
    account_name: Optional[str] = None

class OrderUpdate(BaseModel):
    last_shipment_date: Optional[date] = None
    qty: Optional[int] = None
    product_price: Optional[float] = None
    commission_price: Optional[float] = None
    product_image: Optional[str] = None
    shipment_address_1: Optional[str] = None
    shipment_address_2: Optional[str] = None
    buyer_name: Optional[str] = None
    mobile_number: Optional[str] = None
    status: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    order_number: str
    order_date: date
    last_shipment_date: Optional[date] = None
    product_id: Optional[int] = None
    product_name: str
    qty: int
    product_price: float
    commission_price: float
    product_image: Optional[str] = None
    shipment_address_1: str
    shipment_address_2: Optional[str] = None
    buyer_name: str
    mobile_number: str
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
