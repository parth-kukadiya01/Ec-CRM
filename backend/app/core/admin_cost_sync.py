import calendar
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.monthly_admin_cost import MonthlyAdminCost
from app.models.order import Order

def sync_admin_cost_share_for_month(month: str, db: Session):
    """
    Recalculates the admin cost share per order for a given month (YYYY-MM),
    and updates the `admin_cost_share` field on all orders in that month.
    """
    try:
        parts = month.split("-")
        if len(parts) != 2 or not (parts[0].isdigit() and parts[1].isdigit()):
            return
        year, month_num = map(int, parts)
        _, last_day = calendar.monthrange(year, month_num)
        start_date = date(year, month_num, 1)
        end_date = date(year, month_num, last_day)
    except Exception:
        return

    # Find total number of orders in that month
    order_date_expr = func.coalesce(Order.order_process_date, Order.order_date)
    total_orders = db.query(func.count(Order.id)).filter(
        order_date_expr >= start_date,
        order_date_expr <= end_date
    ).scalar() or 0

    # Retrieve monthly admin cost configuration
    ac = db.query(MonthlyAdminCost).filter(MonthlyAdminCost.month == month).first()
    admin_cost = ac.admin_cost if ac else 0.0

    # Calculate cost share per order
    cost_per_order = round(admin_cost / total_orders, 2) if total_orders > 0 else 0.0

    # Update all orders in that month
    db.query(Order).filter(
        order_date_expr >= start_date,
        order_date_expr <= end_date
    ).update({Order.admin_cost_share: cost_per_order}, synchronize_session=False)
    db.commit()
