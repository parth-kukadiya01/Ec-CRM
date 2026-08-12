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
    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        if current_user.is_admin:
            return current_user
        
        role_name = ""
        user_permissions = []

        if current_user.role_id:
            from app.models.role import Role
            role_obj = db.query(Role).filter(Role.id == current_user.role_id).first()
            if role_obj:
                role_name = role_obj.name
                user_permissions = [p.name for p in role_obj.permissions]

        if not role_name and current_user.role:
            role_name = current_user.role.name
            if current_user.role.permissions:
                user_permissions = [p.name for p in current_user.role.permissions]

        # Role defaults
        if permission_name.startswith("inventory:") and role_name in ["Inventory Manager", "General Manager", "Operations Manager"]:
            return current_user
        if permission_name.startswith("purchases:") and role_name in ["Purchase Manager", "Inventory Manager"]:
            return current_user
        if permission_name.startswith("shipments:") and role_name in ["Shipment Manager", "Sales Executive", "Purchase Manager"]:
            return current_user
        if permission_name.startswith("orders:") and role_name in ["Purchase Manager", "Sales Executive", "Shipment Manager", "General Manager", "Operations Manager", "Channel Partner"]:
            return current_user

        if "*" in user_permissions or permission_name in user_permissions:
            return current_user

        if ":" in permission_name:
            module, action = permission_name.split(":", 1)
            if action == "read" and f"{module}:write" in user_permissions:
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission '{permission_name}' is required to perform this action"
        )
    return permission_checker

MANAGER_ROLES = ["General Manager", "Operations Manager"]

def get_admin_or_manager(current_user: User = Depends(get_current_user)) -> User:
    """Allow access to Admin, General Manager, and Operations Manager roles."""
    if current_user.is_admin:
        return current_user

    role_name = current_user.role.name if current_user.role else ""
    if role_name in MANAGER_ROLES:
        return current_user

    # Also check for employees:write permission
    if current_user.role and current_user.role.permissions:
        user_permissions = [p.name for p in current_user.role.permissions]
        if "*" in user_permissions or "employees:write" in user_permissions:
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin or Manager privileges required"
    )

