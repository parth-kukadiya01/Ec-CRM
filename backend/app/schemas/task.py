from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    priority: str = "Medium"
    due_date: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str
    comment: Optional[str] = None

class TaskCommentCreate(BaseModel):
    notes: str

class TaskHistoryResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    user_full_name: Optional[str] = None
    action: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TaskResponse(BaseModel):
    id: int
    ticket_code: str
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    assignee_full_name: Optional[str] = None
    assignee_email: Optional[str] = None
    assigned_by_id: Optional[int] = None
    assigned_by_full_name: Optional[str] = None
    priority: str
    status: str
    due_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    history_logs: List[TaskHistoryResponse] = []

    class Config:
        from_attributes = True
