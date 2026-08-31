from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class OrderCreate(BaseModel):
    order_number: Optional[str] = None
    order_process_date: Optional[date] = None
    last_delivery_date: Optional[date] = None
    shipping_date: Optional[date] = None

    company: Optional[str] = "ADBH"
    shipment_id: Optional[str] = None
    seller_account: Optional[str] = None

    product_id: Optional[int] = None
    product_name: str
    product_url: Optional[str] = None
    product_image: Optional[str] = None
    qty: int = 1
    price_usd: float = 0.0
    order_status: Optional[str] = "ADBH"
    purchase_cost_inr: Optional[float] = 0.0
    oi: Optional[str] = None
    arriving_date: Optional[str] = None

    consignee_name: Optional[str] = None
    shipment_address_1: Optional[str] = None
    shipment_address_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    mobile_number: Optional[str] = None
    country: Optional[str] = "USA"

    account_id: Optional[int] = None
    account_name: Optional[str] = None
    status: Optional[str] = None
    delivery_service: Optional[str] = None
    shipment_cost: Optional[float] = 0.0

class OrderUpdate(BaseModel):
    order_process_date: Optional[date] = None
    last_delivery_date: Optional[date] = None
    shipping_date: Optional[date] = None
    company: Optional[str] = None
    shipment_id: Optional[str] = None
    seller_account: Optional[str] = None
    product_name: Optional[str] = None
    product_url: Optional[str] = None
    product_image: Optional[str] = None
    qty: Optional[int] = None
    price_usd: Optional[float] = None
    order_status: Optional[str] = None
    purchase_cost_inr: Optional[float] = None
    oi: Optional[str] = None
    arriving_date: Optional[str] = None
    consignee_name: Optional[str] = None
    shipment_address_1: Optional[str] = None
    shipment_address_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    mobile_number: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None
    delivery_service: Optional[str] = None
    shipment_cost: Optional[float] = None

class OrderResponse(BaseModel):
    id: int
    order_number: Optional[str] = None
    order_process_date: Optional[date] = None
    last_delivery_date: Optional[date] = None
    shipping_date: Optional[date] = None

    company: Optional[str] = "ADBH"
    shipment_id: Optional[str] = None
    seller_account: Optional[str] = None

    product_id: Optional[int] = None
    product_name: str
    product_url: Optional[str] = None
    product_image: Optional[str] = None
    qty: int = 1
    price_usd: float = 0.0
    order_status: Optional[str] = "ADBH"
    p: Optional[bool] = False
    purchase_cost_inr: Optional[float] = 0.0
    oi: Optional[str] = None
    arriving_date: Optional[str] = None
    gst: Optional[str] = None

    consignee_name: Optional[str] = None
    shipment_address_1: Optional[str] = None
    shipment_address_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    mobile_number: Optional[str] = None
    country: Optional[str] = "USA"

    account_id: Optional[int] = None
    account_name: Optional[str] = None
    status: str = ""
    delivery_service: Optional[str] = None
    shipment_cost: Optional[float] = 0.0
    created_at: datetime
    admin_cost_share: Optional[float] = 0.0
    total_order_cost_inr: Optional[float] = 0.0

    class Config:
        from_attributes = True

