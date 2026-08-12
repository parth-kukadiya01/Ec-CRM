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
    skip: Optional[int] = Query(None, ge=0, description="Number of items to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Account)
    if search:
        query = query.filter(Account.account_name.ilike(f"%{search}%"))

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
        account_type=acc_in.account_type,
        bank_name=acc_in.bank_name,
        account_number=acc_in.account_number,
        ifsc_code=acc_in.ifsc_code,
        branch_name=acc_in.branch_name,
        notes=acc_in.notes,
        required_documents=acc_in.required_documents,
        shipping_enabled=acc_in.shipping_enabled if acc_in.shipping_enabled is not None else True,
        default_shipping_partner=acc_in.default_shipping_partner or "FedEx Express"
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
    if acc_in.account_type is not None:
        acc.account_type = acc_in.account_type
    if acc_in.bank_name is not None:
        acc.bank_name = acc_in.bank_name
    if acc_in.account_number is not None:
        acc.account_number = acc_in.account_number
    if acc_in.ifsc_code is not None:
        acc.ifsc_code = acc_in.ifsc_code
    if acc_in.branch_name is not None:
        acc.branch_name = acc_in.branch_name
    if acc_in.notes is not None:
        acc.notes = acc_in.notes
    if acc_in.required_documents is not None:
        acc.required_documents = acc_in.required_documents
    if acc_in.shipping_enabled is not None:
        acc.shipping_enabled = acc_in.shipping_enabled
    if acc_in.default_shipping_partner is not None:
        acc.default_shipping_partner = acc_in.default_shipping_partner

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
