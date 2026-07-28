from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.models.shipment import Shipment
from app.models.order import Order
from app.models.inventory import Inventory
from app.models.user import User
from app.schemas.shipment import ShipmentCreate, ShipmentUpdate, ShipmentResponse

router = APIRouter(prefix="/shipments", tags=["Shipments"])

@router.get("", response_model=List[ShipmentResponse])
def list_shipments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Shipment)
    if not current_user.is_admin and current_user.account_name:
        partner_order_ids = [o.id for o in db.query(Order).filter(Order.account_name == current_user.account_name).all()]
        query = query.filter(Shipment.order_id.in_(partner_order_ids))
    return query.order_by(Shipment.created_at.desc()).all()

@router.post("", response_model=ShipmentResponse)
def create_shipment(
    ship_in: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    current_user: User = Depends(get_current_user)
):
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
    current_user: User = Depends(get_current_user)
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    db.delete(shipment)
    db.commit()
    return {"message": "Shipment deleted successfully"}
