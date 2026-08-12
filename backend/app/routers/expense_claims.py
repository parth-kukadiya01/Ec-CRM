from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.expense_claim import ExpenseClaim
from app.schemas.expense_claim import ExpenseClaimCreate, ExpenseClaimStatusUpdate, ExpenseClaimResponse

router = APIRouter(prefix="/expense-claims", tags=["Expense Claims"])

@router.post("", response_model=ExpenseClaimResponse)
def create_expense_claim(
    claim_in: ExpenseClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    claim = ExpenseClaim(
        user_id=current_user.id,
        title=claim_in.title,
        amount=claim_in.amount,
        category=claim_in.category,
        date=claim_in.date,
        receipt_image=claim_in.receipt_image,
        notes=claim_in.notes,
        status="Pending Review"
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    return ExpenseClaimResponse(
        id=claim.id,
        user_id=claim.user_id,
        user_full_name=current_user.full_name,
        user_email=current_user.email,
        title=claim.title,
        amount=claim.amount,
        category=claim.category,
        date=claim.date,
        status=claim.status,
        receipt_image=claim.receipt_image,
        notes=claim.notes,
        approval_proof=claim.approval_proof,
        created_at=claim.created_at
    )

@router.get("/my", response_model=List[ExpenseClaimResponse])
def get_my_expense_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    claims = db.query(ExpenseClaim).filter(ExpenseClaim.user_id == current_user.id).order_by(ExpenseClaim.created_at.desc()).all()
    res = []
    for c in claims:
        res.append(ExpenseClaimResponse(
            id=c.id,
            user_id=c.user_id,
            user_full_name=current_user.full_name,
            user_email=current_user.email,
            title=c.title,
            amount=c.amount,
            category=c.category,
            date=c.date,
            status=c.status,
            receipt_image=c.receipt_image,
            notes=c.notes,
            approval_proof=c.approval_proof,
            created_at=c.created_at
        ))
    return res

@router.get("", response_model=List[ExpenseClaimResponse])
def list_all_expense_claims(
    skip: Optional[int] = Query(None, ge=0, description="Number of items to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ExpenseClaim).order_by(ExpenseClaim.created_at.desc())

    if page is not None and page_size is not None:
        skip = (page - 1) * page_size
        limit = page_size
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    claims = query.all()
    res = []
    for c in claims:
        user_name = c.user.full_name if c.user else "Unknown"
        user_email = c.user.email if c.user else "Unknown"
        res.append(ExpenseClaimResponse(
            id=c.id,
            user_id=c.user_id,
            user_full_name=user_name,
            user_email=user_email,
            title=c.title,
            amount=c.amount,
            category=c.category,
            date=c.date,
            status=c.status,
            receipt_image=c.receipt_image,
            notes=c.notes,
            approval_proof=c.approval_proof,
            created_at=c.created_at
        ))
    return res

@router.put("/{claim_id}/status", response_model=ExpenseClaimResponse)
def update_expense_claim_status(
    claim_id: int,
    status_in: ExpenseClaimStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Expense claim not found")

    claim.status = status_in.status
    if status_in.notes is not None:
        user_notes = claim.notes or ""
        claim.notes = f"{user_notes} | Review Note: {status_in.notes}".strip(" | ")
    if status_in.approval_proof is not None:
        claim.approval_proof = status_in.approval_proof

    db.commit()
    db.refresh(claim)

    user_name = claim.user.full_name if claim.user else "Unknown"
    user_email = claim.user.email if claim.user else "Unknown"

    return ExpenseClaimResponse(
        id=claim.id,
        user_id=claim.user_id,
        user_full_name=user_name,
        user_email=user_email,
        title=claim.title,
        amount=claim.amount,
        category=claim.category,
        date=claim.date,
        status=claim.status,
        receipt_image=claim.receipt_image,
        notes=claim.notes,
        approval_proof=claim.approval_proof,
        created_at=claim.created_at
    )
