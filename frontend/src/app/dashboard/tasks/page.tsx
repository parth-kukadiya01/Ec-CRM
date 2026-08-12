'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Calendar,
  MessageSquare,
  History,
  Kanban,
  List,
  X,
  Edit2,
  Tag,
  ArrowRight,
  Shield,
  Send,
  MoreVertical,
  Flame,
  Check,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { tasksApi, usersApi, authApi } from '@/lib/api';
import ResizableTable from '@/components/ResizableTable';

interface TaskHistoryItem {
  id: number;
  task_id: number;
  user_id: number;
  user_full_name: string;
  action: string;
  notes: string | null;
  created_at: string;
}

interface TaskItem {
  id: number;
  ticket_code: string;
  title: string;
  description: string | null;
  assignee_id: number | null;
  assignee_full_name: string | null;
  assignee_email: string | null;
  assigned_by_id: number | null;
  assigned_by_full_name: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'In Review' | 'Completed' | 'Blocked';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  history_logs: TaskHistoryItem[];
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // View state: 'kanban' or 'table'
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Active Task Detail Drawer / Modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    assignee_id: '',
    priority: 'Medium',
    due_date: new Date().toISOString().split('T')[0],
  });
  const [creating, setCreating] = useState(false);

  // Edit Task Modal
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    assignee_id: '',
    priority: 'Medium',
    due_date: '',
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, tasksRes, usersRes] = await Promise.all([
        authApi.getMe().catch(() => ({ data: null })),
        tasksApi.list(true),
        usersApi.list().catch(() => ({ data: [] })),
      ]);
      setCurrentUser(userRes.data);
      setTasks(tasksRes.data || []);
      setUsersList(usersRes.data || []);
    } catch (err: any) {
      setErrorMsg('Failed to load task management portal');
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedTask = async (taskId: number) => {
    try {
      const res = await tasksApi.getOne(taskId);
      setSelectedTask(res.data);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title) return;
    try {
      setCreating(true);
      setErrorMsg('');
      const payload = {
        title: createForm.title,
        description: createForm.description || null,
        assignee_id: createForm.assignee_id ? parseInt(createForm.assignee_id) : null,
        priority: createForm.priority,
        due_date: createForm.due_date || null,
      };
      const res = await tasksApi.create(payload);
      setTasks([res.data, ...tasks]);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        assignee_id: '',
        priority: 'Medium',
        due_date: new Date().toISOString().split('T')[0],
      });
      setSuccessMsg(`Task ticket ${res.data.ticket_code} created & assigned!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create task ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      setErrorMsg('');
      const res = await tasksApi.updateStatus(taskId, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(res.data);
      }
      setSuccessMsg(`Task status updated to ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update task status');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;
    try {
      setSubmittingComment(true);
      const res = await tasksApi.addComment(selectedTask.id, newComment.trim());
      setSelectedTask(res.data);
      setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? res.data : t)));
      setNewComment('');
    } catch (err: any) {
      setErrorMsg('Failed to post progress comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      assignee_id: task.assignee_id ? String(task.assignee_id) : '',
      priority: task.priority,
      due_date: task.due_date || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editForm.title) return;
    try {
      setErrorMsg('');
      const payload = {
        title: editForm.title,
        description: editForm.description || null,
        assignee_id: editForm.assignee_id ? parseInt(editForm.assignee_id) : null,
        priority: editForm.priority,
        due_date: editForm.due_date || null,
      };
      const res = await tasksApi.update(editingTask.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? res.data : t)));
      if (selectedTask && selectedTask.id === editingTask.id) {
        setSelectedTask(res.data);
      }
      setEditingTask(null);
      setSuccessMsg(`Task ${res.data.ticket_code} updated successfully`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update task');
    }
  };

  const isManagerOrAdmin =
    currentUser?.is_admin || (currentUser?.role && currentUser.role.name.includes('Manager'));

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.ticket_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignee_full_name && t.assignee_full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority = priorityFilter === 'ALL' || t.priority.toUpperCase() === priorityFilter.toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || t.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const kanbanColumns: ('To Do' | 'In Progress' | 'In Review' | 'Completed' | 'Blocked')[] = [
    'To Do',
    'In Progress',
    'In Review',
    'Completed',
    'Blocked',
  ];

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Urgent':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-100 text-red-700 uppercase"><Flame className="w-3 h-3 text-red-600" /> Urgent</span>;
      case 'High':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">High</span>;
      case 'Medium':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">Medium</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-200 text-surface-700 uppercase">Low</span>;
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3 h-3" /> In Progress</span>;
      case 'In Review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200"><MessageSquare className="w-3 h-3" /> In Review</span>;
      case 'Blocked':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200"><AlertCircle className="w-3 h-3" /> Blocked</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-100 text-surface-600 border border-surface-200"><Tag className="w-3 h-3" /> To Do</span>;
    }
  };

  const isPartner = currentUser?.is_partner || currentUser?.role_name === 'Channel Partner';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin" />
          <span className="text-sm text-surface-400 font-medium">Loading task & ticket portal...</span>
        </div>
      </div>
    );
  }

  if (!loading && currentUser && isPartner) {
    return (
      <div className="py-16 text-center card-premium p-8 max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-surface-900">Access Restricted</h2>
        <p className="text-xs text-surface-500 mt-1">
          Channel Partners do not have access to Task & Ticket Management.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-blue-600" />
            Task Management
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="p-1 bg-surface-200/80 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'kanban'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-surface-600 hover:text-surface-900'
                }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'table'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-surface-600 hover:text-surface-900'
                }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-2.5 bg-white border border-surface-200 hover:bg-surface-50 text-surface-600 rounded-xl transition-all shadow-xs"
            title="Refresh Tasks"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
          </button>

          {isManagerOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase">Total Tasks</p>
            <h3 className="text-xl font-extrabold text-surface-900 mt-0.5">{tasks.length}</h3>
          </div>
        </div>

        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase">In Progress</p>
            <h3 className="text-xl font-extrabold text-surface-900 mt-0.5">
              {tasks.filter((t) => t.status === 'In Progress').length}
            </h3>
          </div>
        </div>

        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase">Completed</p>
            <h3 className="text-xl font-extrabold text-surface-900 mt-0.5">
              {tasks.filter((t) => t.status === 'Completed').length}
            </h3>
          </div>
        </div>

        <div className="card-premium p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase">High Priority</p>
            <h3 className="text-xl font-extrabold text-surface-900 mt-0.5">
              {tasks.filter((t) => t.priority === 'Urgent' || t.priority === 'High').length}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-premium p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ticket code, title or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-surface-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-surface-900 input-premium"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-surface-500 uppercase">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white border border-surface-200 rounded-lg text-xs font-semibold py-1.5 px-3 text-surface-800 input-premium"
            >
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-surface-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-surface-200 rounded-lg text-xs font-semibold py-1.5 px-3 text-surface-800 input-premium"
            >
              <option value="ALL">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main View: Kanban vs Table */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col);
            return (
              <div key={col} className="bg-surface-200/50 p-3 rounded-2xl border border-surface-200 min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-surface-800 uppercase tracking-wider">{col}</span>
                    <span className="w-5 h-5 rounded-full bg-surface-300 text-surface-700 text-[10px] font-extrabold flex items-center justify-center">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-surface-400 text-xs italic font-medium">
                      No tasks in {col}
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3.5 bg-white rounded-xl border border-surface-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-blue-600 group-hover:underline">
                            {t.ticket_code}
                          </span>
                          {getPriorityBadge(t.priority)}
                        </div>

                        <h4 className="text-xs font-bold text-surface-900 line-clamp-2 leading-snug">
                          {t.title}
                        </h4>

                        {t.description && (
                          <p className="text-[11px] text-surface-500 line-clamp-2">{t.description}</p>
                        )}

                        <div className="pt-2 border-t border-surface-100 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 text-surface-600 font-semibold truncate max-w-[120px]">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold flex items-center justify-center shrink-0 uppercase">
                              {(t.assignee_full_name || 'U').charAt(0)}
                            </div>
                            <span className="truncate">{t.assignee_full_name || 'Unassigned'}</span>
                          </div>

                          {t.due_date && (
                            <span className="text-surface-400 flex items-center gap-1 font-mono text-[10px]">
                              <Calendar className="w-3 h-3 text-surface-400" />
                              {t.due_date.slice(5)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="card-premium p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <ResizableTable className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Title & Description</th>
                  <th className="py-3.5 px-4">Assignee</th>
                  <th className="py-3.5 px-4">Assigned By</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-surface-800">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-surface-400 font-medium">
                      No task tickets match your query.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                        {t.ticket_code}
                      </td>

                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => setSelectedTask(t)}
                          className="font-bold text-surface-900 hover:text-blue-600 cursor-pointer"
                        >
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-surface-500 line-clamp-1 max-w-xs">{t.description}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center uppercase">
                            {(t.assignee_full_name || 'U').charAt(0)}
                          </div>
                          <span className="font-semibold text-surface-900">{t.assignee_full_name || 'Unassigned'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-surface-600 font-medium">
                        {t.assigned_by_full_name || 'System'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">{getPriorityBadge(t.priority)}</td>

                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(t.status)}</td>

                      <td className="py-3.5 px-4 text-surface-500 font-mono whitespace-nowrap">
                        {t.due_date || 'No Deadline'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTask(t)}
                            className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-surface-800 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                          >
                            <History className="w-3.5 h-3.5 text-blue-600" /> History
                          </button>
                          {isManagerOrAdmin && (
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      )}

      {/* Task Details & History Drawer / Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-end p-0 md:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-2xl h-full md:h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-surface-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 font-mono font-extrabold text-xs">
                  {selectedTask.ticket_code}
                </span>
                {getPriorityBadge(selectedTask.priority)}
              </div>

              <div className="flex items-center gap-2">
                {isManagerOrAdmin && (
                  <button
                    onClick={() => handleOpenEdit(selectedTask)}
                    className="px-3 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-bold text-surface-700 hover:bg-surface-100 transition-all flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" /> Edit Ticket
                  </button>
                )}
                <button
                  onClick={() => setSelectedTask(null)}
                  className="w-8 h-8 rounded-lg bg-white border border-surface-200 text-surface-500 hover:bg-surface-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-bold text-surface-900 leading-snug">{selectedTask.title}</h2>
                <div className="mt-3 p-4 rounded-xl border border-surface-200 bg-surface-50/50 text-sm text-surface-800 whitespace-pre-wrap font-medium">
                  {selectedTask.description || 'No additional description provided.'}
                </div>
              </div>

              {/* Status Workflow Selector */}
              <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/30 space-y-2">
                <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Update Task Workflow Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {['To Do', 'In Progress', 'In Review', 'Completed', 'Blocked'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedTask.id, st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedTask.status === st
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-surface-700 border-surface-200 hover:border-blue-300'
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meta Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-surface-200 bg-surface-50/30 text-xs">
                <div>
                  <span className="text-surface-400 font-bold uppercase block mb-1">Assignee</span>
                  <span className="font-bold text-surface-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    {selectedTask.assignee_full_name || 'Unassigned'}
                  </span>
                </div>

                <div>
                  <span className="text-surface-400 font-bold uppercase block mb-1">Assigned By</span>
                  <span className="font-semibold text-surface-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedTask.assigned_by_full_name || 'General Manager'}
                  </span>
                </div>

                <div>
                  <span className="text-surface-400 font-bold uppercase block mb-1">Due Date</span>
                  <span className="font-mono font-bold text-surface-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    {selectedTask.due_date || 'None'}
                  </span>
                </div>
              </div>

              {/* History & Comment Feed */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2 border-b border-surface-100 pb-3">
                  <History className="w-4 h-4 text-blue-600" />
                  Ticket Activity History & Comments ({selectedTask.history_logs.length})
                </h3>

                {/* Comment Input Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a progress comment or work note..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-white border border-surface-200 rounded-xl py-2 px-3.5 text-xs text-surface-900 input-premium"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" /> Comment
                  </button>
                </form>

                {/* Timeline */}
                <div className="space-y-3 pt-2">
                  {selectedTask.history_logs.length === 0 ? (
                    <div className="text-center py-6 text-xs text-surface-400">No activity history recorded yet.</div>
                  ) : (
                    selectedTask.history_logs.map((h) => (
                      <div key={h.id} className="p-3.5 rounded-xl border border-surface-200 bg-surface-50/50 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-surface-500">
                          <span className="font-bold text-surface-900">{h.user_full_name}</span>
                          <span className="font-mono text-[10px]">
                            {new Date(h.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="font-semibold text-blue-600">{h.action}</p>
                        {h.notes && (
                          <div className="mt-1 p-2 rounded.md bg-white border border-surface-200 text-surface-800 font-medium">
                            {h.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-surface-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Assign New Task Ticket
              </h2>
              <button onClick={() => setShowCreateModal(false)}><X className="w-4 h-4 text-surface-400" /></button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Q3 Amazon Inventory Sync"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Assignee Employee</label>
                  <select
                    value={createForm.assignee_id}
                    onChange={(e) => setCreateForm({ ...createForm, assignee_id: e.target.value })}
                    className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                  >
                    <option value="">-- Select Employee --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email} ({u.role?.name || 'Employee'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                  className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Task Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed instructions for the assignee employee..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-900"
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creating...' : 'Assign Task Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-surface-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Task ({editingTask.ticket_code})
              </h2>
              <button onClick={() => setEditingTask(null)}><X className="w-4 h-4 text-surface-400" /></button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Assignee Employee</label>
                  <select
                    value={editForm.assignee_id}
                    onChange={(e) => setEditForm({ ...editForm, assignee_id: e.target.value })}
                    className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                  >
                    <option value="">-- Unassigned --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Task Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs text-surface-900 input-premium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-900"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Ticket Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
