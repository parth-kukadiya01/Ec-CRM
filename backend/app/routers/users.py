from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.security import get_password_hash
from app.core.deps import get_current_user, get_current_admin, check_permission
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["Users & Employees"])

@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(User).all()

@router.post("", response_model=UserResponse)
def create_employee_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed_pw = get_password_hash(user_in.password)
    
    # Account lookup if account_id is supplied
    acc_name = user_in.account_name
    if user_in.account_id and not acc_name:
        from app.models.account import Account
        acc = db.query(Account).filter(Account.id == user_in.account_id).first()
        if acc:
            acc_name = acc.account_name

    user = User(
        email=user_in.email,
        password_hash=hashed_pw,
        full_name=user_in.full_name,
        phone=user_in.phone,
        role_id=user_in.role_id,
        is_admin=user_in.is_admin,
        is_partner=user_in.is_partner or False,
        account_id=user_in.account_id,
        account_name=acc_name,
        personal_details=user_in.personal_details,
        bank_name=user_in.bank_name,
        account_number=user_in.account_number,
        ifsc_code=user_in.ifsc_code,
        salary_summary=user_in.salary_summary
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Admin or the user themselves can update profile
    if not current_user.is_admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this profile")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # If regular employee (not admin), restrict fields they can change
    if not current_user.is_admin:
        if user_in.full_name is not None:
            user.full_name = user_in.full_name
        if user_in.phone is not None:
            user.phone = user_in.phone
        if user_in.personal_details is not None:
            user.personal_details = user_in.personal_details
        if user_in.password:
            user.password_hash = get_password_hash(user_in.password)
    else:
        # Admin can edit all fields
        if user_in.email is not None:
            user.email = user_in.email
        if user_in.full_name is not None:
            user.full_name = user_in.full_name
        if user_in.phone is not None:
            user.phone = user_in.phone
        if user_in.role_id is not None:
            user.role_id = user_in.role_id
        if user_in.is_admin is not None:
            user.is_admin = user_in.is_admin
        if user_in.is_active is not None:
            user.is_active = user_in.is_active
        if user_in.is_partner is not None:
            user.is_partner = user_in.is_partner
        if user_in.account_id is not None:
            user.account_id = user_in.account_id
            if user_in.account_id:
                from app.models.account import Account
                acc = db.query(Account).filter(Account.id == user_in.account_id).first()
                user.account_name = acc.account_name if acc else None
            else:
                user.account_name = None
        elif user_in.account_name is not None:
            user.account_name = user_in.account_name
        if user_in.personal_details is not None:
            user.personal_details = user_in.personal_details
        if user_in.bank_name is not None:
            user.bank_name = user_in.bank_name
        if user_in.account_number is not None:
            user.account_number = user_in.account_number
        if user_in.ifsc_code is not None:
            user.ifsc_code = user_in.ifsc_code
        if user_in.salary_summary is not None:
            user.salary_summary = user_in.salary_summary
        if user_in.password:
            user.password_hash = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin and db.query(User).filter(User.is_admin == True).count() <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the sole admin user")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
