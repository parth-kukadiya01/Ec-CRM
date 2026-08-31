from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), index=True)
    order_date = Column(Date, nullable=True, default=date.today)
    order_process_date = Column(Date, nullable=True, default=date.today)
    last_delivery_date = Column(Date, nullable=True)
    shipping_date = Column(Date, nullable=True)

    company = Column(String(100), nullable=True, default="ADBH")
    shipment_id = Column(String(100), nullable=True)
    seller_account = Column(String(150), nullable=True)

    product_id = Column(Integer, ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False)
    product_url = Column(String(500), nullable=True)
    product_image = Column(Text, nullable=True)
    qty = Column(Integer, nullable=False, default=1)
    product_price = Column(Float, nullable=True, default=0.0)
    order_status = Column(String(100), nullable=True, default="ADBH")
    purchase_cost_inr = Column(Float, nullable=True, default=0.0)
    admin_cost_share = Column(Float, nullable=True, default=0.0)
    arriving_date = Column(String(100), nullable=True)

    @property
    def price_usd(self):
        return self.product_price or 0.0

    consignee_name = Column(String(100), nullable=True)
    shipment_address_1 = Column(Text, nullable=True)
    shipment_address_2 = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    zip_code = Column(String(50), nullable=True)
    mobile_number = Column(String(50), nullable=True)
    country = Column(String(100), nullable=True, default="USA")

    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    account_name = Column(String(150), nullable=True)

    delivery_service = Column(String(100), nullable=True)
    shipment_cost = Column(Float, nullable=True, default=0.0)
    status = Column(String(50), nullable=True, default="Pending")

    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Inventory")
    account = relationship("Account")
    purchases = relationship("Purchase", back_populates="order")
    shipments = relationship("Shipment", back_populates="order")

