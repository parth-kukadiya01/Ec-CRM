from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, date, timedelta
from typing import Optional
from app.database import get_db
from app.core.deps import get_current_admin
from app.models.user import User
from app.models.order import Order
from app.models.purchase import Purchase
from app.models.shipment import Shipment
from app.models.employee_salary import EmployeeSalary
from app.models.expense_claim import ExpenseClaim
from app.models.account import Account

router = APIRouter(prefix="/finance", tags=["Finance"])


def _get_date_filter(period: str) -> Optional[date]:
    """Return the start date for the given period filter."""
    today = date.today()
    if period == "today":
        return today
    elif period == "week":
        return today - timedelta(days=today.weekday())  # Monday of current week
    elif period == "month":
        return today.replace(day=1)
    elif period == "year":
        return today.replace(month=1, day=1)
    return None  # 'all'


@router.get("/summary")
def get_finance_summary(
    period: str = Query("all", pattern="^(today|week|month|year|all)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Returns aggregated financial summary.
    Admin-only endpoint.
    """
    start_date = _get_date_filter(period)

    # ── Revenue from Orders ──
    orders_query = db.query(Order)
    if start_date:
        orders_query = orders_query.filter(func.coalesce(Order.order_process_date, Order.order_date) >= start_date)
    orders = orders_query.all()

    total_revenue = sum(((o.price_usd or o.product_price or 0.0) * (o.qty or 1)) for o in orders)
    total_commission = sum((o.commission_price or 0.0) * (o.qty or 1) for o in orders)
    total_orders_count = len(orders)

    # ── Purchases (COGS) ──
    purchases_query = db.query(Purchase)
    if start_date:
        purchases_query = purchases_query.filter(Purchase.order_date >= start_date)
    purchases = purchases_query.all()

    total_purchases = sum((p.purchase_value or 0) * (p.qty or 1) for p in purchases)
    total_purchases_count = len(purchases)

    # ── Shipment Costs ──
    shipments_query = db.query(Shipment)
    if start_date:
        shipments_query = shipments_query.filter(Shipment.created_at >= datetime.combine(start_date, datetime.min.time()))
    shipments = shipments_query.all()

    total_shipment_cost = sum((s.shipment_cost or 0) for s in shipments)
    total_shipments_count = len(shipments)

    # ── Employee Salaries (active only) ──
    salaries = db.query(EmployeeSalary).filter(EmployeeSalary.status == "Active").all()
    total_salaries = sum((s.net_salary or 0) for s in salaries)
    total_employees_paid = len(salaries)

    # ── Approved Expense Claims ──
    claims_query = db.query(ExpenseClaim).filter(ExpenseClaim.status == "Approved")
    if start_date:
        claims_query = claims_query.filter(ExpenseClaim.created_at >= datetime.combine(start_date, datetime.min.time()))
    claims = claims_query.all()

    total_expense_claims = sum((c.amount or 0) for c in claims)
    total_claims_count = len(claims)

    # ── Totals ──
    total_expenses = total_purchases + total_shipment_cost + total_salaries + total_expense_claims
    net_profit = total_revenue - total_expenses
    profit_margin = round((net_profit / total_revenue) * 100, 2) if total_revenue > 0 else 0

    return {
        "period": period,
        "revenue": {
            "total_revenue": round(total_revenue, 2),
            "total_commission": round(total_commission, 2),
            "orders_count": total_orders_count,
        },
        "expenses": {
            "total_purchases": round(total_purchases, 2),
            "purchases_count": total_purchases_count,
            "total_shipment_cost": round(total_shipment_cost, 2),
            "shipments_count": total_shipments_count,
            "total_salaries": round(total_salaries, 2),
            "employees_paid": total_employees_paid,
            "total_expense_claims": round(total_expense_claims, 2),
            "claims_count": total_claims_count,
            "total_expenses": round(total_expenses, 2),
        },
        "profit": {
            "net_profit": round(net_profit, 2),
            "profit_margin": profit_margin,
        },
    }


@router.get("/breakdown")
def get_finance_breakdown(
    period: str = Query("all", pattern="^(today|week|month|year|all)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Returns detailed financial breakdown by account, category, and monthly trends.
    Admin-only endpoint.
    """
    start_date = _get_date_filter(period)

    # ── Revenue by Account / Marketplace ──
    orders_query = db.query(Order)
    if start_date:
        orders_query = orders_query.filter(func.coalesce(Order.order_process_date, Order.order_date) >= start_date)
    orders = orders_query.all()

    revenue_by_account = {}
    for o in orders:
        acc = o.account_name or o.seller_account or o.company or "Direct / Unlinked"
        if acc not in revenue_by_account:
            revenue_by_account[acc] = {"revenue": 0, "commission": 0, "orders": 0}
        revenue_by_account[acc]["revenue"] += (o.price_usd or o.product_price or 0.0) * (o.qty or 1)
        revenue_by_account[acc]["commission"] += (o.commission_price or 0.0) * (o.qty or 1)
        revenue_by_account[acc]["orders"] += 1

    revenue_by_account_list = [
        {"account": k, "revenue": round(v["revenue"], 2), "commission": round(v["commission"], 2), "orders": v["orders"]}
        for k, v in sorted(revenue_by_account.items(), key=lambda x: x[1]["revenue"], reverse=True)
    ]

    # ── Expense Breakdown by Category ──
    purchases_query = db.query(Purchase)
    if start_date:
        purchases_query = purchases_query.filter(Purchase.order_date >= start_date)
    purchases = purchases_query.all()
    total_purchases = sum((p.purchase_value or 0) * (p.qty or 1) for p in purchases)

    shipments_query = db.query(Shipment)
    if start_date:
        shipments_query = shipments_query.filter(Shipment.created_at >= datetime.combine(start_date, datetime.min.time()))
    shipments = shipments_query.all()
    total_shipment_cost = sum((s.shipment_cost or 0) for s in shipments)

    salaries = db.query(EmployeeSalary).filter(EmployeeSalary.status == "Active").all()
    total_salaries = sum((s.net_salary or 0) for s in salaries)

    claims_query = db.query(ExpenseClaim).filter(ExpenseClaim.status == "Approved")
    if start_date:
        claims_query = claims_query.filter(ExpenseClaim.created_at >= datetime.combine(start_date, datetime.min.time()))
    claims = claims_query.all()
    total_expense_claims = sum((c.amount or 0) for c in claims)

    expense_categories = [
        {"category": "Product Purchases", "amount": round(total_purchases, 2), "count": len(purchases), "color": "#ef4444"},
        {"category": "Shipping & Logistics", "amount": round(total_shipment_cost, 2), "count": len(shipments), "color": "#f97316"},
        {"category": "Employee Salaries", "amount": round(total_salaries, 2), "count": len(salaries), "color": "#8b5cf6"},
        {"category": "Expense Claims", "amount": round(total_expense_claims, 2), "count": len(claims), "color": "#06b6d4"},
    ]

    # ── Expense Claims by Category ──
    claims_all = db.query(ExpenseClaim).filter(ExpenseClaim.status == "Approved").all()
    claims_by_category = {}
    for c in claims_all:
        cat = c.category or "Uncategorized"
        if cat not in claims_by_category:
            claims_by_category[cat] = 0
        claims_by_category[cat] += (c.amount or 0)
    claims_by_category_list = [
        {"category": k, "amount": round(v, 2)}
        for k, v in sorted(claims_by_category.items(), key=lambda x: x[1], reverse=True)
    ]

    # ── Monthly Trends (last 12 months) ──
    today = date.today()
    monthly_trends = []
    for i in range(11, -1, -1):
        # Calculate month start/end
        month_date = today.replace(day=1) - timedelta(days=i * 28)  # approx
        month_start = month_date.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1)

        month_start_dt = datetime.combine(month_start, datetime.min.time())
        month_end_dt = datetime.combine(month_end, datetime.max.time())

        # Monthly revenue
        order_date_col = func.coalesce(Order.order_process_date, Order.order_date)
        month_orders = db.query(Order).filter(
            order_date_col >= month_start,
            order_date_col <= month_end
        ).all()
        month_revenue = sum(((o.price_usd or o.product_price or 0.0) * (o.qty or 1)) for o in month_orders)

        # Monthly purchases
        month_purchases = db.query(Purchase).filter(
            Purchase.order_date >= month_start,
            Purchase.order_date <= month_end
        ).all()
        month_purchase_cost = sum((p.purchase_value or 0) * (p.qty or 1) for p in month_purchases)

        # Monthly shipments
        month_shipments = db.query(Shipment).filter(
            Shipment.created_at >= month_start_dt,
            Shipment.created_at <= month_end_dt
        ).all()
        month_shipment_cost = sum((s.shipment_cost or 0) for s in month_shipments)

        month_total_expenses = month_purchase_cost + month_shipment_cost

        monthly_trends.append({
            "month": month_start.strftime("%b %Y"),
            "month_short": month_start.strftime("%b"),
            "revenue": round(month_revenue, 2),
            "expenses": round(month_total_expenses, 2),
            "profit": round(month_revenue - month_total_expenses, 2),
        })

    # ── Top Selling Products (by revenue) ──
    product_revenue = {}
    for o in orders:
        pname = o.product_name or "Unknown"
        if pname not in product_revenue:
            product_revenue[pname] = {"revenue": 0, "qty": 0}
        product_revenue[pname]["revenue"] += (o.price_usd or o.product_price or 0.0) * (o.qty or 1)
        product_revenue[pname]["qty"] += (o.qty or 1)

    top_products = [
        {"product": k, "revenue": round(v["revenue"], 2), "qty_sold": v["qty"]}
        for k, v in sorted(product_revenue.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]
    ]

    return {
        "revenue_by_account": revenue_by_account_list,
        "expense_categories": expense_categories,
        "claims_by_category": claims_by_category_list,
        "monthly_trends": monthly_trends,
        "top_products": top_products,
    }
