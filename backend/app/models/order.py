from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True)
    order_date = Column(Date, nullable=False, default=date.today)
    last_shipment_date = Column(Date, nullable=True)

    product_id = Column(Integer, ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(200), nullable=False)
    qty = Column(Integer, nullable=False, default=1)
    product_price = Column(Float, nullable=False, default=0.0)
    commission_price = Column(Float, nullable=False, default=0.0)
    product_image = Column(Text, nullable=True)

    shipment_address_1 = Column(Text, nullable=False)
    shipment_address_2 = Column(Text, nullable=True)
    buyer_name = Column(String(100), nullable=False)
    mobile_number = Column(String(20), nullable=False)

    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    account_name = Column(String(150), nullable=True)

    # Status: "Ready for Shipment", "Pending Procurement", "Purchased", "Shipped", "Delivered"
    status = Column(String(50), nullable=False, default="Ready for Shipment")

    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Inventory")
    account = relationship("Account")
    purchases = relationship("Purchase", back_populates="order")
    shipments = relationship("Shipment", back_populates="order")
