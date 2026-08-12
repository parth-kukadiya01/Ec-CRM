from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.deps import get_current_user, get_admin_or_manager
from app.models.user import User
from app.models.employee_document import EmployeeDocument
from app.schemas.employee_document import DocumentCreate, DocumentUpdate, DocumentResponse

router = APIRouter(prefix="/users/{user_id}/documents", tags=["Employee Documents"])


def check_document_permission(target_user: User, current_user: User):
    if current_user.is_admin:
        return True
    # Allow internal staff employees to view/manage compliance documents for partner onboarding
    if target_user.is_partner and not current_user.is_partner:
        return True
    role_name = current_user.role.name if current_user.role else ""
    if role_name in ["General Manager", "Operations Manager"]:
        return True
    if current_user.id == target_user.id:
        return True
    if target_user.assigned_employee_id and target_user.assigned_employee_id == current_user.id:
        return True
    user_perms = [p.name for p in current_user.role.permissions] if current_user.role else []
    if "*" in user_perms or "employees:write" in user_perms or "employees:read" in user_perms:
        return True
    return False

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not check_document_permission(user, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view these documents")
    return db.query(EmployeeDocument).filter(EmployeeDocument.user_id == user_id).order_by(EmployeeDocument.uploaded_at.desc()).all()


@router.post("", response_model=DocumentResponse)
def create_document(
    user_id: int,
    doc_in: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not check_document_permission(user, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to upload documents for this user")

    data = doc_in.model_dump()
    data["user_id"] = user_id

    doc = EmployeeDocument(**data)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    user_id: int,
    document_id: int,
    doc_in: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not check_document_permission(user, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to update documents for this user")

    doc = db.query(EmployeeDocument).filter(
        EmployeeDocument.id == document_id,
        EmployeeDocument.user_id == user_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    update_data = doc_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doc, key, value)

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{document_id}")
def delete_document(
    user_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not check_document_permission(user, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete documents for this user")

    doc = db.query(EmployeeDocument).filter(
        EmployeeDocument.id == document_id,
        EmployeeDocument.user_id == user_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
