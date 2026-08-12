'use client';

import React, { useEffect, useState } from 'react';
import { accountsApi, usersApi, authApi } from '@/lib/api';
import ResizableTable from '@/components/ResizableTable';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  ShieldAlert, 
  Users, 
  Truck, 
  FileCheck, 
  CheckCircle2, 
  X,
  Store
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editAcc, setEditAcc] = useState<any>(null);

  // Form state including dynamic required documents & shipping
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'Partner',
    user_id: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    notes: '',
    shipping_enabled: true,
    default_shipping_partner: 'FedEx Express',
  });

  // Dynamic Document Checklist Builder State
  const [docChecklist, setDocChecklist] = useState<{ type: string; desc: string; required: boolean }[]>([]);
  const [newDocType, setNewDocType] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocReq, setNewDocReq] = useState(true);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await accountsApi.list(search);
      const usersRes = await usersApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      setAccounts(res.data || []);
      setUsersList(usersRes.data || []);
      setCurrentUser(meRes?.data || null);
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
      user_id: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      notes: '',
      shipping_enabled: true,
      default_shipping_partner: 'FedEx Express',
    });
    setDocChecklist([
      { type: 'GSTIN Certificate', desc: 'GSTIN Tax Registration Certificate', required: true },
      { type: 'PAN Card', desc: 'Permanent Account Number Card', required: true },
      { type: 'Bank Cancelled Cheque', desc: 'Bank Payout Cancelled Cheque', required: true },
    ]);
    setShowModal(true);
  };

  const openEditModal = (acc: any) => {
    setEditAcc(acc);
    const linkedUser = usersList.find((u: any) => u.account_name === acc.account_name || u.account_id === acc.id);
    setFormData({
      account_name: acc.account_name || '',
      account_type: acc.account_type || 'Partner',
      user_id: linkedUser ? String(linkedUser.id) : '',
      bank_name: acc.bank_name || '',
      account_number: acc.account_number || '',
      ifsc_code: acc.ifsc_code || '',
      branch_name: acc.branch_name || '',
      notes: acc.notes || '',
      shipping_enabled: acc.shipping_enabled ?? true,
      default_shipping_partner: acc.default_shipping_partner || 'FedEx Express',
    });

    try {
      if (acc.required_documents) {
        setDocChecklist(JSON.parse(acc.required_documents));
      } else {
        setDocChecklist([
          { type: 'GSTIN Certificate', desc: 'GSTIN Tax Registration Certificate', required: true },
          { type: 'PAN Card', desc: 'Permanent Account Number Card', required: true },
          { type: 'Bank Cancelled Cheque', desc: 'Bank Payout Cancelled Cheque', required: true },
        ]);
      }
    } catch {
      setDocChecklist([]);
    }

    setShowModal(true);
  };

  const handleAddChecklistItem = () => {
    if (!newDocType.trim()) return;
    setDocChecklist([
      ...docChecklist,
      { type: newDocType.trim(), desc: newDocDesc.trim() || `${newDocType.trim()} Verification`, required: newDocReq },
    ]);
    setNewDocType('');
    setNewDocDesc('');
    setNewDocReq(true);
  };

  const handleRemoveChecklistItem = (idx: number) => {
    setDocChecklist(docChecklist.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { user_id, ...accPayload } = formData;
      const payload = {
        ...accPayload,
        required_documents: JSON.stringify(docChecklist),
      };

      let targetAccId = editAcc?.id;

      if (editAcc) {
        await accountsApi.update(editAcc.id, payload);
      } else {
        const res = await accountsApi.create(payload);
        targetAccId = res.data?.id;
      }

      // If user_id selected, link user to this account
      if (user_id) {
        await usersApi.update(parseInt(user_id), {
          account_id: targetAccId,
          account_name: formData.account_name,
          is_partner: formData.account_type === 'Partner',
        });
      }

      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert('Error saving account');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this account?')) {
      try {
        await accountsApi.delete(id);
        fetchAccounts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const roleName = currentUser?.role_name || (currentUser?.is_admin ? 'Super Admin' : 'Employee');
  const isAllowed = hasPermission(currentUser, 'accounts:read');
  const canEdit = hasPermission(currentUser, 'accounts:write');

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center card-premium p-8 max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-surface-900">Access Restricted</h2>
        <p className="text-xs text-surface-500 mt-1">
          Your role (<strong className="text-surface-700">{roleName}</strong>) is restricted to your specific department.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            Marketplaces, Accounts & Compliance Requirements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure partner stores, shipping logistics carriers, and dynamic document compliance checklists
          </p>
        </div>
        {canEdit && (
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Marketplace Account</span>
          </button>
        )}
      </div>

      {/* Info Callout */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <span className="font-bold">Dynamic Marketplace Configuration:</span> Define shipping logistics defaults (With Shipping vs Self Fulfillment) and customize required compliance document checklist fields for each marketplace.
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card-premium p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts, marketplaces, or bank data..."
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Accounts Table */}
      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-500">Loading accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <ResizableTable className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Account / Marketplace</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Account Type</th>
                  <th className="py-3.5 px-4">Shipping Mode & Carrier</th>
                  <th className="py-3.5 px-4">Required Documents</th>
                  <th className="py-3.5 px-4">Bank & IFSC</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => {
                  let parsedDocs: any[] = [];
                  try {
                    if (acc.required_documents) parsedDocs = JSON.parse(acc.required_documents);
                  } catch {}

                  return (
                    <tr key={acc.id} className="table-row-hover">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Store className="w-4 h-4 text-amber-600" />
                          {acc.account_name}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">{acc.notes || 'Marketplace Account'}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          acc.account_type === 'User'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : acc.account_type === 'Partner'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {acc.account_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {acc.shipping_enabled ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>With Shipping ({acc.default_shipping_partner || 'FedEx'})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                            <span>Without Shipping (Self Fulfillment)</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {parsedDocs.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                            <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                            {parsedDocs.length} Document Fields Configured
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Default Standard Checklist</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{acc.bank_name || 'N/A'}</div>
                        <div className="text-slate-500 font-medium">A/C: {acc.account_number || '—'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(acc)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                              title="Edit Account & Required Documents"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(acc.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </div>

      {/* Modal Form for Managing Marketplace Account & Dynamic Document Requirements */}
      {showModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {editAcc ? 'Edit Marketplace Account & Compliance Rules' : 'Add New Marketplace Account'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Marketplace Account Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    className="w-full bg-white rounded-xl py-2 px-3 text-xs text-slate-900 input-premium"
                    placeholder="e.g. JioMart Seller Hub"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Account Category *
                  </label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full bg-white rounded-xl py-2 px-3 text-xs text-slate-900 input-premium"
                  >
                    <option value="Partner">Partner Store Account</option>
                    <option value="User">User / Internal Account</option>
                    <option value="3rd Party">3rd Party Marketplace</option>
                  </select>
                </div>
              </div>

              {/* SHIPPING LOGISTICS CONFIGURATION */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Shipping & Dispatch Logistics Partner Setup
                </h3>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="shipping_enabled_check"
                      checked={formData.shipping_enabled}
                      onChange={(e) => setFormData({ ...formData, shipping_enabled: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="shipping_enabled_check" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Operates With Courier Shipping
                    </label>
                  </div>

                  {formData.shipping_enabled && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Preferred Shipping Carrier</label>
                      <select
                        value={formData.default_shipping_partner}
                        onChange={(e) => setFormData({ ...formData, default_shipping_partner: e.target.value })}
                        className="w-full bg-white rounded-lg py-1.5 px-2.5 text-xs text-slate-900 border border-slate-200 outline-none font-bold"
                      >
                        <option value="FedEx Express">FedEx Express</option>
                        <option value="BlueDart Express">BlueDart Express</option>
                        <option value="DHL Worldwide">DHL Worldwide Logistics</option>
                        <option value="Delhivery">Delhivery Courier</option>
                        <option value="Ecom Express">Ecom Express</option>
                        <option value="Self Fulfillment">Self Fulfillment / Local Dispatch</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* DYNAMIC REQUIRED DOCUMENTS CONFIGURATION */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-amber-600" />
                    Dynamic Required Compliance Documents Checklist
                  </h3>
                  <span className="text-[11px] font-bold text-amber-800">{docChecklist.length} Configured Fields</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {docChecklist.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-amber-200/80 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {doc.type}
                          {doc.required && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-extrabold">Mandatory</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">{doc.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Document Field Controls */}
                <div className="p-3 bg-white rounded-xl border border-amber-200/90 space-y-2">
                  <div className="text-[11px] font-bold text-amber-900">Add Custom Document Field Requirement:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="e.g. FSSAI License / Trade License"
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Description / Guidance notes"
                      value={newDocDesc}
                      onChange={(e) => setNewDocDesc(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 outline-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newDocReq}
                          onChange={(e) => setNewDocReq(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-600 rounded cursor-pointer"
                        />
                        Mandatory
                      </label>
                      <button
                        type="button"
                        onClick={handleAddChecklistItem}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                      >
                        + Add Field
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* BANK & NOTES */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full bg-white rounded-xl py-2 px-3 text-xs text-slate-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full bg-white rounded-xl py-2 px-3 text-xs font-mono text-slate-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                    className="w-full bg-white rounded-xl py-2 px-3 text-xs font-mono text-slate-900 input-premium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editAcc ? 'Save Marketplace Settings' : 'Create Marketplace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
