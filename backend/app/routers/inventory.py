from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_user, check_permission
from app.models.inventory import Inventory
from app.models.user import User
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse

from sqlalchemy import or_

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("", response_model=List[InventoryResponse])
def list_inventory(
    search: Optional[str] = None,
    partner_id: Optional[int] = None,
    skip: Optional[int] = Query(None, ge=0, description="Number of items to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("inventory:read"))
):
    query = db.query(Inventory)
    is_partner_user = current_user.is_partner or (current_user.role and current_user.role.name == "Channel Partner")

    if not current_user.is_admin and is_partner_user:
        filters = [Inventory.partner_id == current_user.id]
        if current_user.account_id:
            filters.append(Inventory.partner_id == current_user.account_id)
        if current_user.account_name:
            filters.append(Inventory.partner_name.ilike(f"%{current_user.account_name}%"))
        query = query.filter(or_(*filters))
    elif partner_id:
        query = query.filter(Inventory.partner_id == partner_id)

    if search:
        query = query.filter(Inventory.product_name.ilike(f"%{search}%"))

    if page is not None and page_size is not None:
        skip = (page - 1) * page_size
        limit = page_size
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()

@router.post("", response_model=InventoryResponse)
def create_inventory_item(
    item_in: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("inventory:write"))
):
    is_partner_user = current_user.is_partner or (current_user.role and current_user.role.name == "Channel Partner")
    if not current_user.is_admin and is_partner_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Channel Partners cannot add or edit inventory items.")
    partner_name = item_in.partner_name
    if item_in.partner_id:
        partner = db.query(User).filter(User.id == item_in.partner_id, User.is_partner == True).first()
        if not partner:
            raise HTTPException(status_code=404, detail="Selected Channel Partner account not found")
        if partner.onboarding_status != "Active":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add inventory for {partner.full_name or partner.email}. Onboarding stage is currently '{partner.onboarding_status or 'Draft'}'. Onboarding must reach 'Active' first."
            )
        partner_name = f"{partner.full_name or partner.email} ({partner.account_name or 'Store'})"

    item = Inventory(
        product_name=item_in.product_name,
        price=item_in.price,
        stock_quantity=item_in.stock_quantity,
        sku=item_in.sku,
        category=item_in.category,
        other_details=item_in.other_details,
        partner_id=item_in.partner_id,
        partner_name=partner_name,
        image_url=item_in.image_url
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
    current_user: User = Depends(check_permission("inventory:write"))
):
    is_partner_user = current_user.is_partner or (current_user.role and current_user.role.name == "Channel Partner")
    if not current_user.is_admin and is_partner_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Channel Partners cannot edit inventory items.")
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
    if item_in.image_url is not None:
        item.image_url = item_in.image_url

    if item_in.partner_id is not None:
        if item_in.partner_id == 0 or item_in.partner_id is None:
            item.partner_id = None
            item.partner_name = None
        else:
            partner = db.query(User).filter(User.id == item_in.partner_id, User.is_partner == True).first()
            if not partner:
                raise HTTPException(status_code=404, detail="Selected Channel Partner account not found")
            if partner.onboarding_status != "Active":
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot link inventory to {partner.full_name or partner.email}. Onboarding stage is currently '{partner.onboarding_status or 'Draft'}'. Onboarding must reach 'Active' first."
                )
            item.partner_id = partner.id
            item.partner_name = f"{partner.full_name or partner.email} ({partner.account_name or 'Store'})"
    elif item_in.partner_name is not None:
        item.partner_name = item_in.partner_name

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("inventory:write"))
):
    is_partner_user = current_user.is_partner or (current_user.role and current_user.role.name == "Channel Partner")
    if not current_user.is_admin and is_partner_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Channel Partners cannot delete inventory items.")
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    db.delete(item)
    db.commit()
    return {"message": "Inventory item deleted successfully"}
