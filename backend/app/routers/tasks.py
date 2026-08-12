from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.task import Task, TaskHistory
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskStatusUpdate,
    TaskCommentCreate,
    TaskResponse,
    TaskHistoryResponse,
)

router = APIRouter(prefix="/tasks", tags=["Tasks & Tickets"])

def build_task_response(task: Task) -> TaskResponse:
    history_items = []
    for h in task.history_logs:
        history_items.append(
            TaskHistoryResponse(
                id=h.id,
                task_id=h.task_id,
                user_id=h.user_id,
                user_full_name=h.user.full_name if h.user else "Unknown User",
                action=h.action,
                notes=h.notes,
                created_at=h.created_at,
            )
        )

    return TaskResponse(
        id=task.id,
        ticket_code=task.ticket_code,
        title=task.title,
        description=task.description,
        assignee_id=task.assignee_id,
        assignee_full_name=task.assignee.full_name if task.assignee else None,
        assignee_email=task.assignee.email if task.assignee else None,
        assigned_by_id=task.assigned_by_id,
        assigned_by_full_name=task.assigned_by.full_name if task.assigned_by else None,
        priority=task.priority,
        status=task.status,
        due_date=task.due_date,
        created_at=task.created_at,
        updated_at=task.updated_at,
        history_logs=history_items,
    )

@router.post("", response_model=TaskResponse)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Generate unique ticket code e.g. TASK-101
    last_task = db.query(Task).order_by(Task.id.desc()).first()
    next_id = (last_task.id + 1) if last_task else 1
    ticket_code = f"TASK-{100 + next_id}"

    task = Task(
        ticket_code=ticket_code,
        title=task_in.title,
        description=task_in.description,
        assignee_id=task_in.assignee_id,
        assigned_by_id=current_user.id,
        priority=task_in.priority,
        status="To Do",
        due_date=task_in.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Add initial history entry
    assignee_name = task.assignee.full_name if task.assignee else "Unassigned"
    creation_log = TaskHistory(
        task_id=task.id,
        user_id=current_user.id,
        action=f"Created task {ticket_code} and assigned to {assignee_name}",
        notes=f"Priority set to {task.priority}. Status set to To Do.",
    )
    db.add(creation_log)
    db.commit()
    db.refresh(task)

    return build_task_response(task)

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    all_tasks: Optional[bool] = False,
    skip: Optional[int] = Query(None, ge=0, description="Number of items to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max items to return"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task)
    # Strictly enforce task privacy: Non-admin & non-manager users can ONLY see tasks assigned to them or created by them
    is_admin_or_manager = current_user.is_admin or (current_user.role and "Manager" in current_user.role.name)
    if not is_admin_or_manager:
        query = query.filter(
            (Task.assignee_id == current_user.id) | (Task.assigned_by_id == current_user.id)
        )
    elif not all_tasks:
        query = query.filter(
            (Task.assignee_id == current_user.id) | (Task.assigned_by_id == current_user.id)
        )

    query = query.order_by(Task.created_at.desc())

    if page is not None and page_size is not None:
        skip = (page - 1) * page_size
        limit = page_size
    if skip is not None:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    tasks = query.all()
    return [build_task_response(t) for t in tasks]

@router.get("/{task_id}", response_model=TaskResponse)
def get_task_details(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task ticket not found")
    return build_task_response(task)

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task ticket not found")

    changes = []
    if task_in.title and task_in.title != task.title:
        changes.append(f"Title changed to '{task_in.title}'")
        task.title = task_in.title

    if task_in.description is not None and task_in.description != task.description:
        changes.append("Description updated")
        task.description = task_in.description

    if task_in.assignee_id is not None and task_in.assignee_id != task.assignee_id:
        new_assignee = db.query(User).filter(User.id == task_in.assignee_id).first()
        assignee_name = new_assignee.full_name if new_assignee else "Unassigned"
        changes.append(f"Reassigned to {assignee_name}")
        task.assignee_id = task_in.assignee_id

    if task_in.priority and task_in.priority != task.priority:
        changes.append(f"Priority changed from {task.priority} to {task_in.priority}")
        task.priority = task_in.priority

    if task_in.status and task_in.status != task.status:
        changes.append(f"Status changed from {task.status} to {task_in.status}")
        task.status = task_in.status

    if task_in.due_date is not None and task_in.due_date != task.due_date:
        changes.append(f"Due date set to {task_in.due_date}")
        task.due_date = task_in.due_date

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    if changes:
        history_log = TaskHistory(
            task_id=task.id,
            user_id=current_user.id,
            action=", ".join(changes),
            notes=None,
        )
        db.add(history_log)
        db.commit()
        db.refresh(task)

    return build_task_response(task)

@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    status_in: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task ticket not found")

    old_status = task.status
    task.status = status_in.status
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    action_text = f"Updated status from '{old_status}' to '{status_in.status}'"
    history_log = TaskHistory(
        task_id=task.id,
        user_id=current_user.id,
        action=action_text,
        notes=status_in.comment if status_in.comment else None,
    )
    db.add(history_log)
    db.commit()
    db.refresh(task)

    return build_task_response(task)

@router.post("/{task_id}/history", response_model=TaskResponse)
def add_task_comment(
    task_id: int,
    comment_in: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task ticket not found")

    history_log = TaskHistory(
        task_id=task.id,
        user_id=current_user.id,
        action="Added progress comment",
        notes=comment_in.notes,
    )
    db.add(history_log)
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    return build_task_response(task)
