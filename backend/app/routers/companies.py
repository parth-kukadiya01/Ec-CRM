from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_user, check_permission
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse

router = APIRouter(prefix="/companies", tags=["Companies"])

@router.get("", response_model=List[CompanyResponse])
def list_companies(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Company)
    if search:
        query = query.filter(
            (Company.company_name.ilike(f"%{search}%")) |
            (Company.gst_number.ilike(f"%{search}%")) |
            (Company.contact_person.ilike(f"%{search}%")) |
            (Company.contact_email.ilike(f"%{search}%"))
        )
    return query.order_by(Company.company_name).all()

@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.post("", response_model=CompanyResponse)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("accounts:write"))
):
    company = Company(
        company_name=data.company_name,
        joining_date=data.joining_date,
        is_rbs=True,
        rbs_type="Debit",
        contact_person=data.contact_person,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email,
        bank_name=data.bank_name,
        account_number=data.account_number,
        ifsc_code=data.ifsc_code,
        branch_name=data.branch_name,
        address=data.address,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        bank_platform=data.bank_platform,
        virtual_account_no=data.virtual_account_no,
        routing_no=data.routing_no,
        accountant_name=data.accountant_name,
        bank_data=data.bank_data,
        account_mail=data.account_mail,
        notes=data.notes,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("accounts:write"))
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)

    company.rbs_type = "Debit"
    company.is_rbs = True
    db.commit()
    db.refresh(company)
    return company

@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("accounts:write"))
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    try:
        from app.models.account import Account
        # Unlink any accounts connected to this company
        db.query(Account).filter(Account.company_id == company_id).update({Account.company_id: None}, synchronize_session=False)

        db.delete(company)
        db.commit()
        return {"message": "Company deleted successfully", "id": company_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete company: {str(e)}")
