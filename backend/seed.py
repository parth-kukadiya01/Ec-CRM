from datetime import date, datetime
from app.database import engine, Base, SessionLocal
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User
from app.models.inventory import Inventory
from app.models.account import Account
from app.models.order import Order
from app.models.purchase import Purchase
from app.models.shipment import Shipment
from app.core.security import get_password_hash

PERMISSIONS = [
    # Inventory
    ("inventory:read", "inventory", "View inventory products"),
    ("inventory:write", "inventory", "Add and edit inventory products"),
    # Orders
    ("orders:read", "orders", "View sales orders"),
    ("orders:write", "orders", "Create and edit orders"),
    # Purchases
    ("purchases:read", "purchases", "View purchase orders"),
    ("purchases:write", "purchases", "Create and edit purchase orders"),
    # Shipments
    ("shipments:read", "shipments", "View shipment tracking"),
    ("shipments:write", "shipments", "Create and edit shipments"),
    # Accounts
    ("accounts:read", "accounts", "View company and partner accounts"),
    ("accounts:write", "accounts", "Create and edit accounts"),
    # Employees / Users
    ("employees:read", "employees", "View employees"),
    ("employees:write", "employees", "Add and edit employees"),
    # Roles
    ("roles:manage", "roles", "Manage roles and permissions"),
]

def sync_db_columns():
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            columns = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
            if columns:
                if "is_partner" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_partner BOOLEAN DEFAULT 0"))
                if "account_id" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN account_id INTEGER"))
                if "account_name" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN account_name VARCHAR(100)"))
                conn.commit()
    except Exception as e:
        print(f"Column sync warning: {e}")

def seed_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    sync_db_columns()
    
    db = SessionLocal()
    try:
        # 1. Seed Permissions
        print("Seeding permissions...")
        perm_objects = {}
        for code, module, desc in PERMISSIONS:
            p = db.query(Permission).filter(Permission.name == code).first()
            if not p:
                p = Permission(name=code, module=module, description=desc)
                db.add(p)
                db.flush()
            perm_objects[code] = p

        # 2. Seed Roles
        print("Seeding default roles...")
        admin_role = db.query(Role).filter(Role.name == "Super Admin").first()
        if not admin_role:
            admin_role = Role(name="Super Admin", description="Full administrative access")
            admin_role.permissions = list(perm_objects.values())
            db.add(admin_role)
            db.flush()

        sales_role = db.query(Role).filter(Role.name == "Sales Executive").first()
        if not sales_role:
            sales_role = Role(name="Sales Executive", description="Can create orders and view inventory")
            sales_role.permissions = [perm_objects["orders:read"], perm_objects["orders:write"], perm_objects["inventory:read"], perm_objects["accounts:read"]]
            db.add(sales_role)
            db.flush()

        inv_role = db.query(Role).filter(Role.name == "Inventory & Logistics Manager").first()
        if not inv_role:
            inv_role = Role(name="Inventory & Logistics Manager", description="Manages inventory, purchases, and shipments")
            inv_role.permissions = [
                perm_objects["inventory:read"], perm_objects["inventory:write"],
                perm_objects["purchases:read"], perm_objects["purchases:write"],
                perm_objects["shipments:read"], perm_objects["shipments:write"]
            ]
            db.add(inv_role)
            db.flush()

        # 3. Seed Accounts
        if db.query(Account).count() == 0:
            print("Seeding sample accounts...")
            acc1 = Account(
                account_name="Admin Primary Account",
                account_type="User",
                bank_name="HDFC Bank",
                account_number="50100293819283",
                ifsc_code="HDFC0001234",
                branch_name="Central Branch",
                notes="Primary company account for order incoming payments"
            )
            acc2 = Account(
                account_name="Amazon Partner Store",
                account_type="Partner",
                bank_name="ICICI Bank",
                account_number="000401928374",
                ifsc_code="ICIC0000004",
                branch_name="Corporate Branch",
                notes="Partner store marketplace account"
            )
            acc3 = Account(
                account_name="Shopify Direct Sales",
                account_type="3rd Party",
                bank_name="Axis Bank",
                account_number="918029384756",
                ifsc_code="UTIB0000111",
                branch_name="Downtown Branch",
                notes="Third party integration payment gateway account"
            )
            acc4 = Account(
                account_name="Flipkart Merchant",
                account_type="Partner",
                bank_name="State Bank of India",
                account_number="30291029384",
                ifsc_code="SBIN0004012",
                branch_name="Commercial Complex",
                notes="E-commerce marketplace store"
            )
            db.add_all([acc1, acc2, acc3, acc4])
            db.flush()

        # 4. Seed Super Admin & Staff Users
        admin_email = "admin@crm.com"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            print(f"Creating default Admin user: {admin_email} / admin123")
            admin_user = User(
                email=admin_email,
                password_hash=get_password_hash("admin123"),
                full_name="Super Administrator",
                phone="+1-800-555-0199",
                is_admin=True,
                is_active=True,
                role_id=admin_role.id,
                personal_details="Main Head Office, Admin Tower, Level 5",
                bank_name="Global Commercial Bank",
                account_number="998877665544",
                ifsc_code="GCB0001234",
                salary_summary="Base Salary: $120,000 / annum"
            )
            db.add(admin_user)

        partner_user = db.query(User).filter(User.email == "amazon_partner@crm.com").first()
        if not partner_user:
            amazon_acc = db.query(Account).filter(Account.account_name == "Amazon Partner Store").first()
            partner_user = User(
                email="amazon_partner@crm.com",
                password_hash=get_password_hash("partner123"),
                full_name="Amazon Partner Manager",
                phone="+1-800-555-0288",
                is_admin=False,
                is_active=True,
                is_partner=True,
                account_id=amazon_acc.id if amazon_acc else None,
                account_name="Amazon Partner Store",
                role_id=sales_role.id,
                personal_details="Amazon Fulfillment Division",
                bank_name="ICICI Bank",
                account_number="000401928374",
                ifsc_code="ICIC0000004",
                salary_summary="Commission Based"
            )
            db.add(partner_user)

        # 5. Seed Inventory Items
        if db.query(Inventory).count() == 0:
            print("Seeding sample inventory items...")
            item1 = Inventory(
                product_name="UltraBook Pro 15 Laptop",
                price=1299.99,
                stock_quantity=25,
                sku="LAP-PRO-01",
                category="Electronics",
                other_details="16GB RAM, 512GB SSD, Intel i7 13th Gen"
            )
            item2 = Inventory(
                product_name="Wireless Noise Cancelling Headphones",
                price=199.50,
                stock_quantity=8,
                sku="AUD-NC-02",
                category="Audio",
                other_details="Active Noise Cancellation, 30hr Battery Life"
            )
            item3 = Inventory(
                product_name="Smart Ergonomic Office Chair",
                price=349.00,
                stock_quantity=1, # Low stock alert item!
                sku="FUR-CHAIR-03",
                category="Furniture",
                other_details="Mesh back support, 4D adjustable armrests"
            )
            item4 = Inventory(
                product_name="Mechanical RGB Gaming Keyboard",
                price=129.99,
                stock_quantity=0, # Out of stock item!
                sku="KEY-RGB-04",
                category="Electronics",
                other_details="Cherry MX Switches, Custom RGB lighting"
            )
            item5 = Inventory(
                product_name="4K Ultra HD Gaming Monitor",
                price=499.00,
                stock_quantity=14,
                sku="MON-4K-05",
                category="Electronics",
                other_details="27 inch 144Hz IPS Panel, 1ms response"
            )
            db.add_all([item1, item2, item3, item4, item5])
            db.flush()

        # 6. Seed Orders (with Today's Date and Past Dates)
        if db.query(Order).count() == 0:
            print("Seeding sample customer sales orders...")
            today_obj = date.today()

            ord1 = Order(
                order_number=f"ORD-{today_obj.strftime('%Y%m%d')}-TD01",
                order_date=today_obj,
                last_shipment_date=today_obj,
                product_id=1,
                product_name="UltraBook Pro 15 Laptop",
                qty=2,
                product_price=1299.99,
                commission_price=129.99,
                shipment_address_1="104 Lotus Business Park, MG Road",
                shipment_address_2="Sector 18, Cyber Hub",
                buyer_name="Rahul Sharma",
                mobile_number="9876543210",
                account_id=1,
                account_name="Admin Primary Account",
                status="Pending Review"
            )
            ord2 = Order(
                order_number=f"ORD-{today_obj.strftime('%Y%m%d')}-TD02",
                order_date=today_obj,
                last_shipment_date=today_obj,
                product_id=2,
                product_name="Wireless Noise Cancelling Headphones",
                qty=4,
                product_price=199.50,
                commission_price=39.90,
                shipment_address_1="Flat 402, Green Valley Heights",
                shipment_address_2="Bandra West, Mumbai",
                buyer_name="Priya Patel",
                mobile_number="9812345678",
                account_id=2,
                account_name="Amazon Partner Store",
                status="Make a Purchase"
            )
            ord3 = Order(
                order_number=f"ORD-{today_obj.strftime('%Y%m%d')}-TD03",
                order_date=today_obj,
                last_shipment_date=today_obj,
                product_id=3,
                product_name="Smart Ergonomic Office Chair",
                qty=1,
                product_price=349.00,
                commission_price=34.90,
                shipment_address_1="Villa 12, Palm Meadows",
                shipment_address_2="Whitefield, Bengaluru",
                buyer_name="Vikram Mehta",
                mobile_number="9765432109",
                account_id=3,
                account_name="Shopify Direct Sales",
                status="Ready for Shipment"
            )
            ord4 = Order(
                order_number=f"ORD-{today_obj.strftime('%Y%m%d')}-TD04",
                order_date=today_obj,
                last_shipment_date=today_obj,
                product_id=5,
                product_name="4K Ultra HD Gaming Monitor",
                qty=2,
                product_price=499.00,
                commission_price=49.90,
                shipment_address_1="Plot 88, IT Park Area",
                shipment_address_2="Salt Lake, Kolkata",
                buyer_name="Ananya Roy",
                mobile_number="9900112233",
                account_id=4,
                account_name="Flipkart Merchant",
                status="Purchased"
            )
            ord5 = Order(
                order_number="ORD-20260720-WK01",
                order_date=date(2026, 7, 20),
                last_shipment_date=date(2026, 7, 23),
                product_id=4,
                product_name="Mechanical RGB Gaming Keyboard",
                qty=5,
                product_price=129.99,
                commission_price=25.99,
                shipment_address_1="Apartment 5B, Skyline Towers",
                shipment_address_2="Connaught Place, New Delhi",
                buyer_name="Amit Verma",
                mobile_number="9899887766",
                account_id=2,
                account_name="Amazon Partner Store",
                status="Delivered"
            )
            db.add_all([ord1, ord2, ord3, ord4, ord5])
            db.flush()

        # 7. Seed Purchases
        if db.query(Purchase).count() == 0:
            print("Seeding sample purchase department orders...")
            pur1 = Purchase(
                order_id="2",
                order_date=date.today(),
                product_name="Wireless Noise Cancelling Headphones",
                purchase_value=798.00,
                estimated_shipment_date=date.today(),
                account_name="Amazon Partner Store",
                qty=4,
                status="Ordered from Supplier"
            )
            pur2 = Purchase(
                order_id="4",
                order_date=date.today(),
                product_name="4K Ultra HD Gaming Monitor",
                purchase_value=998.00,
                estimated_shipment_date=date.today(),
                account_name="Flipkart Merchant",
                qty=2,
                status="Received & Restocked"
            )
            db.add_all([pur1, pur2])

        # 8. Seed Shipments
        if db.query(Shipment).count() == 0:
            print("Seeding sample shipments...")
            ship1 = Shipment(
                order_id="3",
                shipment_partner="FedEx Express",
                tracking_id="FDX-99887766",
                product_name="Smart Ergonomic Office Chair",
                weight=15.5,
                shipment_cost=45.00,
                status="In Transit"
            )
            ship2 = Shipment(
                order_id="5",
                shipment_partner="DHL Express",
                tracking_id="DHL-33221100",
                product_name="Mechanical RGB Gaming Keyboard",
                weight=2.0,
                shipment_cost=18.50,
                status="Delivered"
            )
            db.add_all([ship1, ship2])

        db.commit()
        print("Database seeded successfully with rich sample data!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
