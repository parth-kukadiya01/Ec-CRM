"""
Database initialization and clean seed script.
Sets up a pristine database with all tables, permissions, official users from pass.txt,
and core companies & partners, without any messy test/dummy orders or shipments.
"""

import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
import app.models # Load all models

from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.company import Company
from app.models.partner import Partner
from app.models.order import Order
from app.models.purchase import Purchase
from app.models.shipment import Shipment
from app.models.inventory import Inventory
from app.models.account import Account
from app.models.task import Task, TaskHistory
from app.models.expense_claim import ExpenseClaim
from app.models.employee_salary import EmployeeSalary
from app.models.employee_asset import EmployeeAsset
from app.models.employee_document import EmployeeDocument
from app.models.monthly_admin_cost import MonthlyAdminCost

def init_clean_db():
    print("==================================================")
    print("    INITIALIZING CLEAN DATABASE & SCHEMA          ")
    print("==================================================")

    # 1. Create all database tables
    Base.metadata.create_all(bind=engine)
    print("✓ All database tables verified and created successfully.")

    db = SessionLocal()
    try:
        # 2. Clear all dummy / transactional records
        db.query(Shipment).delete()
        db.query(Purchase).delete()
        db.query(Order).delete()
        db.query(Inventory).delete()
        db.query(Account).delete()
        db.query(TaskHistory).delete()
        db.query(Task).delete()
        db.query(ExpenseClaim).delete()
        db.query(EmployeeDocument).delete()
        db.query(EmployeeAsset).delete()
        db.query(EmployeeSalary).delete()
        db.query(MonthlyAdminCost).delete()
        db.commit()
        print("✓ Cleared all transactional dummy records (orders, purchases, shipments, inventory, accounts).")

        # 3. Initialize Standard Permissions
        all_permissions = [
            # Orders
            ("orders:read", "View orders and order details", "orders"),
            ("orders:write", "Create and edit orders", "orders"),
            ("orders:delete", "Delete orders", "orders"),
            # Purchases
            ("purchases:read", "View purchase records and queues", "purchases"),
            ("purchases:write", "Create and update purchases", "purchases"),
            ("purchases:delete", "Delete purchases", "purchases"),
            # Shipments
            ("shipments:read", "View shipments tracking and dispatches", "shipments"),
            ("shipments:write", "Create, update and dispatch shipments", "shipments"),
            ("shipments:delete", "Delete shipment records", "shipments"),
            # Inventory
            ("inventory:read", "View inventory items and stock levels", "inventory"),
            ("inventory:write", "Add and edit inventory items", "inventory"),
            ("inventory:delete", "Delete inventory items", "inventory"),
            # Accounts
            ("accounts:read", "View accounts list and ledgers", "accounts"),
            ("accounts:write", "Create and edit accounts", "accounts"),
            ("accounts:delete", "Delete accounts", "accounts"),
            # Employees
            ("employees:read", "View employee profiles, salaries and assets", "employees"),
            ("employees:write", "Manage employees, salaries and assets", "employees"),
            ("employees:delete", "Delete employee records", "employees"),
            # Admin & Settings
            ("roles:manage", "Manage roles and user permissions", "administration"),
            ("finance:admin", "View financial reports and cost allocations", "finance"),
        ]

        permission_map = {}
        for code, desc, mod in all_permissions:
            perm = db.query(Permission).filter(Permission.name == code).first()
            if not perm:
                perm = Permission(name=code, description=desc, module=mod)
                db.add(perm)
                db.flush()
            permission_map[code] = perm

        db.commit()
        print(f"✓ Verified {len(all_permissions)} system permissions.")

        # 4. Initialize Standard Roles
        def get_or_create_role(name: str, desc: str, perm_codes: list):
            role = db.query(Role).filter(Role.name == name).first()
            if not role:
                role = Role(name=name, description=desc)
                db.add(role)
                db.flush()
            role.permissions = [permission_map[p] for p in perm_codes if p in permission_map]
            db.commit()
            return role

        super_admin_role = get_or_create_role(
            "Super Admin",
            "Full access to all CRM modules and administration",
            list(permission_map.keys())
        )

        orders_purchases_role = get_or_create_role(
            "Orders & Purchases Specialist",
            "Access to Orders management and Purchases procurement",
            ["orders:read", "orders:write", "orders:delete", "purchases:read", "purchases:write", "purchases:delete"]
        )

        shipments_role = get_or_create_role(
            "Shipment Specialist",
            "Access to Shipments tracking and carrier dispatches",
            ["shipments:read", "shipments:write", "shipments:delete"]
        )

        ops_role = get_or_create_role(
            "Orders, Purchases & Shipments Specialist",
            "Access to Orders, Purchases and Shipments fulfillment",
            [
                "orders:read", "orders:write", "orders:delete",
                "purchases:read", "purchases:write", "purchases:delete",
                "shipments:read", "shipments:write", "shipments:delete"
            ]
        )

        print("✓ Configured system roles and permission mappings.")

        # 5. Initialize Standard Users from pass.txt
        official_users = [
            {
                "email": "admin1@crm.com",
                "full_name": "Admin One",
                "password": "admin123",
                "is_admin": True,
                "role_id": super_admin_role.id,
                "allowed_companies": None,
                "phone": "9876543210",
                "department": "Executive Management",
                "job_title": "Super Admin 1"
            },
            {
                "email": "admin2@crm.com",
                "full_name": "Admin Two",
                "password": "admin123",
                "is_admin": True,
                "role_id": super_admin_role.id,
                "allowed_companies": None,
                "phone": "9876543211",
                "department": "Executive Management",
                "job_title": "Super Admin 2"
            },
            {
                "email": "admin@crm.com",
                "full_name": "Primary Admin",
                "password": "admin123",
                "is_admin": True,
                "role_id": super_admin_role.id,
                "allowed_companies": None,
                "phone": "9876543200",
                "department": "Executive Management",
                "job_title": "Super Admin"
            },
            {
                "email": "orders.purchases@crm.com",
                "full_name": "Orders & Purchases Executive",
                "password": "user123",
                "is_admin": False,
                "role_id": orders_purchases_role.id,
                "allowed_companies": None,
                "phone": "9876543212",
                "department": "Procurement",
                "job_title": "Orders & Purchases Executive"
            },
            {
                "email": "shipments@crm.com",
                "full_name": "Shipment Executive",
                "password": "user123",
                "is_admin": False,
                "role_id": shipments_role.id,
                "allowed_companies": None,
                "phone": "9876543213",
                "department": "Logistics",
                "job_title": "Shipment Executive"
            },
            {
                "email": "ops1@crm.com",
                "full_name": "Fulfillment Executive 1",
                "password": "user123",
                "is_admin": False,
                "role_id": ops_role.id,
                "allowed_companies": None,
                "phone": "9876543214",
                "department": "Operations",
                "job_title": "Fulfillment Executive (All Companies)"
            },
            {
                "email": "ops2@crm.com",
                "full_name": "Fulfillment Executive 2",
                "password": "user123",
                "is_admin": False,
                "role_id": ops_role.id,
                "allowed_companies": "ADBH,Globle,Global",
                "phone": "9876543215",
                "department": "Operations",
                "job_title": "Fulfillment Executive (ADBH & Global only)"
            }
        ]

        # Clean out any old/extra test user accounts
        official_emails = {u["email"] for u in official_users}
        db.query(User).filter(User.email.notin_(official_emails)).delete(synchronize_session=False)

        for u_data in official_users:
            user = db.query(User).filter(User.email == u_data["email"]).first()
            if not user:
                user = User(
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    password_hash=get_password_hash(u_data["password"]),
                    is_active=True,
                    is_admin=u_data["is_admin"],
                    role_id=u_data["role_id"],
                    allowed_companies=u_data["allowed_companies"],
                    phone=u_data["phone"]
                )
                db.add(user)
            else:
                user.full_name = u_data["full_name"]
                user.password_hash = get_password_hash(u_data["password"])
                user.is_active = True
                user.is_admin = u_data["is_admin"]
                user.role_id = u_data["role_id"]
                user.allowed_companies = u_data["allowed_companies"]
                user.phone = u_data["phone"]

        db.commit()
        print("✓ Synced official users from pass.txt:")
        for u in db.query(User).all():
            print(f"  • {u.email:<26} | Role: {u.role.name:<38} | Allowed: {u.allowed_companies or 'All'}")

        # 6. Initialize Core Companies
        core_companies = [
            {"company_name": "ADBH", "joining_date": "2026-01-01", "is_rbs": True, "rbs_type": "Debit", "contact_person": "ADBH Admin"},
            {"company_name": "Vetai", "joining_date": "2026-01-01", "is_rbs": True, "rbs_type": "Debit", "contact_person": "Vetai Operations"},
            {"company_name": "Globle", "joining_date": "2026-01-01", "is_rbs": True, "rbs_type": "Debit", "contact_person": "Global Solutions"},
            {"company_name": "canton", "joining_date": "2026-01-01", "is_rbs": True, "rbs_type": "Debit", "contact_person": "Canton Logistics"}
        ]

        # Clean companies table and insert core companies
        db.query(Company).delete()
        for comp in core_companies:
            db.add(Company(**comp))

        # 7. Initialize Core Partners
        core_partners = [
            {"partner_name": "pari", "joining_date": "2026-01-01", "partner_type": "Partner with %", "partner_share_percentage": 15.0, "is_rbs": True, "rbs_type": "Credit"},
            {"partner_name": "Aryastore Partner", "joining_date": "2026-01-01", "partner_type": "Service", "partner_share_percentage": 10.0, "is_rbs": True, "rbs_type": "Credit"},
            {"partner_name": "Apex Global Partners", "joining_date": "2026-01-01", "partner_type": "Partner with %", "partner_share_percentage": 20.0, "is_rbs": True, "rbs_type": "Credit"}
        ]

        # Clean partners table and insert core partners
        db.query(Partner).delete()
        for part in core_partners:
            db.add(Partner(**part))

        db.commit()
        print("✓ Synced core Companies and Partners.")

        print("\n==================================================")
        print("    DATABASE INITIALIZATION COMPLETED CLEANLY     ")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"Error initializing clean database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_clean_db()
