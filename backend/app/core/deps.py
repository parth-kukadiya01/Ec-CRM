from typing import Generator, Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import settings
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    return user

def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

def check_permission(permission_name: str):
    def permission_checker(current_user: User = Depends(get_current_user)):
        if current_user.is_admin:
            return current_user
        
        user_permissions = []
        if current_user.role and current_user.role.permissions:
            user_permissions = [p.name for p in current_user.role.permissions]
            
        if permission_name not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission_name}' is required to perform this action"
            )
        return current_user
    return permission_checker
