import random
import string
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user, check_permission
from app.models.order import Order
from app.models.inventory import Inventory
from app.models.account import Account
from app.models.user import User
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse
from app.core.admin_cost_sync import sync_admin_cost_share_for_month
from app.core.url_extractor import extract_product_info_from_url

router = APIRouter(prefix="/orders", tags=["Orders"])

def generate_order_number(db: Session = None):
    while True:
        date_str = datetime.utcnow().strftime("%Y%m%d")
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        ord_num = f"ORD-{date_str}-{random_str}"
        if db is None:
            return ord_num
        if not db.query(Order).filter(Order.order_number == ord_num).first():
            return ord_num

from sqlalchemy import or_, func

def populate_order_costs(orders, db: Session):
    is_list = isinstance(orders, list)
    orders_list = orders if is_list else [orders]
    
    for o in orders_list:
        p_cost = getattr(o, 'purchase_cost_inr', 0.0) or 0.0
        a_cost = getattr(o, 'admin_cost_share', 0.0) or 0.0
        o.total_order_cost_inr = p_cost + a_cost
        
    return orders

def get_user_allowed_companies(user: User) -> Optional[List[str]]:
    if not user or user.is_admin:
        return None
    if getattr(user, 'allowed_companies', None):
        return [c.strip() for c in user.allowed_companies.split(',') if c.strip()]
    if user.email == 'ops2@crm.com':
        return ['ADBH', 'Globle', 'Global']
    return None

@router.get("", response_model=List[OrderResponse])
def list_orders(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    skip: Optional[int] = Query(None, ge=0, description="Number of items to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("orders:read"))
):
    query = db.query(Order)
    
    # Filter by user allowed companies (e.g. User 2 ADBH & Global only)
    allowed_comps = get_user_allowed_companies(current_user)
    if allowed_comps:
        query = query.filter(or_(*[Order.company.ilike(f"%{c}%") for c in allowed_comps]))
    else:
        # Filter by specific company/account only if user is an external partner or assigned to a specific account
        is_partner_user = current_user.is_partner or (current_user.role and current_user.role.name == "Channel Partner")
        if not current_user.is_admin and (is_partner_user or current_user.account_name or current_user.account_id):
            comp_name = current_user.account_name
            if comp_name:
                query = query.filter(
                    (Order.company.ilike(f"%{comp_name}%")) |
                    (Order.account_name.ilike(f"%{comp_name}%")) |
                    (Order.seller_account.ilike(f"%{comp_name}%"))
                )
            elif current_user.account_id:
                query = query.filter(Order.account_id == current_user.account_id)

    if status_filter:
        query = query.filter(Order.status == status_filter)
    if search:
        query = query.filter(
            (Order.order_number.ilike(f"%{search}%")) |
            (Order.shipment_id.ilike(f"%{search}%")) |
            (Order.seller_account.ilike(f"%{search}%")) |
            (Order.company.ilike(f"%{search}%")) |
            (Order.consignee_name.ilike(f"%{search}%")) |
            (Order.product_name.ilike(f"%{search}%"))
        )
    
    query = query.order_by(Order.created_at.desc())

    if page is not None and page_size is not None:
        skip = (page - 1) * page_size
        limit = page_size
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    orders = query.all()
    populate_order_costs(orders, db)
    return orders

import re

def get_next_shipment_id(db: Session, offset: int = 0) -> str:
    orders = db.query(Order.shipment_id).filter(Order.shipment_id.isnot(None)).all()
    max_num = 0
    prefix = "INBTL"
    digits_len = 3

    for (s_id,) in orders:
        if s_id:
            match = re.search(r'^([A-Za-z\-_]+)(\d+)$', s_id.strip())
            if match:
                prefix = match.group(1)
                digits_len = max(digits_len, len(match.group(2)))
                num = int(match.group(2))
                if num > max_num:
                    max_num = num

    next_num = max_num + 1 + offset
    return f"{prefix}{str(next_num).zfill(digits_len)}"

def get_or_create_inventory_item(
    db: Session,
    product_name: str,
    price_usd: float = 0.0,
    seller_account: Optional[str] = None,
    image_url: Optional[str] = None
) -> Inventory:
    clean_name = product_name.strip() if product_name else ""
    if not clean_name:
        return None

    # Strict case-insensitive & trimmed search to prevent ANY duplicate product entries in database
    item = db.query(Inventory).filter(
        func.lower(func.trim(Inventory.product_name)) == clean_name.lower()
    ).first()

    if item:
        # If product already exists in database, update image_url if provided & missing
        if image_url and (not item.image_url or "unsplash" in item.image_url):
            item.image_url = image_url
            db.commit()
            db.refresh(item)
        return item

    # Product does NOT exist -> Create new unique Inventory item
    prefix_code = "".join(e for e in clean_name if e.isalnum())[:4].upper() or "ITEM"
    rand_suffix = random.randint(100, 999)
    sku_candidate = f"SKU-{prefix_code}-{rand_suffix}"
    while db.query(Inventory).filter(Inventory.sku == sku_candidate).first():
        rand_suffix = random.randint(1000, 9999)
        sku_candidate = f"SKU-{prefix_code}-{rand_suffix}"

    item = Inventory(
        product_name=clean_name,
        price=price_usd or 0.0,
        stock_quantity=0,
        sku=sku_candidate,
        category="General",
        partner_name=seller_account or "General",
        image_url=image_url or "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300"
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

from sqlalchemy.exc import IntegrityError

@router.post("", response_model=OrderResponse)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("orders:write"))
):
    inventory_item = None
    if order_in.product_id:
        inventory_item = db.query(Inventory).filter(Inventory.id == order_in.product_id).first()

    if not inventory_item and order_in.product_name:
        inventory_item = get_or_create_inventory_item(
            db=db,
            product_name=order_in.product_name,
            price_usd=order_in.price_usd or 0.0,
            seller_account=order_in.seller_account or order_in.company,
            image_url=order_in.product_image
        )

    account_id = order_in.account_id
    account_name = order_in.account_name

    allowed_comps = get_user_allowed_companies(current_user)
    if allowed_comps:
        comp_val = (order_in.company or "ADBH").strip().lower()
        if not any(c.lower() in comp_val for c in allowed_comps):
            raise HTTPException(
                status_code=403,
                detail=f"Not authorized to create orders for company '{order_in.company}'. Allowed: {', '.join(allowed_comps)}"
            )

    is_partner_user = current_user.is_partner or (current_user.role and current_user.role.name == "Channel Partner")
    if not current_user.is_admin and (is_partner_user or current_user.account_name or current_user.account_id):
        account_id = current_user.account_id
        account_name = current_user.account_name

    if account_id and not account_name:
        acc = db.query(Account).filter(Account.id == account_id).first()
        if acc:
            account_name = acc.account_name

    if order_in.order_number:
        order_num = order_in.order_number.strip()
        existing_order = db.query(Order).filter(Order.order_number == order_num).first()
        if existing_order:
            raise HTTPException(
                status_code=400,
                detail=f"Order ID '{order_num}' already exists. Please enter a unique Order ID."
            )
    else:
        order_num = generate_order_number(db)

    shipment_num = order_in.shipment_id or get_next_shipment_id(db)

    order = Order(
        order_number=order_num,
        order_process_date=order_in.order_process_date or date.today(),
        last_delivery_date=order_in.last_delivery_date,
        shipping_date=order_in.shipping_date,
        company=order_in.company or "ADBH",
        shipment_id=shipment_num,
        seller_account=order_in.seller_account,
        product_id=inventory_item.id if inventory_item else None,
        product_name=order_in.product_name,
        product_url=order_in.product_url,
        product_image=order_in.product_image or (inventory_item.image_url if inventory_item else None) or (extract_product_info_from_url(order_in.product_url).get("image_url") if order_in.product_url else None),
        qty=order_in.qty,
        product_price=getattr(order_in, 'product_price', None) or order_in.price_usd or 0.0,
        order_status=order_in.order_status or order_in.status or "ADBH",
        purchase_cost_inr=order_in.purchase_cost_inr or 0.0,
        arriving_date=order_in.arriving_date,
        consignee_name=order_in.consignee_name or "Consignee",
        shipment_address_1=order_in.shipment_address_1 or "",
        shipment_address_2=order_in.shipment_address_2 or "",
        city=order_in.city or "",
        state=order_in.state or "",
        zip_code=order_in.zip_code or "",
        mobile_number=order_in.mobile_number or "",
        country=order_in.country or "USA",
        account_id=account_id,
        account_name=account_name,
        status=order_in.status or "Pending",
        delivery_service=order_in.delivery_service,
        shipment_cost=order_in.shipment_cost or 0.0
    )
    try:
        db.add(order)
        db.commit()
        db.refresh(order)
    except IntegrityError as ex:
        db.rollback()
        err_msg = str(ex.orig) if hasattr(ex, 'orig') else str(ex)
        if "order_number" in err_msg or "UNIQUE" in err_msg.upper():
            detail_msg = f"Order with Order ID '{order_num}' already exists."
        else:
            detail_msg = f"Database integrity error: {err_msg}"
        raise HTTPException(
            status_code=400,
            detail=detail_msg
        )
    
    d = order.order_date or order.order_process_date or date.today()
    if d:
        sync_admin_cost_share_for_month(d.strftime("%Y-%m"), db)
        db.refresh(order)
        
    populate_order_costs(order, db)
    return order

import csv
import io
import re
from fastapi import UploadFile, File

def parse_date_flexible(val: Optional[str]) -> Optional[date]:
    if not val or not str(val).strip():
        return None
    cleaned = str(val).strip()
    for fmt in [
        "%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%m-%d-%Y",
        "%d/%m/%Y", "%d-%m-%Y", "%b %d %Y", "%b %d, %Y",
        "%B %d %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y",
        "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%m/%d/%Y %H:%M:%S"
    ]:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            pass
    return None

def normalize_key(k: str) -> str:
    return re.sub(r'[^a-z0-9]', '', str(k).lower().strip())

@router.post("/upload-csv")
async def upload_orders_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("orders:write"))
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported")

    content_bytes = await file.read()
    
    text = ""
    for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
        try:
            text = content_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue
            
    if not text:
        raise HTTPException(status_code=400, detail="Could not decode CSV file. Please upload a valid UTF-8 CSV.")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows or len(rows) < 2:
        raise HTTPException(status_code=400, detail="CSV file is empty or missing data rows.")

    header_row = rows[0]
    header_indices = {}
    
    KEY_MAPPINGS = {
        "order_number": ["ordernumber", "orderid", "orderno", "order", "ordernum", "amazonorderid", "id"],
        "order_process_date": ["orderprocessdate", "processdate", "orderdate", "date", "purchasedate"],
        "last_delivery_date": ["lastdeliverydate", "deliverydate", "deliverby", "latestdeliverydate", "expecteddeliverydate"],
        "shipping_date": ["shippingdate", "shipdate", "dateshipped", "dispatcheddate"],
        "company": ["company", "companyname", "sourcingagent"],
        "shipment_id": ["shipmentid", "shipmentnumber", "shipmentno", "awb", "trackingid"],
        "seller_account": ["selleraccount", "seller", "store", "account", "sellername", "merchant"],
        "product_name": ["productname", "product", "title", "itemname", "item", "description"],
        "product_url": ["producturl", "url", "link", "itemurl", "asinurl"],
        "product_image": ["productimage", "image", "imageurl", "img"],
        "qty": ["qty", "quantity", "quantitypurchased", "units", "count"],
        "price_usd": ["priceusd", "price", "productprice", "itemprice", "unitprice", "amount", "totalprice", "itemsubtotal"],
        "order_status": ["orderstatus", "carrierstatus", "stockstatus"],
        "p": ["p", "pflag", "priority"],
        "gst": ["gst", "gstname", "tax", "gsttype"],
        "consignee_name": ["consigneename", "consignee", "buyername", "buyer", "customername", "customer", "recipientname", "recipient", "name"],
        "shipment_address_1": ["shipmentaddress1", "address1", "shipaddress1", "streetaddress", "address", "street"],
        "shipment_address_2": ["shipmentaddress2", "address2", "shipaddress2", "apartment", "suite", "unit"],
        "city": ["city", "shipcity", "destinationcity"],
        "state": ["state", "shipstate", "destinationstate", "province", "region"],
        "zip_code": ["zipcode", "zip", "shipzip", "postalcode", "pincode"],
        "mobile_number": ["mobilenumber", "mobile", "phone", "phonenumber", "shipphone", "contactnumber"],
        "country": ["country", "shipcountry", "destinationcountry"],
        "status": ["status", "fulfillmentstatus"],
        "delivery_service": ["deliveryservice", "shippingpartner", "carrier", "shippingcarrier"],
        "shipment_cost": ["shipmentcost", "shippingcost", "shippingfee"],
        "purchase_cost_inr": ["purchasecostinr", "purchasecost", "cost", "cogs"],
        "oi": ["oi", "deliverycode", "purchasedeliverycode"],
        "arriving_date": ["arrivingdate", "arrivaldate", "estimatedarrival"]
    }

    for idx, col in enumerate(header_row):
        norm = normalize_key(col)
        for std_key, aliases in KEY_MAPPINGS.items():
            if norm in aliases or norm == std_key:
                header_indices[std_key] = idx
                break

    imported_orders = []
    skipped_count = 0
    months = set()
    
    acc_id = current_user.account_id if not current_user.is_admin else None
    acc_name = current_user.account_name if not current_user.is_admin else None

    for row_idx, row in enumerate(rows[1:], start=2):
        if not any(row):
            continue

        def get_val(key: str, default=None):
            idx = header_indices.get(key)
            if idx is not None and idx < len(row):
                val = row[idx].strip()
                return val if val else default
            return default

        order_num = get_val("order_number")
        if not order_num:
            order_num = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(10000, 99999)}"

        existing = db.query(Order).filter(Order.order_number == order_num).first()
        if existing:
            skipped_count += 1
            continue

        product_name = get_val("product_name", f"Imported Item #{row_idx}")
        consignee_name = get_val("consignee_name", "Valued Consignee")
        
        try:
            qty = int(float(get_val("qty", "1") or 1))
        except (ValueError, TypeError):
            qty = 1
            
        try:
            price_usd = float(get_val("price_usd", "0") or 0)
        except (ValueError, TypeError):
            price_usd = 0.0

        try:
            p_cost = float(get_val("purchase_cost_inr", "0") or 0)
        except (ValueError, TypeError):
            p_cost = 0.0

        try:
            s_cost = float(get_val("shipment_cost", "0") or 0)
        except (ValueError, TypeError):
            s_cost = 0.0

        p_flag_str = str(get_val("p", "false")).lower()
        p_flag = p_flag_str in ["true", "1", "yes", "y", "t"]

        process_date = parse_date_flexible(get_val("order_process_date")) or date.today()
        delivery_date = parse_date_flexible(get_val("last_delivery_date"))
        ship_date = parse_date_flexible(get_val("shipping_date"))

        seller_acc = get_val("seller_account", acc_name or "")
        company = get_val("company", "ADBH")
        shipment_num = get_val("shipment_id") or get_next_shipment_id(db, offset=len(imported_orders))
        product_image = get_val("product_image")

        inventory_item = get_or_create_inventory_item(
            db=db,
            product_name=product_name,
            price_usd=price_usd,
            seller_account=seller_acc or company,
            image_url=product_image
        )

        order = Order(
            order_number=order_num,
            order_process_date=process_date,
            last_delivery_date=delivery_date,
            shipping_date=ship_date,
            company=company,
            shipment_id=shipment_num,
            seller_account=seller_acc,
            product_id=inventory_item.id if inventory_item else None,
            product_name=product_name,
            product_url=get_val("product_url"),
            product_image=product_image or (inventory_item.image_url if inventory_item else None),
            qty=qty,
            product_price=price_usd,
            order_status=get_val("order_status", "ADBH"),
            purchase_cost_inr=p_cost,
            arriving_date=get_val("arriving_date"),
            consignee_name=consignee_name or "Consignee",
            shipment_address_1=get_val("shipment_address_1", "") or "",
            shipment_address_2=get_val("shipment_address_2", "") or "",
            city=get_val("city", "") or "",
            state=get_val("state", "") or "",
            zip_code=get_val("zip_code", "") or "",
            mobile_number=get_val("mobile_number", "") or "",
            country=get_val("country", "USA") or "USA",
            account_id=acc_id,
            account_name=acc_name,
            status=get_val("status", ""),
            delivery_service=get_val("delivery_service"),
            shipment_cost=s_cost
        )
        db.add(order)
        imported_orders.append(order)
        if process_date:
            months.add(process_date.strftime("%Y-%m"))

    db.commit()

    for m in months:
        sync_admin_cost_share_for_month(m, db)

    return {
        "success": True,
        "message": f"Imported {len(imported_orders)} orders successfully ({skipped_count} duplicates skipped).",
        "imported_count": len(imported_orders),
        "skipped_count": skipped_count
    }

@router.post("/bulk", response_model=List[OrderResponse])
def create_bulk_orders(
    orders_in: List[OrderCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("orders:write"))
):
    created_orders = []
    acc_id = current_user.account_id if not current_user.is_admin else None
    acc_name = current_user.account_name if not current_user.is_admin else None

    for idx, order_in in enumerate(orders_in):
        inventory_item = None
        if order_in.product_id:
            inventory_item = db.query(Inventory).filter(Inventory.id == order_in.product_id).first()
        if not inventory_item and order_in.product_name:
            inventory_item = get_or_create_inventory_item(
                db=db,
                product_name=order_in.product_name,
                price_usd=order_in.price_usd or 0.0,
                seller_account=order_in.seller_account or order_in.company,
                image_url=order_in.product_image
            )

        order_num = order_in.order_number or f"114-{random.randint(1000000, 9999999)}-{random.randint(1000000, 9999999)}"
        shipment_num = order_in.shipment_id or get_next_shipment_id(db, offset=idx)

        order = Order(
            order_number=order_num,
            order_process_date=order_in.order_process_date or date.today(),
            last_delivery_date=order_in.last_delivery_date,
            shipping_date=order_in.shipping_date,
            company=order_in.company,
            shipment_id=shipment_num,
            seller_account=order_in.seller_account or "",
            product_id=inventory_item.id if inventory_item else None,
            product_name=order_in.product_name or f"Item #{idx + 1}",
            product_url=order_in.product_url,
            product_image=order_in.product_image or (inventory_item.image_url if inventory_item else None),
            qty=order_in.qty or 1,
            product_price=getattr(order_in, 'product_price', None) or order_in.price_usd or 0.0,
            order_status=order_in.order_status or order_in.status or "ADBH",
            purchase_cost_inr=order_in.purchase_cost_inr or 0.0,
            arriving_date=order_in.arriving_date,
            consignee_name=order_in.consignee_name or "Consignee",
            shipment_address_1=order_in.shipment_address_1 or "",
            shipment_address_2=order_in.shipment_address_2 or "",
            city=order_in.city or "",
            state=order_in.state or "",
            zip_code=order_in.zip_code or "",
            mobile_number=order_in.mobile_number or "",
            country=order_in.country or "USA",
            account_id=acc_id or order_in.account_id,
            account_name=acc_name or order_in.account_name,
            status=order_in.status or "Pending",
            delivery_service=order_in.delivery_service,
            shipment_cost=order_in.shipment_cost or 0.0
        )
        db.add(order)
        created_orders.append(order)

    db.commit()
    
    months = set()
    for o in created_orders:
        db.refresh(o)
        d = o.order_date or o.order_process_date or date.today()
        if d:
            months.add(d.strftime("%Y-%m"))
            
    for m in months:
        sync_admin_cost_share_for_month(m, db)
        
    for o in created_orders:
        db.refresh(o)
        
    populate_order_costs(created_orders, db)
    return created_orders

def check_order_access(order: Order, current_user: User):
    if not current_user.is_admin:
        allowed_comps = get_user_allowed_companies(current_user)
        if allowed_comps:
            ord_comp = (order.company or "").strip().lower()
            if not any(c.lower() in ord_comp for c in allowed_comps):
                raise HTTPException(status_code=403, detail="Not authorized to access this company order")
        elif current_user.account_name:
            comp_name = current_user.account_name.strip().lower()
            ord_comp = (order.company or "").strip().lower()
            ord_acc = (order.account_name or "").strip().lower()
            if comp_name not in ord_comp and comp_name not in ord_acc:
                raise HTTPException(status_code=403, detail="Not authorized to access this company order")

@router.get("/extract-url-image")
def extract_url_image(
    url: str = Query(..., description="Product or Image URL to extract preview image from"),
    current_user: User = Depends(get_current_user)
):
    return extract_product_info_from_url(url)

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("orders:read"))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    check_order_access(order, current_user)
    populate_order_costs(order, db)
    return order

@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_in: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("orders:write"))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    check_order_access(order, current_user)

    old_date = order.order_date or order.order_process_date or date.today()
    old_month = old_date.strftime("%Y-%m") if old_date else None

    old_status = order.status

    for field, value in order_in.dict(exclude_unset=True).items():
        if field == "price_usd" and value is not None:
            order.product_price = value
        elif hasattr(order, field):
            setattr(order, field, value)

    if order_in.status is not None and order_in.status == "Ready to Ship" and old_status != "Ready to Ship":
        inv = None
        if order.product_id:
            inv = db.query(Inventory).filter(Inventory.id == order.product_id).first()
        else:
            inv = db.query(Inventory).filter(Inventory.product_name.ilike(order.product_name)).first()
        if inv:
            inv.stock_quantity = max(0, inv.stock_quantity - order.qty)

    db.commit()
    db.refresh(order)

    new_date = order.order_date or order.order_process_date or date.today()
    new_month = new_date.strftime("%Y-%m") if new_date else None

    if old_month:
        sync_admin_cost_share_for_month(old_month, db)
    if new_month and new_month != old_month:
        sync_admin_cost_share_for_month(new_month, db)

    db.refresh(order)
    populate_order_costs(order, db)
    return order

@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("orders:write"))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    check_order_access(order, current_user)

    d = order.order_date or order.order_process_date or date.today()
    month = d.strftime("%Y-%m") if d else None

    db.delete(order)
    db.commit()

    if month:
        sync_admin_cost_share_for_month(month, db)

    return {"message": "Order deleted successfully"}
