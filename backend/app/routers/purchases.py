from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user, check_permission
from app.models.purchase import Purchase
from app.models.order import Order
from app.models.inventory import Inventory
from app.models.user import User
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate, PurchaseResponse

router = APIRouter(prefix="/purchases", tags=["Purchases"])

from sqlalchemy import or_

def get_user_allowed_companies(user: User) -> Optional[List[str]]:
    if not user or user.is_admin:
        return None
    if getattr(user, 'allowed_companies', None):
        return [c.strip() for c in user.allowed_companies.split(',') if c.strip()]
    if user.email == 'ops2@crm.com':
        return ['ADBH', 'Globle', 'Global']
    return None

@router.get("", response_model=List[PurchaseResponse])
def list_purchases(
    skip: Optional[int] = Query(None, ge=0, description="Number of items to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("purchases:read"))
):
    query = db.query(Purchase)
    allowed_comps = get_user_allowed_companies(current_user)
    if allowed_comps:
        query = query.filter(or_(*[Purchase.company.ilike(f"%{c}%") for c in allowed_comps]))
    elif not current_user.is_admin and current_user.account_name:
        comp_name = current_user.account_name
        query = query.filter(
            (Purchase.account_name.ilike(f"%{comp_name}%")) |
            (Purchase.company.ilike(f"%{comp_name}%"))
        )
    
    query = query.order_by(Purchase.created_at.desc())

    if page is not None and page_size is not None:
        skip = (page - 1) * page_size
        limit = page_size
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()

@router.post("", response_model=PurchaseResponse)
def create_purchase(
    pur_in: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("purchases:write"))
):
    order = db.query(Order).filter(Order.id == pur_in.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Associated Order not found")

    allowed_comps = get_user_allowed_companies(current_user)
    if allowed_comps:
        comp_val = (pur_in.company or order.company or "").strip().lower()
        if not any(c.lower() in comp_val for c in allowed_comps):
            raise HTTPException(
                status_code=403,
                detail=f"Not authorized to purchase for this company. Allowed: {', '.join(allowed_comps)}"
            )

    purchase = Purchase(
        order_id=pur_in.order_id,
        order_date=pur_in.order_date or getattr(order, 'order_process_date', None) or getattr(order, 'order_date', date.today()),
        product_name=pur_in.product_name or order.product_name,
        sku=pur_in.sku,
        gst_type=pur_in.gst_type or "GST",
        bank=pur_in.bank,
        po_number=pur_in.po_number,
        purchase_value=pur_in.purchase_value,
        other_cost=pur_in.other_cost or 0.0,
        extra_cost=pur_in.extra_cost or 0.0,
        delivery_code=pur_in.delivery_code or order.oi or order.shipment_id,
        estimated_shipment_date=pur_in.estimated_shipment_date,
        account_name=pur_in.account_name or order.account_name,
        purchase_partner_name=pur_in.purchase_partner_name or pur_in.account_name,
        payment_status=pur_in.payment_status or "Paid",
        notes=pur_in.notes,
        company=pur_in.company or order.company,
        qty=pur_in.qty or order.qty,
        status="Purchased"
    )
    db.add(purchase)
    
    # Sync costs & delivery code back to Order
    if pur_in.purchase_value:
        order.purchase_cost_inr = pur_in.purchase_value + (pur_in.other_cost or 0.0) + (pur_in.extra_cost or 0.0)
    if pur_in.delivery_code:
        order.oi = pur_in.delivery_code
    order.status = "Purchased"

    # Store excess quantity into Inventory for future orders
    purchased_qty = pur_in.qty or order.qty or 1
    order_needed_qty = order.qty or 1
    excess_qty = max(0, purchased_qty - order_needed_qty)

    inv = None
    if order.product_id:
        inv = db.query(Inventory).filter(Inventory.id == order.product_id).first()
    if not inv and pur_in.sku:
        inv = db.query(Inventory).filter(Inventory.sku == pur_in.sku).first()
    if not inv and (pur_in.product_name or order.product_name):
        p_name = (pur_in.product_name or order.product_name).strip()
        inv = db.query(Inventory).filter(Inventory.product_name.ilike(p_name)).first()

    if inv:
        if pur_in.sku and not inv.sku:
            inv.sku = pur_in.sku
        if excess_qty > 0:
            inv.stock_quantity = (inv.stock_quantity or 0) + excess_qty
        order.product_id = inv.id
    else:
        import random
        prefix_code = "".join(e for e in (pur_in.product_name or order.product_name) if e.isalnum())[:4].upper() or "ITEM"
        rand_suffix = random.randint(100, 999)
        sku_candidate = pur_in.sku or f"SKU-{prefix_code}-{rand_suffix}"
        inv = Inventory(
            product_name=pur_in.product_name or order.product_name,
            sku=sku_candidate,
            stock_quantity=excess_qty,
            price=order.price_usd or pur_in.purchase_value or 0.0,
            partner_name=pur_in.purchase_partner_name or order.seller_account or "General",
            category="General"
        )
        db.add(inv)
        db.flush()
        order.product_id = inv.id

    db.commit()
    db.refresh(purchase)
    return purchase

@router.put("/{purchase_id}", response_model=PurchaseResponse)
def update_purchase(
    purchase_id: int,
    pur_in: PurchaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("purchases:write"))
):
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    if pur_in.sku is not None:
        purchase.sku = pur_in.sku
    if pur_in.gst_type is not None:
        purchase.gst_type = pur_in.gst_type
    if pur_in.bank is not None:
        purchase.bank = pur_in.bank
    if pur_in.po_number is not None:
        purchase.po_number = pur_in.po_number
    if pur_in.purchase_value is not None:
        purchase.purchase_value = pur_in.purchase_value
    if pur_in.other_cost is not None:
        purchase.other_cost = pur_in.other_cost
    if pur_in.extra_cost is not None:
        purchase.extra_cost = pur_in.extra_cost
    if pur_in.delivery_code is not None:
        purchase.delivery_code = pur_in.delivery_code
    if pur_in.estimated_shipment_date is not None:
        purchase.estimated_shipment_date = pur_in.estimated_shipment_date
    if pur_in.account_name is not None:
        purchase.account_name = pur_in.account_name
    if pur_in.purchase_partner_name is not None:
        purchase.purchase_partner_name = pur_in.purchase_partner_name
    if pur_in.payment_status is not None:
        purchase.payment_status = pur_in.payment_status
    if pur_in.notes is not None:
        purchase.notes = pur_in.notes
    if pur_in.company is not None:
        purchase.company = pur_in.company

    # Sync back to associated Order
    order = db.query(Order).filter(Order.id == purchase.order_id).first()
    if order:
        if purchase.purchase_value:
            order.purchase_cost_inr = purchase.purchase_value
        if purchase.delivery_code:
            order.oi = purchase.delivery_code
    
    # If status is updated to "Received", add stock to Inventory & set Order to
    if pur_in.status is not None:
        previous_status = purchase.status
        purchase.status = pur_in.status

        if ("Received" in pur_in.status) and ("Received" not in (previous_status or "")):
            order = db.query(Order).filter(Order.id == purchase.order_id).first()
            if order:
                # Update inventory stock
                inv = None
                if order.product_id:
                    inv = db.query(Inventory).filter(Inventory.id == order.product_id).first()
                else:
                    inv = db.query(Inventory).filter(Inventory.product_name.ilike(order.product_name)).first()

                if inv:
                    inv.stock_quantity += purchase.qty
                else:
                    # Create new inventory entry if it doesn't exist yet
                    inv = Inventory(
                        product_name=order.product_name,
                        price=order.product_price,
                        stock_quantity=purchase.qty
                    )
                    db.add(inv)
                    db.flush()
                    order.product_id = inv.id

                # Now order has enough stock
                order.status = "Ready to Ship"

    db.commit()
    db.refresh(purchase)
    return purchase

@router.delete("/{purchase_id}")
def delete_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("purchases:write"))
):
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    db.delete(purchase)
    db.commit()
    return {"message": "Purchase deleted successfully"}
