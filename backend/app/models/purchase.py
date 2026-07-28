from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    order_date = Column(Date, nullable=False, default=datetime.utcnow().date)
    product_name = Column(String(200), nullable=False)
    purchase_value = Column(Float, nullable=False, default=0.0)
    estimated_shipment_date = Column(Date, nullable=True)
    account_name = Column(String(150), nullable=True)
    qty = Column(Integer, nullable=False, default=1)
    
    # Status: "Pending", "Purchased", "Received"
    status = Column(String(50), nullable=False, default="Pending")

    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="purchases")
