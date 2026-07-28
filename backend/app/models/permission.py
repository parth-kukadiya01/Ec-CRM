from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True) # e.g., "inventory:read"
    module = Column(String(50), nullable=False) # e.g., "inventory", "order", "user"
    description = Column(Text, nullable=True)

    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")
