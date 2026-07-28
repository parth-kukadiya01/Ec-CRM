'use client';

import React, { useEffect, useState } from 'react';
import { accountsApi } from '@/lib/api';
import { Building2, Plus, Edit2, Trash2, Banknote, Search, ShieldCheck } from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editAcc, setEditAcc] = useState<any>(null);

  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'Partner', // User, Partner, 3rd Party
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    notes: '',
  });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await accountsApi.list(search);
      setAccounts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [search]);

  const openCreateModal = () => {
    setEditAcc(null);
    setFormData({
      account_name: '',
      account_type: 'Partner',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (acc: any) => {
    setEditAcc(acc);
    setFormData({
      account_name: acc.account_name || '',
      account_type: acc.account_type || 'Partner',
      bank_name: acc.bank_name || '',
      account_number: acc.account_number || '',
      ifsc_code: acc.ifsc_code || '',
      branch_name: acc.branch_name || '',
      notes: acc.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editAcc) {
        await accountsApi.update(editAcc.id, formData);
      } else {
        await accountsApi.create(formData);
      }
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert('Error saving account');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await accountsApi.delete(id);
        fetchAccounts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-rose-600" />
            Accounts Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage partner accounts, user accounts, and 3rd party integration channels with bank info</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-rose-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Account</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-xs">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search account name..."
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No accounts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Account Name</th>
                  <th className="py-3.5 px-4">Account Type</th>
                  <th className="py-3.5 px-4">Bank Name & Branch</th>
                  <th className="py-3.5 px-4">Account Number / IFSC</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{acc.account_name}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        acc.account_type === 'User'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : acc.account_type === 'Partner'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-semibold text-slate-800">{acc.bank_name || 'N/A'}</div>
                      <div className="text-slate-500">{acc.branch_name || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      <div>A/C: {acc.account_number || '—'}</div>
                      <div className="text-slate-500">IFSC: {acc.ifsc_code || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">{acc.notes || '—'}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(acc)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-rose-600" />
              {editAcc ? 'Edit Account' : 'Create New Account'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                  placeholder="e.g. Amazon Store Account"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Account Type *</label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-600"
                >
                  <option value="User">User Account</option>
                  <option value="Partner">Partner Store Account</option>
                  <option value="3rd Party">3rd Party Channel</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-600"
                  placeholder="Enter details about this channel/account..."
                />
              </div>

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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  {editAcc ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
