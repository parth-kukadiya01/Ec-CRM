from pydantic import BaseModel
from typing import Optional, List

class PermissionBase(BaseModel):
    name: str
    module: str
    description: Optional[str] = None

class PermissionResponse(PermissionBase):
    id: int

    class Config:
        from_attributes = True

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permission_ids: List[int] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None

class RoleResponse(RoleBase):
    id: int
    permissions: List[PermissionResponse] = []

    class Config:
        from_attributes = True
