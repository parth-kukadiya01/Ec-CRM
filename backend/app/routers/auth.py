from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, UserAuthResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login_json(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login/form", response_model=Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserAuthResponse)
def get_me(current_user: User = Depends(get_current_user)):
    permissions = []
    role_name = None
    if current_user.is_admin:
        role_name = "Super Admin"
        permissions = ["*"]
    elif current_user.role:
        role_name = current_user.role.name
        permissions = [p.name for p in current_user.role.permissions]

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_admin": current_user.is_admin,
        "is_partner": current_user.is_partner or False,
        "account_id": current_user.account_id,
        "account_name": current_user.account_name,
        "role_name": role_name,
        "permissions": permissions,
        "allowed_companies": current_user.allowed_companies
    }
