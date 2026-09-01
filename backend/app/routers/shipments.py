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

def get_user_allowed_companies(user: User) -> Optional[List[str]]:
    if not user or user.is_admin:
        return None
    if getattr(user, 'allowed_companies', None):
        return [c.strip() for c in user.allowed_companies.split(',') if c.strip()]
    if user.email == 'ops2@crm.com':
        return ['ADBH', 'Globle', 'Global']
    return None

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
    allowed_comps = get_user_allowed_companies(current_user)
    if allowed_comps:
        comp_orders = db.query(Order.id).filter(or_(*[Order.company.ilike(f"%{c}%") for c in allowed_comps])).all()
        comp_order_ids = [o[0] for o in comp_orders]
        query = query.filter(Shipment.order_id.in_(comp_order_ids))
    else:
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
    order = db.query(Order).filter(Order.id == ship_in.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Associated Order not found")

    allowed_comps = get_user_allowed_companies(current_user)
    if allowed_comps:
        comp_val = (order.company or "").strip().lower()
        if not any(c.lower() in comp_val for c in allowed_comps):
            raise HTTPException(
                status_code=403,
                detail=f"Not authorized to dispatch shipment for this company. Allowed: {', '.join(allowed_comps)}"
            )

    tracking_val = ship_in.tracking_id or ship_in.awb_number or ship_in.forwarding_number or order.shipment_id or f"TRK-{order.id}"
    
    # Calculate volumetric weight if dimensions are present
    vol_wt = ship_in.volumetric_weight or 0.0
    if not vol_wt and ship_in.length and ship_in.width and ship_in.height:
        vol_wt = round((ship_in.length * ship_in.width * ship_in.height) / 5000.0, 3)

    dim_str = ship_in.dimensions
    if not dim_str and (ship_in.length or ship_in.width or ship_in.height):
        dim_str = f"{ship_in.length or 0} × {ship_in.width or 0} × {ship_in.height or 0} cm"

    rate = ship_in.exchange_rate or 99.0
    label_usd = ship_in.label_cost_usd or 0.0
    label_inr = ship_in.label_cost_inr if ship_in.label_cost_inr is not None else round(label_usd * rate, 2)
    dump_usd = ship_in.dump_cost or 0.0
    dump_inr = round(dump_usd * rate, 2)

    # If RBS Online, calculate total shipment cost in INR: Domestic (₹) + Intl (₹) + Dump (converted to ₹) + Label (converted to ₹)
    ship_cost = ship_in.shipment_cost or 0.0
    if ship_in.shipment_partner == 'RBS Online' and not ship_cost:
        dom = ship_in.domestic_cost or 0.0
        intl = ship_in.international_cost or 0.0
        ship_cost = round(dom + intl + dump_inr + label_inr, 2)

    shipment = Shipment(
        order_id=ship_in.order_id,
        shipment_partner=ship_in.shipment_partner,
        tracking_id=tracking_val,
        awb_number=ship_in.awb_number,
        forwarding_number=ship_in.forwarding_number,
        product_name=ship_in.product_name or order.product_name,
        product_image=ship_in.product_image or getattr(order, 'product_image', None),
        weight=ship_in.weight or 0.0,
        dimensions=dim_str,
        length=ship_in.length or 0.0,
        width=ship_in.width or 0.0,
        height=ship_in.height or 0.0,
        volumetric_weight=vol_wt,
        domestic_cost=ship_in.domestic_cost or 0.0,
        international_cost=ship_in.international_cost or 0.0,
        dump_cost=ship_in.dump_cost or 0.0,
        label_cost_usd=label_usd,
        exchange_rate=rate,
        label_cost_inr=label_inr,
        shipment_cost=ship_cost,
        status="In Transit"
    )
    db.add(shipment)

    # Mark order status as Shipped and sync carrier info
    order.status = "Shipped"
    order.order_status = "Shipped"
    order.delivery_service = ship_in.shipment_partner
    if tracking_val:
        order.shipment_id = tracking_val
    if ship_cost:
        order.shipment_cost = ship_cost

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
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    if ship_in.shipment_partner is not None:
        shipment.shipment_partner = ship_in.shipment_partner
    if ship_in.tracking_id is not None:
        shipment.tracking_id = ship_in.tracking_id
    if ship_in.awb_number is not None:
        shipment.awb_number = ship_in.awb_number
    if ship_in.forwarding_number is not None:
        shipment.forwarding_number = ship_in.forwarding_number
    if ship_in.weight is not None:
        shipment.weight = ship_in.weight
    if ship_in.dimensions is not None:
        shipment.dimensions = ship_in.dimensions
    if ship_in.length is not None:
        shipment.length = ship_in.length
    if ship_in.width is not None:
        shipment.width = ship_in.width
    if ship_in.height is not None:
        shipment.height = ship_in.height
    if ship_in.volumetric_weight is not None:
        shipment.volumetric_weight = ship_in.volumetric_weight
    if ship_in.domestic_cost is not None:
        shipment.domestic_cost = ship_in.domestic_cost
    if ship_in.international_cost is not None:
        shipment.international_cost = ship_in.international_cost
    if ship_in.dump_cost is not None:
        shipment.dump_cost = ship_in.dump_cost
    if ship_in.label_cost_usd is not None:
        shipment.label_cost_usd = ship_in.label_cost_usd
    if ship_in.exchange_rate is not None:
        shipment.exchange_rate = ship_in.exchange_rate
    if ship_in.label_cost_inr is not None:
        shipment.label_cost_inr = ship_in.label_cost_inr
    elif ship_in.label_cost_usd is not None or ship_in.exchange_rate is not None:
        r = shipment.exchange_rate or 99.0
        u = shipment.label_cost_usd or 0.0
        shipment.label_cost_inr = round(u * r, 2)
    if ship_in.shipment_cost is not None:
        shipment.shipment_cost = ship_in.shipment_cost
    if ship_in.status is not None:
        shipment.status = ship_in.status
        order = db.query(Order).filter(Order.id == shipment.order_id).first()
        if order:
            order.status = ship_in.status
            order.order_status = ship_in.status

    db.commit()
    db.refresh(shipment)
    return shipment

@router.delete("/{shipment_id}")
def delete_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("shipments:write"))
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    db.delete(shipment)
    db.commit()
    return {"message": "Shipment deleted successfully"}
