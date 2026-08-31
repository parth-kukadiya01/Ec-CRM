from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ShipmentCreate(BaseModel):
    order_id: int
    shipment_partner: str
    tracking_id: Optional[str] = None
    awb_number: Optional[str] = None
    forwarding_number: Optional[str] = None
    product_name: str
    product_image: Optional[str] = None
    weight: float = 0.0
    dimensions: Optional[str] = None
    length: Optional[float] = 0.0
    width: Optional[float] = 0.0
    height: Optional[float] = 0.0
    volumetric_weight: Optional[float] = 0.0
    domestic_cost: Optional[float] = 0.0
    international_cost: Optional[float] = 0.0
    dump_cost: Optional[float] = 0.0
    label_cost_usd: Optional[float] = 0.0
    exchange_rate: Optional[float] = 99.0
    label_cost_inr: Optional[float] = 0.0
    shipment_cost: float = 0.0

class ShipmentUpdate(BaseModel):
    shipment_partner: Optional[str] = None
    tracking_id: Optional[str] = None
    awb_number: Optional[str] = None
    forwarding_number: Optional[str] = None
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    volumetric_weight: Optional[float] = None
    domestic_cost: Optional[float] = None
    international_cost: Optional[float] = None
    dump_cost: Optional[float] = None
    label_cost_usd: Optional[float] = None
    exchange_rate: Optional[float] = None
    label_cost_inr: Optional[float] = None
    shipment_cost: Optional[float] = None
    status: Optional[str] = None

class ShipmentResponse(BaseModel):
    id: int
    order_id: int
    shipment_partner: str
    tracking_id: str
    awb_number: Optional[str] = None
    forwarding_number: Optional[str] = None
    product_name: str
    product_image: Optional[str] = None
    weight: float
    dimensions: Optional[str] = None
    length: Optional[float] = 0.0
    width: Optional[float] = 0.0
    height: Optional[float] = 0.0
    volumetric_weight: Optional[float] = 0.0
    domestic_cost: Optional[float] = 0.0
    international_cost: Optional[float] = 0.0
    dump_cost: Optional[float] = 0.0
    label_cost_usd: Optional[float] = 0.0
    exchange_rate: Optional[float] = 85.0
    label_cost_inr: Optional[float] = 0.0
    shipment_cost: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
