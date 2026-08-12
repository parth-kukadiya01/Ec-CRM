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
    if not current_user.is_admin and current_user.is_partner and current_user.account_name:
        query = query.filter(Purchase.account_name == current_user.account_name)
    
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

    purchase = Purchase(
        order_id=pur_in.order_id,
        order_date=pur_in.order_date or order.order_date,
        product_name=pur_in.product_name or order.product_name,
        purchase_value=pur_in.purchase_value,
        estimated_shipment_date=pur_in.estimated_shipment_date,
        account_name=pur_in.account_name or order.account_name,
        qty=pur_in.qty or order.qty,
        status="Pending"
    )
    db.add(purchase)
    
    # Update order status to "Purchased / Pending Delivery"
    order.status = "Purchased"

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

    if pur_in.purchase_value is not None:
        purchase.purchase_value = pur_in.purchase_value
    if pur_in.estimated_shipment_date is not None:
        purchase.estimated_shipment_date = pur_in.estimated_shipment_date
    if pur_in.account_name is not None:
        purchase.account_name = pur_in.account_name
    
    # If status is updated to "Received", add stock to Inventory & set Order to "Ready for Shipment"
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
