import io
import csv
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, or_
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
from app.models.company import Company
from app.models.partner import Partner

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


def _compute_company_partner_report_data(
    db: Session,
    company_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    period: str = "all",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    order_status: Optional[str] = None,
    exchange_rate: float = 84.0,
):
    # Clean parameters safely
    try:
        company_id = int(company_id) if (company_id is not None and str(company_id).isdigit()) else None
    except Exception:
        company_id = None

    try:
        partner_id = int(partner_id) if (partner_id is not None and str(partner_id).isdigit()) else None
    except Exception:
        partner_id = None

    try:
        exchange_rate = float(exchange_rate)
    except Exception:
        exchange_rate = 84.0
    if exchange_rate <= 0:
        exchange_rate = 84.0

    # 1. Fetch Company & Partner details
    company = db.query(Company).filter(Company.id == company_id).first() if company_id else None
    partner = db.query(Partner).filter(Partner.id == partner_id).first() if partner_id else None

    partner_share_pct = float(partner.partner_share_percentage or 0.0) if partner else 0.0

    # 2. Identify linked accounts
    acc_conditions = []
    if company_id:
        acc_conditions.append(Account.company_id == company_id)
        if company and company.company_name:
            acc_conditions.append(Account.purchase_company.ilike(f"%{company.company_name.strip()}%"))
    if partner_id:
        acc_conditions.append(Account.partner_id == partner_id)
        if partner and partner.partner_name:
            acc_conditions.append(Account.account_name.ilike(f"%{partner.partner_name.strip()}%"))

    matched_accounts = []
    if acc_conditions:
        matched_accounts = db.query(Account).filter(or_(*acc_conditions)).all()
    account_names = list(set([a.account_name.strip() for a in matched_accounts if a.account_name]))

    # 3. Query Orders with dynamic filters
    orders_q = db.query(Order)
    order_conds = []
    if account_names:
        order_conds.append(Order.seller_account.in_(account_names))
        order_conds.append(Order.account_name.in_(account_names))
    if company and company.company_name:
        order_conds.append(Order.company.ilike(f"%{company.company_name.strip()}%"))
    if partner and partner.partner_name:
        order_conds.append(Order.company.ilike(f"%{partner.partner_name.strip()}%"))

    if order_conds:
        orders_q = orders_q.filter(or_(*order_conds))

    # Apply date filters
    order_date_col = func.coalesce(Order.order_process_date, Order.order_date)
    if period and period != "all" and period != "custom":
        period_start = _get_date_filter(period)
        if period_start:
            orders_q = orders_q.filter(order_date_col >= period_start)
    else:
        if start_date:
            orders_q = orders_q.filter(order_date_col >= start_date)
        if end_date:
            orders_q = orders_q.filter(order_date_col <= end_date)

    # Order status filter
    if order_status and order_status != "All":
        orders_q = orders_q.filter(Order.status == order_status)
    else:
        # Default: exclude cancelled orders from earned financial figures
        orders_q = orders_q.filter(~Order.status.in_(["Cancelled", "Returned"]))

    orders = orders_q.order_by(order_date_col.desc(), Order.id.desc()).all()
    order_ids = [o.id for o in orders]

    # 4. Fetch linked Purchases & Shipments
    purchases = db.query(Purchase).filter(Purchase.order_id.in_(order_ids)).all() if order_ids else []
    shipments = db.query(Shipment).filter(Shipment.order_id.in_(order_ids)).all() if order_ids else []

    purchases_map = {}
    for p in purchases:
        if p.order_id not in purchases_map:
            purchases_map[p.order_id] = []
        purchases_map[p.order_id].append(p)

    shipments_map = {}
    for s in shipments:
        if s.order_id not in shipments_map:
            shipments_map[s.order_id] = []
        shipments_map[s.order_id].append(s)

    # 5. Financial aggregates
    total_revenue_usd = 0.0
    total_cogs_inr = 0.0
    total_shipping_usd = 0.0
    total_paid_cogs_inr = 0.0
    total_pending_cogs_inr = 0.0
    total_units_sold = 0

    account_stats = {}
    ledger = []

    for o in orders:
        qty = o.qty or 1
        total_units_sold += qty
        price_usd = float(o.price_usd or o.product_price or 0.0)
        rev_usd = price_usd * qty

        # Calculate COGS (procurement cost) from purchases
        o_purs = purchases_map.get(o.id, [])
        cogs_inr = 0.0
        pay_status = "Unpaid"
        if o_purs:
            for p in o_purs:
                val = (float(p.purchase_value or 0.0) * (p.qty or 1)) + float(p.other_cost or 0.0) + float(p.extra_cost or 0.0)
                cogs_inr += val
                if (p.payment_status or "").lower() == "paid":
                    total_paid_cogs_inr += val
                else:
                    total_pending_cogs_inr += val
                if p.payment_status:
                    pay_status = p.payment_status
        elif o.purchase_cost_inr:
            cogs_inr = float(o.purchase_cost_inr)
            total_pending_cogs_inr += cogs_inr

        # Calculate shipping cost
        o_ships = shipments_map.get(o.id, [])
        ship_cost_usd = sum(float(s.shipment_cost or 0.0) for s in o_ships) + float(o.label_cost_usd or 0.0)

        # Cross currency math
        cogs_usd = cogs_inr / exchange_rate
        rev_inr = rev_usd * exchange_rate
        ship_cost_inr = ship_cost_usd * exchange_rate

        profit_usd = rev_usd - cogs_usd - ship_cost_usd
        profit_inr = rev_inr - cogs_inr - ship_cost_inr

        partner_cut_usd = max(0.0, profit_usd * (partner_share_pct / 100.0))
        partner_cut_inr = max(0.0, profit_inr * (partner_share_pct / 100.0))

        company_net_usd = profit_usd - partner_cut_usd
        company_net_inr = profit_inr - partner_cut_inr

        total_revenue_usd += rev_usd
        total_cogs_inr += cogs_inr
        total_shipping_usd += ship_cost_usd

        acc_name = o.seller_account or o.account_name or o.company or "Direct Account"
        if acc_name not in account_stats:
            account_stats[acc_name] = {"orders": 0, "rev_usd": 0.0, "cogs_usd": 0.0, "profit_usd": 0.0}
        account_stats[acc_name]["orders"] += 1
        account_stats[acc_name]["rev_usd"] += rev_usd
        account_stats[acc_name]["cogs_usd"] += cogs_usd
        account_stats[acc_name]["profit_usd"] += profit_usd

        order_dt_str = str(o.order_process_date or o.order_date or "")

        ledger.append({
            "order_id": o.id,
            "order_number": o.order_number or f"ORD-{o.id}",
            "order_date": order_dt_str,
            "company": o.company or (company.company_name if company else "N/A"),
            "account_name": acc_name,
            "product_name": o.product_name or "N/A",
            "qty": qty,
            "price_usd": round(price_usd, 2),
            "rev_usd": round(rev_usd, 2),
            "rev_inr": round(rev_inr, 2),
            "cogs_inr": round(cogs_inr, 2),
            "cogs_usd": round(cogs_usd, 2),
            "shipping_cost_usd": round(ship_cost_usd, 2),
            "shipping_cost_inr": round(ship_cost_inr, 2),
            "gross_profit_usd": round(profit_usd, 2),
            "gross_profit_inr": round(profit_inr, 2),
            "partner_share_pct": partner_share_pct,
            "partner_cut_usd": round(partner_cut_usd, 2),
            "partner_cut_inr": round(partner_cut_inr, 2),
            "company_net_usd": round(company_net_usd, 2),
            "company_net_inr": round(company_net_inr, 2),
            "order_status": o.status or o.order_status or "Pending",
            "payment_status": pay_status,
        })

    # Summary Totals
    total_cogs_usd = total_cogs_inr / exchange_rate
    total_revenue_inr = total_revenue_usd * exchange_rate
    total_shipping_inr = total_shipping_usd * exchange_rate

    gross_profit_usd = total_revenue_usd - total_cogs_usd - total_shipping_usd
    gross_profit_inr = total_revenue_inr - total_cogs_inr - total_shipping_inr
    gross_margin_pct = round((gross_profit_usd / total_revenue_usd * 100), 2) if total_revenue_usd > 0 else 0.0

    total_partner_share_usd = max(0.0, gross_profit_usd * (partner_share_pct / 100.0))
    total_partner_share_inr = max(0.0, gross_profit_inr * (partner_share_pct / 100.0))

    company_net_profit_usd = gross_profit_usd - total_partner_share_usd
    company_net_profit_inr = gross_profit_inr - total_partner_share_inr

    total_paid_cogs_usd = total_paid_cogs_inr / exchange_rate
    total_pending_cogs_usd = total_pending_cogs_inr / exchange_rate

    account_breakdown_list = [
        {
            "account": k,
            "orders": v["orders"],
            "revenue_usd": round(v["rev_usd"], 2),
            "cogs_usd": round(v["cogs_usd"], 2),
            "profit_usd": round(v["profit_usd"], 2),
        }
        for k, v in sorted(account_stats.items(), key=lambda x: x[1]["rev_usd"], reverse=True)
    ]

    return {
        "company": {
            "id": company.id,
            "company_name": company.company_name,
            "is_rbs": company.is_rbs,
            "rbs_type": company.rbs_type or "Debit",
            "contact_person": company.contact_person,
            "bank_platform": company.bank_platform,
        } if company else None,
        "partner": {
            "id": partner.id,
            "partner_name": partner.partner_name,
            "partner_type": partner.partner_type or "Service",
            "partner_share_percentage": partner_share_pct,
            "is_rbs": partner.is_rbs,
            "rbs_type": partner.rbs_type or "Credit",
            "contact_person": partner.contact_person,
            "bank_platform": partner.bank_platform,
        } if partner else None,
        "exchange_rate": exchange_rate,
        "summary": {
            "total_orders": len(orders),
            "total_units_sold": total_units_sold,
            "gross_revenue_usd": round(total_revenue_usd, 2),
            "gross_revenue_inr": round(total_revenue_inr, 2),
            "total_cogs_usd": round(total_cogs_usd, 2),
            "total_cogs_inr": round(total_cogs_inr, 2),
            "total_shipping_usd": round(total_shipping_usd, 2),
            "total_shipping_inr": round(total_shipping_inr, 2),
            "gross_profit_usd": round(gross_profit_usd, 2),
            "gross_profit_inr": round(gross_profit_inr, 2),
            "gross_margin_pct": gross_margin_pct,
            "partner_share_pct": partner_share_pct,
            "partner_share_usd": round(total_partner_share_usd, 2),
            "partner_share_inr": round(total_partner_share_inr, 2),
            "company_net_profit_usd": round(company_net_profit_usd, 2),
            "company_net_profit_inr": round(company_net_profit_inr, 2),
            "paid_cogs_usd": round(total_paid_cogs_usd, 2),
            "paid_cogs_inr": round(total_paid_cogs_inr, 2),
            "pending_cogs_usd": round(total_pending_cogs_usd, 2),
            "pending_cogs_inr": round(total_pending_cogs_inr, 2),
        },
        "account_breakdown": account_breakdown_list,
        "ledger": ledger,
    }


@router.get("/reports/company-partner")
def get_company_partner_report(
    company_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    period: str = "all",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    order_status: Optional[str] = None,
    exchange_rate: float = 84.0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Returns comprehensive financial report filtered by specific Company and/or Partner.
    Includes summary KPIs, partner profit-share breakdown, settlement figures, and order ledger.
    """
    return _compute_company_partner_report_data(
        db=db,
        company_id=company_id,
        partner_id=partner_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
        order_status=order_status,
        exchange_rate=exchange_rate,
    )


@router.get("/reports/company-partner/export-csv")
def export_company_partner_report_csv(
    company_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    period: str = "all",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    order_status: Optional[str] = None,
    exchange_rate: float = 84.0,
    currency: str = "USD",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Generates a formatted CSV file of the financial report for a specific Company / Partner.
    Ready for immediate download and audit review.
    """
    data = _compute_company_partner_report_data(
        db=db,
        company_id=company_id,
        partner_id=partner_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
        order_status=order_status,
        exchange_rate=exchange_rate,
    )

    company_title = data["company"]["company_name"] if data.get("company") else "All Companies"
    partner_title = data["partner"]["partner_name"] if data.get("partner") else "All Partners"
    summary = data["summary"]
    ledger = data["ledger"]

    output = io.StringIO()
    # Write UTF-8 BOM for Excel compatibility
    output.write('\ufeff')
    writer = csv.writer(output)

    # 1. Report Header
    writer.writerow(["FINANCIAL SETTLEMENT & PROFIT REPORT"])
    writer.writerow(["Company", company_title])
    writer.writerow(["Partner", partner_title])
    if data.get("partner"):
        writer.writerow(["Partner Share %", f"{data['partner']['partner_share_percentage']}%"])
        writer.writerow(["RBS Settlement Type", data['partner'].get('rbs_type', 'Credit')])
    writer.writerow(["Period / Date Filter", period.capitalize()])
    writer.writerow(["Exchange Rate Used", f"1 USD = {exchange_rate} INR"])
    writer.writerow(["Generated At", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")])
    writer.writerow([])

    # 2. Executive Summary Block
    writer.writerow(["=== FINANCIAL SUMMARY ==="])
    writer.writerow(["Metric", f"Value ({currency})", "Value (Opposite Currency)"])
    if currency.upper() == "INR":
        writer.writerow(["Total Orders", summary["total_orders"], ""])
        writer.writerow(["Total Units Sold", summary["total_units_sold"], ""])
        writer.writerow(["Gross Revenue", f"INR {summary['gross_revenue_inr']:,.2f}", f"USD ${summary['gross_revenue_usd']:,.2f}"])
        writer.writerow(["Procurement Cost (COGS)", f"INR {summary['total_cogs_inr']:,.2f}", f"USD ${summary['total_cogs_usd']:,.2f}"])
        writer.writerow(["Logistics & Shipping Cost", f"INR {summary['total_shipping_inr']:,.2f}", f"USD ${summary['total_shipping_usd']:,.2f}"])
        writer.writerow(["Gross Profit", f"INR {summary['gross_profit_inr']:,.2f}", f"USD ${summary['gross_profit_usd']:,.2f}"])
        writer.writerow(["Gross Margin %", f"{summary['gross_margin_pct']}%", ""])
        writer.writerow(["Partner Profit Cut", f"INR {summary['partner_share_inr']:,.2f}", f"USD ${summary['partner_share_usd']:,.2f}"])
        writer.writerow(["Company Retained Profit", f"INR {summary['company_net_profit_inr']:,.2f}", f"USD ${summary['company_net_profit_usd']:,.2f}"])
    else:
        writer.writerow(["Total Orders", summary["total_orders"], ""])
        writer.writerow(["Total Units Sold", summary["total_units_sold"], ""])
        writer.writerow(["Gross Revenue", f"USD ${summary['gross_revenue_usd']:,.2f}", f"INR {summary['gross_revenue_inr']:,.2f}"])
        writer.writerow(["Procurement Cost (COGS)", f"USD ${summary['total_cogs_usd']:,.2f}", f"INR {summary['total_cogs_inr']:,.2f}"])
        writer.writerow(["Logistics & Shipping Cost", f"USD ${summary['total_shipping_usd']:,.2f}", f"INR {summary['total_shipping_inr']:,.2f}"])
        writer.writerow(["Gross Profit", f"USD ${summary['gross_profit_usd']:,.2f}", f"INR {summary['gross_profit_inr']:,.2f}"])
        writer.writerow(["Gross Margin %", f"{summary['gross_margin_pct']}%", ""])
        writer.writerow(["Partner Profit Cut", f"USD ${summary['partner_share_usd']:,.2f}", f"INR {summary['partner_share_inr']:,.2f}"])
        writer.writerow(["Company Retained Profit", f"USD ${summary['company_net_profit_usd']:,.2f}", f"INR {summary['company_net_profit_inr']:,.2f}"])

    writer.writerow([])

    # 3. Order Details Table
    writer.writerow(["=== DETAILED TRANSACTION LEDGER ==="])
    writer.writerow([
        "Order #",
        "Order Date",
        "Company",
        "Account / Marketplace",
        "Product Name",
        "Qty",
        "Selling Price (USD)",
        "Revenue (USD)",
        "Revenue (INR)",
        "COGS (INR)",
        "COGS (USD)",
        "Shipping (USD)",
        "Gross Profit (USD)",
        "Gross Profit (INR)",
        "Partner Share %",
        "Partner Cut (USD)",
        "Partner Cut (INR)",
        "Company Net (USD)",
        "Order Status",
        "Purchase Payment Status"
    ])

    for row in ledger:
        writer.writerow([
            row["order_number"],
            row["order_date"],
            row["company"],
            row["account_name"],
            row["product_name"],
            row["qty"],
            row["price_usd"],
            row["rev_usd"],
            row["rev_inr"],
            row["cogs_inr"],
            row["cogs_usd"],
            row["shipping_cost_usd"],
            row["gross_profit_usd"],
            row["gross_profit_inr"],
            f"{row['partner_share_pct']}%",
            row["partner_cut_usd"],
            row["partner_cut_inr"],
            row["company_net_usd"],
            row["order_status"],
            row["payment_status"],
        ])

    csv_data = output.getvalue()
    output.close()

    clean_comp = "".join(c for c in company_title if c.isalnum() or c in ("-", "_")).rstrip()
    clean_part = "".join(c for c in partner_title if c.isalnum() or c in ("-", "_")).rstrip()
    filename = f"Report_{clean_comp}_{clean_part}_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )

