from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.database import get_db
from app.core.deps import get_current_user, get_admin_or_manager
from app.models.user import User
from app.models.employee_salary import EmployeeSalary
from app.schemas.employee_salary import SalaryCreate, SalaryUpdate, SalaryResponse

router = APIRouter(prefix="/users/{user_id}/salary", tags=["Employee Salary"])


def _calc_net(data: dict) -> float:
    base = data.get("base_salary", 0) or 0
    hra = data.get("hra", 0) or 0
    da = data.get("da", 0) or 0
    special = data.get("special_allowance", 0) or 0
    bonus = data.get("bonus", 0) or 0
    deductions = data.get("deductions", 0) or 0
    return base + hra + da + special + bonus - deductions


@router.get("", response_model=List[SalaryResponse])
def list_salary(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_or_manager),
):
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return db.query(EmployeeSalary).filter(EmployeeSalary.user_id == user_id).order_by(EmployeeSalary.effective_from.desc()).all()


@router.post("", response_model=SalaryResponse)
def create_salary(
    user_id: int,
    salary_in: SalaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_or_manager),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = salary_in.model_dump()
    data["user_id"] = user_id
    data["net_salary"] = data.get("net_salary") or _calc_net(data)
    if not data.get("effective_from"):
        data["effective_from"] = date.today()

    # Mark previous active salary as Revised
    db.query(EmployeeSalary).filter(
        EmployeeSalary.user_id == user_id,
        EmployeeSalary.status == "Active",
    ).update({"status": "Revised"})

    salary = EmployeeSalary(**data)
    db.add(salary)
    db.commit()
    db.refresh(salary)
    return salary


@router.put("/{salary_id}", response_model=SalaryResponse)
def update_salary(
    user_id: int,
    salary_id: int,
    salary_in: SalaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_or_manager),
):
    salary = db.query(EmployeeSalary).filter(
        EmployeeSalary.id == salary_id,
        EmployeeSalary.user_id == user_id,
    ).first()
    if not salary:
        raise HTTPException(status_code=404, detail="Salary record not found")

    update_data = salary_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(salary, key, value)

    # Recalculate net salary
    salary.net_salary = _calc_net({
        "base_salary": salary.base_salary,
        "hra": salary.hra,
        "da": salary.da,
        "special_allowance": salary.special_allowance,
        "bonus": salary.bonus,
        "deductions": salary.deductions,
    })

    db.commit()
    db.refresh(salary)
    return salary


@router.delete("/{salary_id}")
def delete_salary(
    user_id: int,
    salary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_or_manager),
):
    salary = db.query(EmployeeSalary).filter(
        EmployeeSalary.id == salary_id,
        EmployeeSalary.user_id == user_id,
    ).first()
    if not salary:
        raise HTTPException(status_code=404, detail="Salary record not found")
    db.delete(salary)
    db.commit()
    return {"message": "Salary record deleted"}
