from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.security import get_password_hash
from app.core.deps import get_current_user, get_current_admin, check_permission
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["Users & Employees"])

@router.get("", response_model=List[UserResponse])
def list_users(
    skip: Optional[int] = Query(None, ge=0, description="Number of items to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_perms = [p.name for p in current_user.role.permissions] if current_user.role else []
    is_staff = not current_user.is_partner
    is_admin_or_manager = current_user.is_admin or '*' in user_perms or 'employees:read' in user_perms or is_staff

    if is_staff or is_admin_or_manager:
        query = db.query(User)
    else:
        query = db.query(User).filter(User.id == current_user.id)

    if page is not None and page_size is not None:
        skip = (page - 1) * page_size
        limit = page_size
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()

@router.post("", response_model=UserResponse)
def create_employee_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("employees:write"))
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

    # Assigned Employee lookup if assigned_employee_id is supplied
    emp_name = user_in.assigned_employee_name
    if user_in.assigned_employee_id and not emp_name:
        emp = db.query(User).filter(User.id == user_in.assigned_employee_id).first()
        if emp:
            emp_name = emp.full_name or emp.email

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
        assigned_employee_id=user_in.assigned_employee_id,
        assigned_employee_name=emp_name,
        onboarding_status=user_in.onboarding_status or "Draft",
        requires_shipping=user_in.requires_shipping if user_in.requires_shipping is not None else True,
        shipping_partner=user_in.shipping_partner or "FedEx Express",
        personal_details=user_in.personal_details,
        bank_name=user_in.bank_name,
        account_number=user_in.account_number,
        ifsc_code=user_in.ifsc_code,
        salary_summary=user_in.salary_summary,
        responsibilities=user_in.responsibilities
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-create High Priority Onboarding Task if user is partner and assigned to employee
    if user.is_partner and user.assigned_employee_id:
        try:
            from app.models.task import Task, TaskHistory
            last_task = db.query(Task).order_by(Task.id.desc()).first()
            next_id = (last_task.id + 1) if last_task else 1
            ticket_code = f"TASK-{100 + next_id}"

            task = Task(
                ticket_code=ticket_code,
                title=f"Complete Partner Onboarding: {user.full_name or user.email} ({acc_name or 'Marketplace Store'})",
                description=f"High Priority Task: Complete partner onboarding for {user.full_name or user.email} ({user.email}). Partner ID: {user.id}. Upload required compliance documents and approve onboarding.",
                assignee_id=user.assigned_employee_id,
                assigned_by_id=current_user.id,
                priority="High",
                status="To Do",
            )
            db.add(task)
            db.flush()

            creation_log = TaskHistory(
                task_id=task.id,
                user_id=current_user.id,
                action=f"Auto-generated High Priority Partner Onboarding task {ticket_code} for {emp_name}",
                notes=f"Partner: {user.full_name} ({acc_name or 'Marketplace'}). Priority set to High.",
            )
            db.add(creation_log)
            db.commit()
        except Exception as err:
            print(f"Error creating auto onboarding task: {err}")

    return user

@router.get("/me/profile", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the full profile of the currently authenticated user."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
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
    user_perms = [p.name for p in current_user.role.permissions] if current_user.role else []
    has_emp_write = current_user.is_admin or '*' in user_perms or 'employees:write' in user_perms
    is_self = current_user.id == user_id

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Assigned employee, partner, or any internal staff lead can update partner onboarding status and document details
    is_assigned_emp = user.assigned_employee_id == current_user.id
    is_staff_editing_partner = user.is_partner and not current_user.is_partner

    if not has_emp_write and not is_self and not is_assigned_emp and not is_staff_editing_partner:
        raise HTTPException(status_code=403, detail="Not authorized to edit this profile")

    # Partner details can be edited by Manager, assigned employee, staff lead, or user themselves
    if is_self or has_emp_write or is_assigned_emp or is_staff_editing_partner:
        if user_in.bank_name is not None:
            user.bank_name = user_in.bank_name
        if user_in.account_number is not None:
            user.account_number = user_in.account_number
        if user_in.ifsc_code is not None:
            user.ifsc_code = user_in.ifsc_code
        if user_in.onboarding_status is not None:
            # Verify mandatory compliance documents before advancing onboarding status
            if user.is_partner and user_in.onboarding_status in ['In Review', 'Active']:
                from app.models.employee_document import EmployeeDocument
                from app.models.account import Account
                import json

                mandatory_types = []
                acc = db.query(Account).filter(Account.id == user.account_id).first() if user.account_id else None
                if acc and acc.required_documents:
                    try:
                        reqs = json.loads(acc.required_documents)
                        if isinstance(reqs, list):
                            mandatory_types = [r['type'] for r in reqs if r.get('required')]
                    except Exception:
                        pass

                if mandatory_types:
                    uploaded_docs = db.query(EmployeeDocument).filter(EmployeeDocument.user_id == user.id).all()
                    uploaded_types = set(d.document_type for d in uploaded_docs)
                    missing = [t for t in mandatory_types if t not in uploaded_types]

                    if missing:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Cannot submit onboarding for verification! Mandatory compliance document(s) missing: {', '.join(missing)}. Please fill document numbers and attach files for all mandatory documents first."
                        )

            user.onboarding_status = user_in.onboarding_status
        if user_in.requires_shipping is not None:
            user.requires_shipping = user_in.requires_shipping
        if user_in.shipping_partner is not None:
            user.shipping_partner = user_in.shipping_partner

    # If regular employee (not manager), restrict fields they can change
    if not has_emp_write and not is_assigned_emp:
        if user_in.full_name is not None:
            user.full_name = user_in.full_name
        if user_in.phone is not None:
            user.phone = user_in.phone
        if user_in.personal_details is not None:
            user.personal_details = user_in.personal_details
        if user_in.password:
            user.password_hash = get_password_hash(user_in.password)
    else:
        # Manager / Admin / Assigned Employee can edit governance fields
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

        if user_in.assigned_employee_id is not None:
            user.assigned_employee_id = user_in.assigned_employee_id
            if user_in.assigned_employee_id:
                emp = db.query(User).filter(User.id == user_in.assigned_employee_id).first()
                user.assigned_employee_name = (emp.full_name if (emp and emp.full_name) else emp.email) if emp else None
            else:
                user.assigned_employee_name = None
        elif user_in.assigned_employee_name is not None:
            user.assigned_employee_name = user_in.assigned_employee_name

        if user_in.personal_details is not None:
            user.personal_details = user_in.personal_details
        if user_in.salary_summary is not None:
            user.salary_summary = user_in.salary_summary
        if user_in.responsibilities is not None:
            user.responsibilities = user_in.responsibilities
        if user_in.password:
            user.password_hash = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)

    # Auto-create or reassign High Priority Onboarding Task when partner is assigned to an employee
    # Auto-create or reassign High Priority Onboarding Task when partner is assigned to an employee
    if user.is_partner and user.assigned_employee_id:
        try:
            from app.models.task import Task, TaskHistory
            from sqlalchemy import or_

            # Find any existing onboarding task for this partner by Partner ID, email, or name
            task_filters = [
                Task.description.ilike(f"%Partner ID: {user.id}%"),
            ]
            if user.email:
                task_filters.append(Task.description.ilike(f"%{user.email}%"))
                task_filters.append(Task.title.ilike(f"%{user.email}%"))
            if user.full_name and len(user.full_name.strip()) > 2:
                task_filters.append(Task.title.ilike(f"%{user.full_name}%"))

            existing_task = db.query(Task).filter(or_(*task_filters)).order_by(Task.id.asc()).first()

            if existing_task:
                # ONLY update task if the assignee has actually changed
                if existing_task.assignee_id != user.assigned_employee_id:
                    existing_task.assignee_id = user.assigned_employee_id
                    existing_task.updated_at = datetime.utcnow()

                    reassign_log = TaskHistory(
                        task_id=existing_task.id,
                        user_id=current_user.id,
                        action=f"Reassigned partner onboarding task {existing_task.ticket_code} to {user.assigned_employee_name or 'new lead'}",
                        notes=f"Handed over onboarding task for {user.full_name or user.email} ({user.account_name or 'Marketplace'}).",
                    )
                    db.add(reassign_log)
                    db.commit()
            else:
                last_task = db.query(Task).order_by(Task.id.desc()).first()
                next_id = (last_task.id + 1) if last_task else 1
                ticket_code = f"TASK-{100 + next_id}"

                task = Task(
                    ticket_code=ticket_code,
                    title=f"Complete Partner Onboarding: {user.full_name or user.email} ({user.account_name or 'Marketplace Store'})",
                    description=f"High Priority Task: Complete partner onboarding for {user.full_name or user.email} ({user.email}). Partner ID: {user.id}. Upload required compliance documents, and approve onboarding.",
                    assignee_id=user.assigned_employee_id,
                    assigned_by_id=current_user.id,
                    priority="High",
                    status="To Do",
                )
                db.add(task)
                db.flush()

                creation_log = TaskHistory(
                    task_id=task.id,
                    user_id=current_user.id,
                    action=f"Auto-generated High Priority Partner Onboarding task {ticket_code} for {user.assigned_employee_name or 'lead'}",
                    notes=f"Partner: {user.full_name or user.email} ({user.account_name or 'Marketplace'}). Priority set to High.",
                )
                db.add(creation_log)
                db.commit()
        except Exception as err:
            print(f"Error updating auto onboarding task: {err}")

    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("employees:write"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin and db.query(User).filter(User.is_admin == True).count() <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the sole admin user")

    # Clean up dependent records to prevent integrity constraint failures
    from app.models.expense_claim import ExpenseClaim
    from app.models.employee_salary import EmployeeSalary
    from app.models.employee_asset import EmployeeAsset
    from app.models.employee_document import EmployeeDocument
    from app.models.task import Task, TaskHistory

    db.query(EmployeeSalary).filter(EmployeeSalary.user_id == user_id).delete(synchronize_session=False)
    db.query(EmployeeAsset).filter(EmployeeAsset.user_id == user_id).delete(synchronize_session=False)
    db.query(EmployeeDocument).filter(EmployeeDocument.user_id == user_id).delete(synchronize_session=False)
    db.query(ExpenseClaim).filter(ExpenseClaim.user_id == user_id).delete(synchronize_session=False)
    db.query(TaskHistory).filter(TaskHistory.user_id == user_id).delete(synchronize_session=False)

    db.query(Task).filter(Task.assignee_id == user_id).update({Task.assignee_id: None}, synchronize_session=False)
    db.query(Task).filter(Task.assigned_by_id == user_id).update({Task.assigned_by_id: None}, synchronize_session=False)

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
