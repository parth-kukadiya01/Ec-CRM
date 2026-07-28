from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_user
from app.models.inventory import Inventory
from app.models.user import User
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("", response_model=List[InventoryResponse])
def list_inventory(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Inventory)
    if search:
        query = query.filter(Inventory.product_name.ilike(f"%{search}%"))
    return query.all()

@router.post("", response_model=InventoryResponse)
def create_inventory_item(
    item_in: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = Inventory(
        product_name=item_in.product_name,
        price=item_in.price,
        stock_quantity=item_in.stock_quantity,
        sku=item_in.sku,
        category=item_in.category,
        other_details=item_in.other_details
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(
    item_id: int,
    item_in: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if item_in.product_name is not None:
        item.product_name = item_in.product_name
    if item_in.price is not None:
        item.price = item_in.price
    if item_in.stock_quantity is not None:
        item.stock_quantity = item_in.stock_quantity
    if item_in.sku is not None:
        item.sku = item_in.sku
    if item_in.category is not None:
        item.category = item_in.category
    if item_in.other_details is not None:
        item.other_details = item_in.other_details

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    db.delete(item)
    db.commit()
    return {"message": "Inventory item deleted successfully"}
