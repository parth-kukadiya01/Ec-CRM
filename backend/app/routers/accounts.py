from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_user, check_permission
from app.models.account import Account
from app.models.user import User
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.get("", response_model=List[AccountResponse])
def list_accounts(
    search: Optional[str] = None,
    category: Optional[str] = None,
    skip: Optional[int] = Query(None, ge=0, description="Number of items to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Account)
    if category:
        query = query.filter(Account.category.ilike(category))
    if search:
        query = query.filter(
            (Account.account_name.ilike(f"%{search}%")) |
            (Account.gst_number.ilike(f"%{search}%")) |
            (Account.contact_person.ilike(f"%{search}%")) |
            (Account.contact_phone.ilike(f"%{search}%")) |
            (Account.contact_email.ilike(f"%{search}%")) |
            (Account.purchase_company.ilike(f"%{search}%"))
        )

    if page is not None and page_size is not None:
        skip = (page - 1) * page_size
        limit = page_size
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()

@router.post("", response_model=AccountResponse)
def create_account(
    acc_in: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("accounts:write"))
):
    acc = Account(
        account_name=acc_in.account_name,
        category=acc_in.category or "Company",
        account_type=acc_in.account_type or "Partner",
        marketplace=acc_in.marketplace,
        gst_number=acc_in.gst_number,
        bank_name=acc_in.bank_name,
        account_number=acc_in.account_number,
        ifsc_code=acc_in.ifsc_code,
        branch_name=acc_in.branch_name,
        contact_person=acc_in.contact_person,
        contact_phone=acc_in.contact_phone,
        contact_email=acc_in.contact_email,
        contact_address=acc_in.contact_address,
        city=acc_in.city,
        state=acc_in.state,
        pincode=acc_in.pincode,
        shipment_type=acc_in.shipment_type,
        purchase_company=acc_in.purchase_company,
        partner_type=acc_in.partner_type,
        partner_share_percentage=acc_in.partner_share_percentage or 0.0,
        notes=acc_in.notes,
        required_documents=acc_in.required_documents,
        uploaded_documents=acc_in.uploaded_documents,
        shipping_enabled=acc_in.shipping_enabled if acc_in.shipping_enabled is not None else True,
        default_shipping_partner=acc_in.default_shipping_partner or "FedEx Express",
        born_date=acc_in.born_date,
        user_name=acc_in.user_name,
        balance_usd=acc_in.balance_usd or 0.0,
        total_orders=acc_in.total_orders or 0,
        total_listings=acc_in.total_listings or 0,
        first_payment=acc_in.first_payment if acc_in.first_payment is not None else False,
        brand_gtin=acc_in.brand_gtin,
        dor=acc_in.dor,
        bank_payoneer=acc_in.bank_payoneer,
        winning_listing=acc_in.winning_listing,
        listing_strategy=acc_in.listing_strategy,
        mark_status=acc_in.mark_status or "Active",
        mail=acc_in.mail,
        mail_pass=acc_in.mail_pass,
        account_pass=acc_in.account_pass,
        card_code=acc_in.card_code,
        authenticator_code=acc_in.authenticator_code,
        support_file=acc_in.support_file,
        company_id=acc_in.company_id,
        partner_id=acc_in.partner_id
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc

@router.put("/{acc_id}", response_model=AccountResponse)
def update_account(
    acc_id: int,
    acc_in: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("accounts:write"))
):
    acc = db.query(Account).filter(Account.id == acc_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    if acc_in.account_name is not None:
        acc.account_name = acc_in.account_name
    if acc_in.category is not None:
        acc.category = acc_in.category
    if acc_in.account_type is not None:
        acc.account_type = acc_in.account_type
    if acc_in.marketplace is not None:
        acc.marketplace = acc_in.marketplace
    if acc_in.gst_number is not None:
        acc.gst_number = acc_in.gst_number
    if acc_in.bank_name is not None:
        acc.bank_name = acc_in.bank_name
    if acc_in.account_number is not None:
        acc.account_number = acc_in.account_number
    if acc_in.ifsc_code is not None:
        acc.ifsc_code = acc_in.ifsc_code
    if acc_in.branch_name is not None:
        acc.branch_name = acc_in.branch_name
    if acc_in.contact_person is not None:
        acc.contact_person = acc_in.contact_person
    if acc_in.contact_phone is not None:
        acc.contact_phone = acc_in.contact_phone
    if acc_in.contact_email is not None:
        acc.contact_email = acc_in.contact_email
    if acc_in.contact_address is not None:
        acc.contact_address = acc_in.contact_address
    if acc_in.city is not None:
        acc.city = acc_in.city
    if acc_in.state is not None:
        acc.state = acc_in.state
    if acc_in.pincode is not None:
        acc.pincode = acc_in.pincode
    if acc_in.shipment_type is not None:
        acc.shipment_type = acc_in.shipment_type
    if acc_in.purchase_company is not None:
        acc.purchase_company = acc_in.purchase_company
    if acc_in.partner_type is not None:
        acc.partner_type = acc_in.partner_type
    if acc_in.partner_share_percentage is not None:
        acc.partner_share_percentage = acc_in.partner_share_percentage
    if acc_in.notes is not None:
        acc.notes = acc_in.notes
    if acc_in.required_documents is not None:
        acc.required_documents = acc_in.required_documents
    if acc_in.uploaded_documents is not None:
        acc.uploaded_documents = acc_in.uploaded_documents
    if acc_in.shipping_enabled is not None:
        acc.shipping_enabled = acc_in.shipping_enabled
    if acc_in.default_shipping_partner is not None:
        acc.default_shipping_partner = acc_in.default_shipping_partner

    if acc_in.born_date is not None:
        acc.born_date = acc_in.born_date
    if acc_in.user_name is not None:
        acc.user_name = acc_in.user_name
    if acc_in.balance_usd is not None:
        acc.balance_usd = acc_in.balance_usd
    if acc_in.total_orders is not None:
        acc.total_orders = acc_in.total_orders
    if acc_in.total_listings is not None:
        acc.total_listings = acc_in.total_listings
    if acc_in.first_payment is not None:
        acc.first_payment = acc_in.first_payment
    if acc_in.brand_gtin is not None:
        acc.brand_gtin = acc_in.brand_gtin
    if acc_in.dor is not None:
        acc.dor = acc_in.dor
    if acc_in.bank_payoneer is not None:
        acc.bank_payoneer = acc_in.bank_payoneer
    if acc_in.winning_listing is not None:
        acc.winning_listing = acc_in.winning_listing
    if acc_in.listing_strategy is not None:
        acc.listing_strategy = acc_in.listing_strategy
    if acc_in.mark_status is not None:
        acc.mark_status = acc_in.mark_status
    if acc_in.mail is not None:
        acc.mail = acc_in.mail
    if acc_in.mail_pass is not None:
        acc.mail_pass = acc_in.mail_pass
    if acc_in.account_pass is not None:
        acc.account_pass = acc_in.account_pass
    if acc_in.card_code is not None:
        acc.card_code = acc_in.card_code
    if acc_in.authenticator_code is not None:
        acc.authenticator_code = acc_in.authenticator_code
    if acc_in.support_file is not None:
        acc.support_file = acc_in.support_file
    if acc_in.company_id is not None:
        acc.company_id = acc_in.company_id
    if acc_in.partner_id is not None:
        acc.partner_id = acc_in.partner_id

    db.commit()
    db.refresh(acc)
    return acc

@router.delete("/{acc_id}")
def delete_account(
    acc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("accounts:write"))
):
    acc = db.query(Account).filter(Account.id == acc_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    db.delete(acc)
    db.commit()
    return {"message": "Account deleted successfully"}
