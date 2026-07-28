'use client';

import React, { useEffect, useState } from 'react';
import { usersApi, rolesApi, authApi, accountsApi } from '@/lib/api';
import { Users, Plus, Shield, Edit2, Trash2, CreditCard, UserCheck, Banknote, Building2, Store } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<any>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role_id: '',
    is_admin: false,
    is_partner: false,
    account_id: '',
    personal_details: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    salary_summary: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const empRes = await usersApi.list().catch(() => ({ data: [] }));
      const rolesRes = await rolesApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      const accRes = await accountsApi.list().catch(() => ({ data: [] }));

      setEmployees(empRes.data || []);
      setRoles(rolesRes.data || []);
      setCurrentUser(meRes.data || null);
      setAccounts(accRes.data || []);
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
      account_id: '',
      personal_details: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      salary_summary: '',
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
      is_partner: emp.is_partner || false,
      account_id: emp.account_id ? String(emp.account_id) : '',
      personal_details: emp.personal_details || '',
      bank_name: emp.bank_name || '',
      account_number: emp.account_number || '',
      ifsc_code: emp.ifsc_code || '',
      salary_summary: emp.salary_summary || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        role_id: formData.role_id ? parseInt(formData.role_id) : null,
        account_id: formData.account_id ? parseInt(formData.account_id) : null,
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
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await usersApi.delete(id);
        loadData();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Error deleting user');
      }
    }
  };

  const isAdmin = currentUser?.is_admin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-cyan-600" />
            Employee & Partner User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage team members, channel partners, account linkage, personal info, bank details, and role permissions</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Employee / Partner</span>
          </button>
        )}
      </div>

      {/* Employees Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading team employees & partners...</div>
        ) : employees.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No employee users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Role & Access</th>
                  <th className="py-3.5 px-4">Linked Account / Partner</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Bank Details</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-bold text-xs">
                          {(emp.full_name || emp.email || 'E').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{emp.full_name || emp.email || 'Employee'}</div>
                          <div className="text-xs font-mono text-slate-500">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        emp.is_admin
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : emp.is_partner
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {emp.is_admin ? 'Super Admin' : emp.is_partner ? 'Channel Partner' : (typeof emp.role === 'object' ? emp.role?.name : emp.role) || emp.role_name || 'Employee'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      {emp.account_name ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          <Store className="w-3 h-3 text-blue-600" />
                          {emp.account_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">All Accounts (Admin)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{emp.phone || 'No phone'}</div>
                      <div className="text-slate-500 max-w-xs truncate">{emp.personal_details || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                      {emp.bank_name ? (
                        <div>
                          <div className="text-slate-900 font-semibold">{emp.bank_name}</div>
                          <div className="text-slate-500">A/C: {emp.account_number}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {(isAdmin || currentUser?.id === emp.id) && (
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-cyan-600" />
              {editEmp ? `Edit Employee Profile (${editEmp.full_name || editEmp.email || ''})` : 'Create New Employee / Partner User'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!isAdmin && !!editEmp}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Password {editEmp && '(Leave blank to keep unchanged)'}
                  </label>
                  <input
                    type="password"
                    required={!editEmp}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
              </div>

              {/* Channel Partner & Account Linking Section */}
              {isAdmin && (
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_partner_check"
                      checked={formData.is_partner}
                      onChange={(e) => setFormData({ ...formData, is_partner: e.target.checked, is_admin: e.target.checked ? false : formData.is_admin })}
                      className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <label htmlFor="is_partner_check" className="text-xs font-bold text-slate-900">
                      Is Channel Partner / Restricted Account User?
                    </label>
                  </div>

                  {formData.is_partner && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Select Linked Account *</label>
                      <select
                        value={formData.account_id}
                        onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                        required={formData.is_partner}
                      >
                        <option value="">-- Choose Account --</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_name} ({acc.account_type}) - Owner: {acc.owner_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-blue-700 mt-1 font-medium">
                        When this partner user logs in, their dashboard and order lists will show ONLY details for this assigned account.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Select Role & Permissions *</label>
                    <select
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-600"
                    >
                      <option value="">No Role / Default</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.permissions?.length || 0} permissions)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_admin_check"
                      checked={formData.is_admin}
                      onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked, is_partner: e.target.checked ? false : formData.is_partner })}
                      className="w-4 h-4 rounded bg-white border-slate-300 text-cyan-600 focus:ring-0"
                    />
                    <label htmlFor="is_admin_check" className="text-xs font-semibold text-slate-800">
                      Super Admin (Full Access to All Accounts)
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Personal Details (Address, Emergency Contacts)</label>
                <textarea
                  rows={2}
                  value={formData.personal_details}
                  onChange={(e) => setFormData({ ...formData, personal_details: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Address, DOB, emergency contact info..."
                />
              </div>

              {isAdmin && (
                <>
                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-600" /> Bank Details
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                          placeholder="e.g. HDFC Bank"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={formData.account_number}
                          onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={formData.ifsc_code}
                          onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Salary Summary</label>
                    <input
                      type="text"
                      value={formData.salary_summary}
                      onChange={(e) => setFormData({ ...formData, salary_summary: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="e.g. Base: $4,500/mo, Allowance: $500, Deductions: $200"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  {editEmp ? 'Save Employee Changes' : 'Create User / Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
