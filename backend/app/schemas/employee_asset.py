from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class AssetCreate(BaseModel):
    asset_name: str
    asset_type: str = "Other"
    serial_number: Optional[str] = None
    asset_value: Optional[str] = None
    assigned_date: Optional[date] = None
    return_date: Optional[date] = None
    condition: str = "Good"
    notes: Optional[str] = None

class AssetUpdate(BaseModel):
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None
    serial_number: Optional[str] = None
    asset_value: Optional[str] = None
    assigned_date: Optional[date] = None
    return_date: Optional[date] = None
    condition: Optional[str] = None
    notes: Optional[str] = None

class AssetResponse(BaseModel):
    id: int
    user_id: int
    asset_name: str
    asset_type: str
    serial_number: Optional[str] = None
    asset_value: Optional[str] = None
    assigned_date: Optional[date] = None
    return_date: Optional[date] = None
    condition: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
