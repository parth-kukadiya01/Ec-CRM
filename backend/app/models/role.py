from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.role_permission import role_permissions

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")
    users = relationship("User", back_populates="role")
