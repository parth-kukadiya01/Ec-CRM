from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ShipmentCreate(BaseModel):
    order_id: int
    shipment_partner: str
    tracking_id: str
    product_name: str
    product_image: Optional[str] = None
    weight: float = 0.0
    shipment_cost: float = 0.0

class ShipmentUpdate(BaseModel):
    shipment_partner: Optional[str] = None
    tracking_id: Optional[str] = None
    weight: Optional[float] = None
    shipment_cost: Optional[float] = None
    status: Optional[str] = None

class ShipmentResponse(BaseModel):
    id: int
    order_id: int
    shipment_partner: str
    tracking_id: str
    product_name: str
    product_image: Optional[str] = None
    weight: float
    shipment_cost: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
