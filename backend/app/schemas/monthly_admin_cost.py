from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MonthlyAdminCostBase(BaseModel):
    month: str # Format: YYYY-MM
    admin_cost: float

class MonthlyAdminCostCreate(MonthlyAdminCostBase):
    pass

class MonthlyAdminCostUpdate(BaseModel):
    admin_cost: float

class MonthlyAdminCostResponse(MonthlyAdminCostBase):
    id: int
    total_orders: int = 0
    cost_per_order: float = 0.0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
