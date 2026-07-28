from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    shipment_partner = Column(String(100), nullable=False)
    tracking_id = Column(String(100), nullable=False, index=True)
    product_name = Column(String(200), nullable=False)
    product_image = Column(Text, nullable=True)
    weight = Column(Float, nullable=False, default=0.0) # in kg
    shipment_cost = Column(Float, nullable=False, default=0.0)
    
    # Status: "In Transit", "Delivered", "Cancelled"
    status = Column(String(50), nullable=False, default="In Transit")

    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="shipments")
