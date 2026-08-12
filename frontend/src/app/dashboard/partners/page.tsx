'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usersApi, authApi, accountsApi } from '@/lib/api';
import ResizableTable from '@/components/ResizableTable';
import {
  Store,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  Search,
  ShieldAlert,
  Building2,
  FileCheck,
  Users,
  ChevronRight,
  Clock
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';

export default function ChannelPartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const empRes = await usersApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      const accRes = await accountsApi.list().catch(() => ({ data: [] }));

      const allUsers = empRes.data || [];
      const partnerUsers = allUsers.filter((u: any) => u.is_partner);

      setPartners(partnerUsers);
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

  const handleDelete = async (id: number) => {
    if (confirm('Delete this channel partner account?')) {
      try {
        await usersApi.delete(id);
        loadData();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Error deleting partner');
      }
    }
  };

  const handleToggleActive = async (partner: any) => {
    const action = partner.is_active ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} ${partner.full_name || partner.email}?`)) {
      try {
        await usersApi.update(partner.id, { is_active: !partner.is_active });
        loadData();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || `Error trying to ${action} partner`);
      }
    }
  };

  const isAllowed = true;
  const canWrite = currentUser?.is_admin || hasPermission(currentUser, 'employees:write');

  const filteredPartners = partners.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.full_name || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q) ||
      (item.account_name || '').toLowerCase().includes(q) ||
      (item.assigned_employee_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header (Blue Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Store className="w-5 h-5" />
            </div>
            Channel Partners Directory
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            External marketplace seller accounts & assigned internal employee leads ({partners.length} Partners)
          </p>
        </div>

        {canWrite && (
          <Link href="/dashboard/partners/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Create New Partner</span>
          </Link>
        )}
      </div>

      {/* Info Callout
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold">Streamlined Admin & Employee Workflow:</span> Admin creates basic partner profile and assigns an internal employee lead. The assigned employee completes the onboarding process and uploads compliance documents.
          </div>
        </div>
      </div> */}

      {/* Search Filter Bar */}
      <div className="card-premium p-3 flex items-center gap-2 bg-white border border-slate-200">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search partners by representative name, store account, email, or assigned employee..."
          className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Partners Table (Blue & White Theme) */}
      <div className="card-premium overflow-hidden bg-white border border-slate-200">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-500 font-medium">Loading channel partners...</span>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Store className="w-12 h-12 text-blue-400 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-800">No channel partner accounts found</p>
              <p className="text-xs text-slate-500 mt-0.5">Click Create New Partner to register a seller manager</p>
            </div>
            {canWrite && (
              <Link href="/dashboard/partners/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                <Plus className="w-4 h-4" />
                <span>Create New Partner</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto table-container">
            <ResizableTable className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Partner Representative</th>
                  <th className="py-3.5 px-4">Marketplace Account</th>
                  <th className="py-3.5 px-4">Assigned Employee Lead</th>
                  <th className="py-3.5 px-4">Onboarding Stage</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Link href={`/dashboard/partners/${partner.id}`} className="group">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {partner.full_name || 'Partner Manager'}
                        </div>
                        <div className="text-xs font-mono text-slate-500 font-medium">{partner.email}</div>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {partner.account_name ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200/90 text-xs font-bold">
                          <Store className="w-3.5 h-3.5 text-blue-600" />
                          {partner.account_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unassigned Store</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {partner.assigned_employee_name ? (
                        <span className="text-xs font-bold text-slate-800">{partner.assigned_employee_name}</span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                        <Clock className="w-3 h-3 text-blue-600" />
                        {partner.onboarding_status || 'Draft'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${partner.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {partner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/partners/${partner.id}`}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Onboarding Workspace</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        {canWrite && (
                          <button
                            onClick={() => handleToggleActive(partner)}
                            className={`p-1.5 rounded-md transition-all ${partner.is_active
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            title={partner.is_active ? 'Deactivate Partner' : 'Activate Partner'}
                          >
                            {partner.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => handleDelete(partner.id)}
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
    </div>
  );
}
