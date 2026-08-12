'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usersApi, rolesApi, authApi } from '@/lib/api';
import ResizableTable from '@/components/ResizableTable';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  UserCheck, 
  UserX, 
  Eye, 
  EyeOff,
  Banknote, 
  ShieldAlert, 
  Search,
  Briefcase
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role_id: '',
    is_admin: false,
    is_partner: false,
    is_active: true,
    personal_details: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    salary_summary: '',
    responsibilities: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const empRes = await usersApi.list().catch(() => ({ data: [] }));
      const rolesRes = await rolesApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));

      setEmployees((empRes.data || []).filter((emp: any) => !emp.is_partner));
      setRoles(rolesRes.data || []);
      setCurrentUser(meRes.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditEmp(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      role_id: roles[0]?.id ? String(roles[0].id) : '',
      is_admin: false,
      is_partner: false,
      is_active: true,
      personal_details: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      salary_summary: '',
      responsibilities: '',
    });
    setShowModal(true);
  };

  const openEditModal = (emp: any) => {
    setEditEmp(emp);
    setFormData({
      email: emp.email || '',
      password: '',
      full_name: emp.full_name || '',
      phone: emp.phone || '',
      role_id: emp.role_id ? String(emp.role_id) : '',
      is_admin: emp.is_admin || false,
      is_partner: false,
      is_active: emp.is_active ?? true,
      personal_details: emp.personal_details || '',
      bank_name: emp.bank_name || '',
      account_number: emp.account_number || '',
      ifsc_code: emp.ifsc_code || '',
      salary_summary: emp.salary_summary || '',
      responsibilities: emp.responsibilities || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        is_partner: false,
        role_id: formData.role_id ? parseInt(formData.role_id) : null,
      };
      if (!payload.password && editEmp) {
        delete payload.password;
      }

      if (editEmp) {
        await usersApi.update(editEmp.id, payload);
      } else {
        await usersApi.create(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Error saving employee');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this employee profile?')) {
      try {
        await usersApi.delete(id);
        loadData();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Error deleting employee');
      }
    }
  };

  const handleToggleActive = async (emp: any) => {
    const action = emp.is_active ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} ${emp.full_name || emp.email}?`)) {
      try {
        await usersApi.update(emp.id, { is_active: !emp.is_active });
        loadData();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || `Error trying to ${action} employee`);
      }
    }
  };

  const isAdmin = currentUser?.is_admin;
  const roleName = currentUser?.role_name || '';
  const isManager = ['General Manager', 'Operations Manager'].includes(roleName);
  const canManage = isAdmin || isManager;
  const isAllowed = hasPermission(currentUser, 'employees:read');
  const canWrite = hasPermission(currentUser, 'employees:write');

  const filteredEmployees = employees.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.full_name || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q) ||
      (item.role_name || (item.role?.name || '')).toLowerCase().includes(q)
    );
  });

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center card-premium p-8 max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-surface-900">Access Restricted</h2>
        <p className="text-xs text-surface-500 mt-1">
          Your role (<strong className="text-surface-700">{currentUser?.role_name || 'Employee'}</strong>) is restricted to your specific department.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            Company Employees
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Internal team members, department leads, and operations management ({employees.length} Members)
          </p>
        </div>

        {canWrite && (
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="card-premium p-3 flex items-center gap-2 bg-white">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees by name, email, or department role..."
          className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Employees Table */}
      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-500 font-medium">Loading employee directory...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600 font-medium">No internal employees found</p>
          </div>
        ) : (
          <div className="table-container">
            <ResizableTable className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Key Responsibilities</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Link href={`/dashboard/employees/${emp.id}`} className="group">
                        <div className="text-[13px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {emp.full_name || 'Employee'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 font-medium">{emp.email}</div>
                      </Link>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          emp.is_admin
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                            backgroundColor: emp.is_admin ? '#4f46e5' : '#2563eb'
                          }} />
                          {emp.is_admin ? 'Super Admin' : (typeof emp.role === 'object' ? emp.role?.name : emp.role) || emp.role_name || 'Staff'}
                        </span>
                        {!emp.is_active && (
                          <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[12px] text-slate-600 font-normal max-w-xs truncate">
                      {emp.responsibilities || emp.role?.description || 'Internal Operations'}
                    </td>
                    <td className="py-3 px-4 text-[12px] text-slate-600 font-medium whitespace-nowrap">
                      {emp.phone || '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <Link
                            href={`/dashboard/employees/${emp.id}`}
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="View Full HR Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleToggleActive(emp)}
                            className={`p-1.5 rounded-md transition-all ${emp.is_active
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            title={emp.is_active ? 'Deactivate Employee' : 'Activate Employee'}
                          >
                            {emp.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </div>

      {/* Edit / Create Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                {editEmp ? 'Edit Company Employee' : 'Add New Company Employee'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-slate-900 input-premium"
                    placeholder="e.g. Alex Rivera"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-slate-900 input-premium"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Password {editEmp && '(optional)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editEmp}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-white rounded-lg py-2 pl-3 pr-10 text-sm text-slate-900 input-premium"
                      placeholder="Enter employee password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Phone Contact</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-slate-900 input-premium"
                    placeholder="+1 (800) 555-0199"
                  />
                </div>
              </div>

              {canManage && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Role *</label>
                    <select
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                      className="w-full bg-white rounded-lg py-2 px-3 text-sm text-slate-900 input-premium"
                    >
                      <option value="">Default Staff</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-4 pt-5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_admin_check"
                        checked={formData.is_admin}
                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="is_admin_check" className="text-xs font-bold text-slate-700 cursor-pointer">
                        Super Admin
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active_check"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="is_active_check" className="text-xs font-bold text-slate-700 cursor-pointer">
                        Active Account
                      </label>
                    </div>
                  </div>
                </div>
              )}



              {/* Key Responsibilities */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Key Role Responsibilities
                </label>
                <textarea
                  rows={2}
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-xs text-slate-900 input-premium"
                  placeholder="e.g. Oversees inventory stock, handles procurement..."
                />
              </div>

              {/* Salary Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Employee Salary & Package Summary
                </label>
                <textarea
                  rows={2}
                  value={formData.salary_summary}
                  onChange={(e) => setFormData({ ...formData, salary_summary: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-xs text-slate-900 input-premium"
                  placeholder="e.g. Base Salary: $85,000 / year + Performance Bonus"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editEmp ? 'Save Changes' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
