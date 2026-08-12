from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user, check_permission
from app.models.shipment import Shipment
from app.models.order import Order
from app.models.inventory import Inventory
from app.models.user import User
from app.schemas.shipment import ShipmentCreate, ShipmentUpdate, ShipmentResponse

from sqlalchemy import or_

router = APIRouter(prefix="/shipments", tags=["Shipments"])

@router.get("", response_model=List[ShipmentResponse])
def list_shipments(
    skip: Optional[int] = Query(None, ge=0, description="Number of items to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("shipments:read"))
):
    query = db.query(Shipment)
    is_partner_user = current_user.is_partner or (current_user.role and current_user.role.name == "Channel Partner")

    if not current_user.is_admin and is_partner_user:
        filters = []
        if current_user.account_id:
            filters.append(Order.account_id == current_user.account_id)
        if current_user.account_name:
            filters.append(Order.account_name == current_user.account_name)
        filters.append(Order.account_id == current_user.id)
        if current_user.full_name:
            filters.append(Order.account_name == current_user.full_name)

        partner_orders = db.query(Order).filter(or_(*filters)).all()
        partner_order_ids = [o.id for o in partner_orders]
        query = query.filter(Shipment.order_id.in_(partner_order_ids))

    query = query.order_by(Shipment.created_at.desc())

    if page is not None and page_size is not None:
        skip = (page - 1) * page_size
        limit = page_size
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()

@router.post("", response_model=ShipmentResponse)
def create_shipment(
    ship_in: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("shipments:write"))
):
    is_shipment_manager = current_user.is_admin or (current_user.role and current_user.role.name == "Shipment Manager")
    if not is_shipment_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Shipment Manager has dispatch and write access to shipments.")

    order = db.query(Order).filter(Order.id == ship_in.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Associated Order not found")

    shipment = Shipment(
        order_id=ship_in.order_id,
        shipment_partner=ship_in.shipment_partner,
        tracking_id=ship_in.tracking_id,
        product_name=ship_in.product_name or order.product_name,
        product_image=ship_in.product_image or order.product_image,
        weight=ship_in.weight,
        shipment_cost=ship_in.shipment_cost,
        status="In Transit"
    )
    db.add(shipment)

    # Mark order status as Shipped
    order.status = "Shipped"

    db.commit()
    db.refresh(shipment)
    return shipment

@router.put("/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(
    shipment_id: int,
    ship_in: ShipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("shipments:write"))
):
    is_shipment_manager = current_user.is_admin or (current_user.role and current_user.role.name == "Shipment Manager")
    if not is_shipment_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Shipment Manager has dispatch and write access to shipments.")

    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    if ship_in.shipment_partner is not None:
        shipment.shipment_partner = ship_in.shipment_partner
    if ship_in.tracking_id is not None:
        shipment.tracking_id = ship_in.tracking_id
    if ship_in.weight is not None:
        shipment.weight = ship_in.weight
    if ship_in.shipment_cost is not None:
        shipment.shipment_cost = ship_in.shipment_cost
    if ship_in.status is not None:
        shipment.status = ship_in.status
        if ship_in.status == "Delivered":
            order = db.query(Order).filter(Order.id == shipment.order_id).first()
            if order:
                order.status = "Delivered"

    db.commit()
    db.refresh(shipment)
    return shipment

@router.delete("/{shipment_id}")
def delete_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("shipments:write"))
):
    is_shipment_manager = current_user.is_admin or (current_user.role and current_user.role.name == "Shipment Manager")
    if not is_shipment_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Shipment Manager has dispatch and write access to shipments.")

    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    db.delete(shipment)
    db.commit()
    return {"message": "Shipment deleted successfully"}
