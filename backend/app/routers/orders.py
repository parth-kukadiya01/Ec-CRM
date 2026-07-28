import random
import string
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.models.order import Order
from app.models.inventory import Inventory
from app.models.account import Account
from app.models.user import User
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse

router = APIRouter(prefix="/orders", tags=["Orders"])

def generate_order_number():
    date_str = datetime.utcnow().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"ORD-{date_str}-{random_str}"

@router.get("", response_model=List[OrderResponse])
def list_orders(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Order)
    
    # Filter by partner account if user is not superadmin and has an account assigned
    if not current_user.is_admin and current_user.account_name:
        query = query.filter(Order.account_name == current_user.account_name)

    if status_filter:
        query = query.filter(Order.status == status_filter)
    if search:
        query = query.filter(
            (Order.order_number.ilike(f"%{search}%")) |
            (Order.buyer_name.ilike(f"%{search}%")) |
            (Order.product_name.ilike(f"%{search}%"))
        )
    return query.order_by(Order.created_at.desc()).all()

@router.post("", response_model=OrderResponse)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Lookup inventory stock
    stock_available = False
    inventory_item = None

    if order_in.product_id:
        inventory_item = db.query(Inventory).filter(Inventory.id == order_in.product_id).first()
    else:
        # Search product by exact name
        inventory_item = db.query(Inventory).filter(Inventory.product_name.ilike(order_in.product_name)).first()

    if inventory_item and inventory_item.stock_quantity >= order_in.qty:
        stock_available = True

    # Account lookup if account_id supplied
    account_name = order_in.account_name
    if order_in.account_id and not account_name:
        acc = db.query(Account).filter(Account.id == order_in.account_id).first()
        if acc:
            account_name = acc.account_name

    # All new orders go to Purchase Department for review
    initial_status = "Pending Review"

    order = Order(
        order_number=generate_order_number(),
        order_date=order_in.order_date or date.today(),
        last_shipment_date=order_in.last_shipment_date,
        product_id=inventory_item.id if inventory_item else None,
        product_name=order_in.product_name,
        qty=order_in.qty,
        product_price=order_in.product_price,
        commission_price=order_in.commission_price,
        product_image=order_in.product_image,
        shipment_address_1=order_in.shipment_address_1,
        shipment_address_2=order_in.shipment_address_2,
        buyer_name=order_in.buyer_name,
        mobile_number=order_in.mobile_number,
        account_id=order_in.account_id,
        account_name=account_name,
        status=initial_status
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_in: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order_in.last_shipment_date is not None:
        order.last_shipment_date = order_in.last_shipment_date
    if order_in.qty is not None:
        order.qty = order_in.qty
    if order_in.product_price is not None:
        order.product_price = order_in.product_price
    if order_in.commission_price is not None:
        order.commission_price = order_in.commission_price
    if order_in.product_image is not None:
        order.product_image = order_in.product_image
    if order_in.shipment_address_1 is not None:
        order.shipment_address_1 = order_in.shipment_address_1
    if order_in.shipment_address_2 is not None:
        order.shipment_address_2 = order_in.shipment_address_2
    if order_in.buyer_name is not None:
        order.buyer_name = order_in.buyer_name
    if order_in.mobile_number is not None:
        order.mobile_number = order_in.mobile_number
    if order_in.status is not None:
        old_status = order.status
        order.status = order_in.status
        
        # When order is approved as Ready for Shipment from Purchase dept, deduct stock if available
        if order_in.status == "Ready for Shipment" and old_status != "Ready for Shipment":
            inv = None
            if order.product_id:
                inv = db.query(Inventory).filter(Inventory.id == order.product_id).first()
            else:
                inv = db.query(Inventory).filter(Inventory.product_name.ilike(order.product_name)).first()
            
            if inv and inv.stock_quantity >= order.qty:
                inv.stock_quantity -= order.qty

    db.commit()
    db.refresh(order)
    return order

@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    db.delete(order)
    db.commit()
    return {"message": "Order deleted successfully"}
