from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InventoryBase(BaseModel):
    product_name: str
    price: float = 0.0
    stock_quantity: int = 0
    sku: Optional[str] = None
    category: Optional[str] = None
    other_details: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    product_name: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    other_details: Optional[str] = None

class InventoryResponse(InventoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
