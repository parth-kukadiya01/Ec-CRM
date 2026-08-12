from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from datetime import datetime
from app.database import Base

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(200), nullable=False, index=True)
    price = Column(Float, nullable=False, default=0.0)
    stock_quantity = Column(Integer, nullable=False, default=0)
    sku = Column(String(50), unique=True, nullable=True, index=True)
    category = Column(String(100), nullable=True)
    other_details = Column(Text, nullable=True) # Additional specifications/stock details

    partner_id = Column(Integer, nullable=True, index=True)
    partner_name = Column(String(200), nullable=True)
    image_url = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
