from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_current_user, check_permission
from app.models.partner import Partner
from app.models.user import User
from app.schemas.partner import PartnerCreate, PartnerUpdate, PartnerResponse

router = APIRouter(prefix="/partners-mgmt", tags=["Partners Management"])

@router.get("", response_model=List[PartnerResponse])
def list_partners(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Partner)
    if search:
        query = query.filter(
            (Partner.partner_name.ilike(f"%{search}%")) |
            (Partner.contact_person.ilike(f"%{search}%")) |
            (Partner.contact_email.ilike(f"%{search}%"))
        )
    return query.order_by(Partner.partner_name).all()

@router.get("/{partner_id}", response_model=PartnerResponse)
def get_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner

@router.post("", response_model=PartnerResponse)
def create_partner(
    data: PartnerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("accounts:write"))
):
    partner = Partner(
        partner_name=data.partner_name,
        joining_date=data.joining_date,
        partner_type=data.partner_type or "Service",
        partner_share_percentage=data.partner_share_percentage or 0.0,
        is_rbs=True,
        rbs_type="Credit",
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
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return partner

@router.put("/{partner_id}", response_model=PartnerResponse)
def update_partner(
    partner_id: int,
    data: PartnerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("accounts:write"))
):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(partner, key, value)

    partner.rbs_type = "Credit"
    partner.is_rbs = True
    db.commit()
    db.refresh(partner)
    return partner

@router.delete("/{partner_id}")
def delete_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("accounts:write"))
):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    try:
        from app.models.account import Account
        # Unlink any accounts connected to this partner
        db.query(Account).filter(Account.partner_id == partner_id).update({Account.partner_id: None}, synchronize_session=False)

        db.delete(partner)
        db.commit()
        return {"message": "Partner deleted successfully", "id": partner_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete partner: {str(e)}")
