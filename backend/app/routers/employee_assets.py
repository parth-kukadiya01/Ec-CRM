from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.deps import get_current_user, get_admin_or_manager
from app.models.user import User
from app.models.employee_asset import EmployeeAsset
from app.schemas.employee_asset import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter(prefix="/users/{user_id}/assets", tags=["Employee Assets"])


@router.get("", response_model=List[AssetResponse])
def list_assets(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_or_manager),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return db.query(EmployeeAsset).filter(EmployeeAsset.user_id == user_id).order_by(EmployeeAsset.created_at.desc()).all()


@router.post("", response_model=AssetResponse)
def create_asset(
    user_id: int,
    asset_in: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_or_manager),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = asset_in.model_dump()
    data["user_id"] = user_id

    asset = EmployeeAsset(**data)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    user_id: int,
    asset_id: int,
    asset_in: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_or_manager),
):
    asset = db.query(EmployeeAsset).filter(
        EmployeeAsset.id == asset_id,
        EmployeeAsset.user_id == user_id,
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = asset_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)

    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def delete_asset(
    user_id: int,
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_or_manager),
):
    asset = db.query(EmployeeAsset).filter(
        EmployeeAsset.id == asset_id,
        EmployeeAsset.user_id == user_id,
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted"}
