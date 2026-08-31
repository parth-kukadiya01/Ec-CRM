import calendar
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.deps import get_current_admin
from app.models.user import User
from app.models.order import Order
from app.models.monthly_admin_cost import MonthlyAdminCost
from app.schemas.monthly_admin_cost import MonthlyAdminCostCreate, MonthlyAdminCostResponse
from app.core.admin_cost_sync import sync_admin_cost_share_for_month

router = APIRouter(prefix="/admin-costs", tags=["Admin Costs"])

def calculate_monthly_metrics(ac: MonthlyAdminCost, db: Session):
    try:
        year, month = map(int, ac.month.split("-"))
        _, last_day = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)
        
        total_orders = db.query(func.count(Order.id)).filter(
            Order.order_date >= start_date,
            Order.order_date <= end_date
        ).scalar() or 0
    except Exception:
        total_orders = 0

    cost_per_order = ac.admin_cost / total_orders if total_orders > 0 else 0.0
    
    return {
        "id": ac.id,
        "month": ac.month,
        "admin_cost": ac.admin_cost,
        "total_orders": total_orders,
        "cost_per_order": cost_per_order,
        "created_at": ac.created_at,
        "updated_at": ac.updated_at
    }

@router.get("", response_model=List[MonthlyAdminCostResponse])
def list_admin_costs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    costs = db.query(MonthlyAdminCost).order_by(MonthlyAdminCost.month.desc()).all()
    results = [calculate_monthly_metrics(c, db) for c in costs]
    return results

@router.post("", response_model=MonthlyAdminCostResponse)
def create_or_update_admin_cost(
    ac_in: MonthlyAdminCostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    # Validate format: YYYY-MM
    parts = ac_in.month.split("-")
    if len(parts) != 2 or not (parts[0].isdigit() and parts[1].isdigit()) or len(parts[0]) != 4 or len(parts[1]) != 2:
        raise HTTPException(status_code=400, detail="Month must be in YYYY-MM format")
        
    ac = db.query(MonthlyAdminCost).filter(MonthlyAdminCost.month == ac_in.month).first()
    if ac:
        ac.admin_cost = ac_in.admin_cost
    else:
        ac = MonthlyAdminCost(
            month=ac_in.month,
            admin_cost=ac_in.admin_cost
        )
        db.add(ac)
        
    db.commit()
    db.refresh(ac)
    sync_admin_cost_share_for_month(ac.month, db)
    return calculate_monthly_metrics(ac, db)

@router.delete("/{month}")
def delete_admin_cost(
    month: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    ac = db.query(MonthlyAdminCost).filter(MonthlyAdminCost.month == month).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Admin cost record not found")
        
    db.delete(ac)
    db.commit()
    sync_admin_cost_share_for_month(month, db)
    return {"message": f"Admin cost record for {month} deleted successfully"}
