from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    order_date = Column(Date, nullable=False, default=date.today)
    product_name = Column(String(200), nullable=False)
    purchase_value = Column(Float, nullable=False, default=0.0)
    other_cost = Column(Float, nullable=False, default=0.0)
    extra_cost = Column(Float, nullable=False, default=0.0)
    delivery_code = Column(String(100), nullable=True)
    estimated_shipment_date = Column(Date, nullable=True)
    account_name = Column(String(150), nullable=True)
    purchase_partner_name = Column(String(150), nullable=True)
    payment_status = Column(String(50), nullable=True, default="Paid")
    notes = Column(String(255), nullable=True)
    company = Column(String(100), nullable=True)
    qty = Column(Integer, nullable=False, default=1)
    
    sku = Column(String(100), nullable=True)
    gst_type = Column(String(50), nullable=True, default="GST")
    bank = Column(String(150), nullable=True)
    po_number = Column(String(100), nullable=True)

    # Status: "Pending", "Purchased", "Received"
    status = Column(String(50), nullable=False, default="Pending")

    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="purchases")
