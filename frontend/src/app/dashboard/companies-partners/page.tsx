'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { companiesApi, partnersMgmtApi, authApi } from '@/lib/api';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  ShieldAlert,
  X,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Briefcase,
  FileText,
  Percent,
  Globe,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Wallet,
  Hash,
  User,
  NotebookText,
  Layers,
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';

function HandshakeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m11 17 2 2a1 1 0 0 0 1.4 0l5.6-5.6a1 1 0 0 0 0-1.4l-2-2" />
      <path d="m14 14 2.5 2.5" />
      <path d="M18 10 9.3 1.3a1 1 0 0 0-1.4 0L1.3 7.9a1 1 0 0 0 0 1.4L6 14" />
      <path d="m3.5 10.5 4 4" />
      <path d="m5 12 2.5 2.5" />
    </svg>
  );
}

const BANK_PLATFORM_OPTIONS = ['', 'Payoneer', 'PayPal', 'PingPong', 'Wise', 'Bank Transfer', 'Other'];

export default function CompaniesPartnersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Companies State
  const [companies, setCompanies] = useState<any[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyModal, setCompanyModal] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    joining_date: '',
    is_rbs: true,
    rbs_type: 'Debit', // 'Credit' | 'Debit'
    contact_person: '', contact_phone: '', contact_email: '',
    bank_name: '', account_number: '', ifsc_code: '', branch_name: '',
    address: '', city: '', state: '', pincode: '',
    bank_platform: '', virtual_account_no: '', routing_no: '',
    accountant_name: '', bank_data: '', account_mail: '',
    notes: '',
  });

  // Partners State
  const [partners, setPartners] = useState<any[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [partnerModal, setPartnerModal] = useState(false);
  const [editPartner, setEditPartner] = useState<any>(null);
  const [partnerForm, setPartnerForm] = useState({
    partner_name: '',
    joining_date: '',
    partner_type: 'Service',
    partner_share_percentage: 0,
    is_rbs: true,
    rbs_type: 'Credit', // 'Credit' | 'Debit'
    contact_person: '', contact_phone: '', contact_email: '',
    bank_name: '', account_number: '', ifsc_code: '', branch_name: '',
    address: '', city: '', state: '', pincode: '',
    bank_platform: '', virtual_account_no: '', routing_no: '',
    accountant_name: '', bank_data: '', account_mail: '',
    notes: '',
  });

  useEffect(() => {
    authApi.getMe().then(r => setCurrentUser(r.data)).catch(() => { });
  }, []);

  const fetchCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const res = await companiesApi.list();
      setCompanies(res.data || []);
    } catch (err) { console.error(err); }
    finally { setCompaniesLoading(false); }
  };

  const fetchPartners = async () => {
    setPartnersLoading(true);
    try {
      const res = await partnersMgmtApi.list();
      setPartners(res.data || []);
    } catch (err) { console.error(err); }
    finally { setPartnersLoading(false); }
  };

  useEffect(() => {
    fetchCompanies();
    fetchPartners();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const roleName = currentUser?.role_name || (currentUser?.is_admin ? 'Super Admin' : 'Employee');
  const isAllowed = currentUser?.is_admin || hasPermission(currentUser, 'accounts:read');
  const canEdit = currentUser?.is_admin || hasPermission(currentUser, 'accounts:write');

  // ========== Company Handlers ==========
  const openCreateCompany = () => {
    setEditCompany(null);
    setCompanyForm({
      company_name: '',
      joining_date: new Date().toISOString().split('T')[0],
      is_rbs: true,
      rbs_type: 'Debit',
      contact_person: '', contact_phone: '', contact_email: '',
      bank_name: '', account_number: '', ifsc_code: '', branch_name: '',
      address: '', city: '', state: '', pincode: '',
      bank_platform: '', virtual_account_no: '', routing_no: '',
      accountant_name: '', bank_data: '', account_mail: '',
      notes: '',
    });
    setCompanyModal(true);
  };

  const openEditCompany = (c: any) => {
    setEditCompany(c);
    setCompanyForm({
      company_name: c.company_name || '',
      joining_date: c.joining_date || c.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      is_rbs: true,
      rbs_type: 'Debit',
      contact_person: c.contact_person || '',
      contact_phone: c.contact_phone || '',
      contact_email: c.contact_email || '',
      bank_name: c.bank_name || '',
      account_number: c.account_number || '',
      ifsc_code: c.ifsc_code || '',
      branch_name: c.branch_name || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      pincode: c.pincode || '',
      bank_platform: c.bank_platform || '',
      virtual_account_no: c.virtual_account_no || '',
      routing_no: c.routing_no || '',
      accountant_name: c.accountant_name || '',
      bank_data: c.bank_data || '',
      account_mail: c.account_mail || '',
      notes: c.notes || '',
    });
    setCompanyModal(true);
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...companyForm,
        joining_date: companyForm.joining_date || new Date().toISOString().split('T')[0],
        rbs_type: 'Debit',
        is_rbs: true,
      };
      if (editCompany) {
        await companiesApi.update(editCompany.id, payload);
      } else {
        await companiesApi.create(payload);
      }
      setCompanyModal(false);
      fetchCompanies();
    } catch (err) {
      console.error(err);
      alert('Error saving company');
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (confirm('Are you sure you want to delete this company?')) {
      try {
        setCompanies(prev => prev.filter(c => c.id !== id));
        await companiesApi.delete(id);
        fetchCompanies();
      } catch (err: any) {
        console.error(err);
        alert(err?.response?.data?.detail || 'Failed to delete company');
        fetchCompanies();
      }
    }
  };

  // ========== Partner Handlers ==========
  const openCreatePartner = () => {
    setEditPartner(null);
    setPartnerForm({
      partner_name: '',
      joining_date: new Date().toISOString().split('T')[0],
      partner_type: 'Service',
      partner_share_percentage: 0,
      is_rbs: true,
      rbs_type: 'Credit',
      contact_person: '', contact_phone: '', contact_email: '',
      bank_name: '', account_number: '', ifsc_code: '', branch_name: '',
      address: '', city: '', state: '', pincode: '',
      bank_platform: '', virtual_account_no: '', routing_no: '',
      accountant_name: '', bank_data: '', account_mail: '',
      notes: '',
    });
    setPartnerModal(true);
  };

  const openEditPartner = (p: any) => {
    setEditPartner(p);
    setPartnerForm({
      partner_name: p.partner_name || '',
      joining_date: p.joining_date || p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      partner_type: p.partner_type || 'Service',
      partner_share_percentage: p.partner_share_percentage || 0,
      is_rbs: true,
      rbs_type: 'Credit',
      contact_person: p.contact_person || '',
      contact_phone: p.contact_phone || '',
      contact_email: p.contact_email || '',
      bank_name: p.bank_name || '',
      account_number: p.account_number || '',
      ifsc_code: p.ifsc_code || '',
      branch_name: p.branch_name || '',
      address: p.address || '',
      city: p.city || '',
      state: p.state || '',
      pincode: p.pincode || '',
      bank_platform: p.bank_platform || '',
      virtual_account_no: p.virtual_account_no || '',
      routing_no: p.routing_no || '',
      accountant_name: p.accountant_name || '',
      bank_data: p.bank_data || '',
      account_mail: p.account_mail || '',
      notes: p.notes || '',
    });
    setPartnerModal(true);
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...partnerForm,
        joining_date: partnerForm.joining_date || new Date().toISOString().split('T')[0],
        partner_share_percentage: parseFloat(String(partnerForm.partner_share_percentage)) || 0,
        rbs_type: 'Credit',
        is_rbs: true,
      };
      if (editPartner) {
        await partnersMgmtApi.update(editPartner.id, payload);
      } else {
        await partnersMgmtApi.create(payload);
      }
      setPartnerModal(false);
      fetchPartners();
    } catch (err) {
      console.error(err);
      alert('Error saving partner');
    }
  };

  const handleDeletePartner = async (id: number) => {
    if (confirm('Are you sure you want to delete this partner?')) {
      try {
        setPartners(prev => prev.filter(p => p.id !== id));
        await partnersMgmtApi.delete(id);
        fetchPartners();
      } catch (err: any) {
        console.error(err);
        alert(err?.response?.data?.detail || 'Failed to delete partner');
        fetchPartners();
      }
    }
  };

  // All Entities (Combined Companies & Partners)
  const allEntities = useMemo(() => {
    const list: Array<any> = [
      ...companies.map((c) => ({
        ...c,
        _type: 'Company' as const,
        displayName: c.company_name,
      })),
      ...partners.map((p) => ({
        ...p,
        _type: 'Partner' as const,
        displayName: p.partner_name,
      })),
    ];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((item) =>
      item.displayName?.toLowerCase().includes(q) ||
      item.contact_person?.toLowerCase().includes(q) ||
      item.contact_email?.toLowerCase().includes(q) ||
      item.contact_phone?.toLowerCase().includes(q) ||
      item.bank_platform?.toLowerCase().includes(q) ||
      item.city?.toLowerCase().includes(q) ||
      item._type?.toLowerCase().includes(q) ||
      item.rbs_type?.toLowerCase().includes(q) ||
      item.partner_type?.toLowerCase().includes(q)
    );
  }, [companies, partners, search]);

  const totalPages = Math.ceil(allEntities.length / pageSize) || 1;
  const paginatedList = allEntities.slice((page - 1) * pageSize, page * pageSize);

  if (currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center bg-white border border-[#c3c4c7] p-8 max-w-lg mx-auto mt-10 rounded-sm shadow-xs">
        <ShieldAlert className="w-12 h-12 text-[#d63638] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1d2327]">Access Restricted</h2>
        <p className="text-xs text-[#50575e] mt-1">
          Your role (<strong className="text-[#1d2327]">{roleName}</strong>) does not have permission to manage companies & partners.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-[#c3c4c7] shadow-xs rounded-sm">
        <div>
          <h1 className="text-xl font-bold text-[#1d2327] flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-[#2271b1] flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            Companies & Partners Directory
          </h1>
          <p className="text-xs text-[#50575e] mt-0.5">
            Manage your companies and partner entities. Link them to accounts during account creation.
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={openCreateCompany}
              className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm shadow-xs transition-all flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              <span>Add Company</span>
            </button>
            <button
              onClick={openCreatePartner}
              className="px-3.5 py-1.5 bg-[#dba617] hover:bg-[#b8890e] text-white text-xs font-bold rounded-sm shadow-xs transition-all flex items-center gap-1.5"
            >
              <HandshakeIcon className="w-4 h-4" />
              <span>Add Partner</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Summary Bar */}
      <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-3 shadow-xs rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-[#50575e] absolute left-3 top-2" />
          <input
            type="text"
            placeholder="Search companies & partners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-[#8c8f94] text-xs font-semibold pl-9 pr-3 py-1 rounded-sm focus:border-[#2271b1] outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#50575e]">
          <span className="px-2 py-0.5 bg-white border border-[#c3c4c7] rounded-xs">{allEntities.length} Total</span>
          <span className="text-[#2271b1]">{companies.length} Companies</span>
          <span>•</span>
          <span className="text-[#dba617]">{partners.length} Partners</span>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
        {companiesLoading || partnersLoading ? (
          <div className="py-16 text-center">
            <div className="w-7 h-7 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-[#50575e] font-semibold">Loading directory...</span>
          </div>
        ) : allEntities.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-[#a7aaad] mx-auto mb-2" />
            <p className="text-xs text-[#50575e]">No companies or partners found.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f6f7f7] text-[#2c3338] text-[11px] font-bold uppercase tracking-wider border-b border-[#c3c4c7]">
                    <th className="py-3 px-3 min-w-[180px]">Name</th>
                    <th className="py-3 px-3 min-w-[110px]">Type</th>
                    <th className="py-3 px-3 min-w-[110px]">Joining Date</th>
                    <th className="py-3 px-3 min-w-[80px] text-center">RBS</th>
                    <th className="py-3 px-3 min-w-[110px] text-center">Share</th>
                    <th className="py-3 px-3 min-w-[130px]">Contact Person</th>
                    <th className="py-3 px-3 min-w-[110px]">Phone</th>
                    <th className="py-3 px-3 min-w-[150px]">Email</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {paginatedList.map((item) => (
                    <tr key={`${item._type}-${item.id}`} className="hover:bg-[#f6f7f7] border-b border-[#e0e0e0]">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-[#1d2327] text-xs">{item.displayName}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        {item._type === 'Company' ? (
                          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#2271b1]/10 text-[#2271b1] border border-[#2271b1]/30 inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> Company
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#dba617]/10 text-[#8c6700] border border-[#dba617]/40 inline-flex items-center gap-1">
                            <HandshakeIcon className="w-3 h-3" /> Partner
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono font-semibold text-[#50575e]">
                        {item.joining_date || item.created_at?.split('T')[0] || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.rbs_type === 'Credit' ? (
                          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Credit
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Debit
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs">
                        {item._type === 'Partner' ? (
                          item.partner_share_percentage ? (
                            <span className="font-mono font-bold text-[#dba617]">{item.partner_share_percentage}%</span>
                          ) : (
                            <span className="text-[#50575e] font-semibold">{item.partner_type || 'Service'}</span>
                          )
                        ) : (
                          <span className="text-[#a7aaad]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-semibold text-[#1d2327]">{item.contact_person || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-[#50575e]">{item.contact_phone || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-[#2271b1] truncate max-w-[160px]">{item.contact_email || '—'}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => item._type === 'Company' ? openEditCompany(item) : openEditPartner(item)}
                              className="p-1 rounded-sm text-[#50575e] hover:text-[#2271b1] hover:bg-[#f0f0f1] transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => item._type === 'Company' ? handleDeleteCompany(item.id) : handleDeletePartner(item.id)}
                              className="p-1 rounded-sm text-[#50575e] hover:text-[#d63638] hover:bg-[#f0f0f1] transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : <span className="text-xs text-[#a7aaad] italic">View Only</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-[#f6f7f7] border-t border-[#c3c4c7] px-4 py-3 flex items-center justify-between text-xs text-[#50575e]">
              <span className="font-semibold">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, allEntities.length)} of {allEntities.length}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="px-2.5 py-1 bg-white border border-[#c3c4c7] text-[#2c3338] font-bold rounded-sm hover:bg-[#f0f0f1] disabled:opacity-40 transition-all flex items-center gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="font-bold text-[#1d2327]">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page >= totalPages} className="px-2.5 py-1 bg-white border border-[#c3c4c7] text-[#2c3338] font-bold rounded-sm hover:bg-[#f0f0f1] disabled:opacity-40 transition-all flex items-center gap-1">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================== COMPANY MODAL ======================== */}
      {companyModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4 bg-black/50">
          <div className="modal-content bg-white border border-[#c3c4c7] w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#c3c4c7] bg-[#f6f7f7] flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-[#1d2327] flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-[#2271b1]" />
                {editCompany ? `Edit Company: ${editCompany.company_name}` : 'Add New Company'}
              </h2>
              <button onClick={() => setCompanyModal(false)} className="text-[#50575e] hover:text-[#1d2327] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompanySubmit} className="p-5 space-y-5 overflow-y-auto text-xs">
              {/* Basic Information */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <FileText className="w-4 h-4 text-[#2271b1]" />
                  Company Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Company Name *</label>
                    <input type="text" required value={companyForm.company_name} onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. ADBH Enterprises" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Joining Date</label>
                    <input type="date" value={companyForm.joining_date} onChange={(e) => setCompanyForm({ ...companyForm, joining_date: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                </div>

                {/* Fixed RBS Indicator for Company */}
                <div className="p-3 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm flex items-center justify-between mt-2">
                  <div>
                    <span className="block text-xs font-bold text-[#1d2327]">RBS Mode</span>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-xs bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                    Debit
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <Phone className="w-4 h-4 text-[#2271b1]" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Contact Person</label>
                    <input type="text" value={companyForm.contact_person} onChange={(e) => setCompanyForm({ ...companyForm, contact_person: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Phone</label>
                    <input type="text" value={companyForm.contact_phone} onChange={(e) => setCompanyForm({ ...companyForm, contact_phone: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. +91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Email</label>
                    <input type="email" value={companyForm.contact_email} onChange={(e) => setCompanyForm({ ...companyForm, contact_email: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. contact@company.com" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <MapPin className="w-4 h-4 text-[#2271b1]" />
                  Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Address</label>
                    <input type="text" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="Full address" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">City</label>
                    <input type="text" value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">State</label>
                    <input type="text" value={companyForm.state} onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Pincode</label>
                    <input type="text" value={companyForm.pincode} onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                </div>
              </div>

              {/* 1. Bank Details */}
              <div className="p-3.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm space-y-3">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <Landmark className="w-4 h-4 text-[#00a32a]" />
                  Bank Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Bank Name</label>
                    <input type="text" value={companyForm.bank_name} onChange={(e) => setCompanyForm({ ...companyForm, bank_name: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. HDFC Bank" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Account Number</label>
                    <input type="text" value={companyForm.account_number} onChange={(e) => setCompanyForm({ ...companyForm, account_number: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. 50200012345678" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">IFSC Code</label>
                    <input type="text" value={companyForm.ifsc_code} onChange={(e) => setCompanyForm({ ...companyForm, ifsc_code: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none uppercase" placeholder="e.g. HDFC0001234" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Branch Name</label>
                    <input type="text" value={companyForm.branch_name} onChange={(e) => setCompanyForm({ ...companyForm, branch_name: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. Surat Main Branch" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Accountant Name</label>
                    <input type="text" value={companyForm.accountant_name} onChange={(e) => setCompanyForm({ ...companyForm, accountant_name: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. Rahul Sharma" />
                  </div>
                </div>
              </div>

              {/* 2. Payment Platform Details */}
              <div className="p-3.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm space-y-3">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <CreditCard className="w-4 h-4 text-[#2271b1]" />
                  Payment Platform Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Select Platform</label>
                    <select value={companyForm.bank_platform} onChange={(e) => setCompanyForm({ ...companyForm, bank_platform: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none">
                      {BANK_PLATFORM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || '— Select Platform —'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Account Mail (Platform Email)</label>
                    <input type="email" value={companyForm.account_mail} onChange={(e) => setCompanyForm({ ...companyForm, account_mail: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. finance@company.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Virtual Account No.</label>
                    <input type="text" value={companyForm.virtual_account_no} onChange={(e) => setCompanyForm({ ...companyForm, virtual_account_no: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. VA12345678" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Routing No.</label>
                    <input type="text" value={companyForm.routing_no} onChange={(e) => setCompanyForm({ ...companyForm, routing_no: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. 021000021" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2c3338] mb-1">Bank Data / Platform Notes</label>
                  <input type="text" value={companyForm.bank_data} onChange={(e) => setCompanyForm({ ...companyForm, bank_data: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="Additional payment platform or settlement notes..." />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#2c3338] mb-1">Notes</label>
                <textarea value={companyForm.notes} onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" rows={2} placeholder="Additional notes..." />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#c3c4c7]">
                <button type="button" onClick={() => setCompanyModal(false)} className="px-4 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] text-xs font-bold rounded-sm transition-all">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm shadow-xs transition-all">
                  {editCompany ? 'Save Company' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== PARTNER MODAL ======================== */}
      {partnerModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4 bg-black/50">
          <div className="modal-content bg-white border border-[#c3c4c7] w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#c3c4c7] bg-[#f6f7f7] flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-[#1d2327] flex items-center gap-2">
                <HandshakeIcon className="w-4.5 h-4.5 text-[#dba617]" />
                {editPartner ? `Edit Partner: ${editPartner.partner_name}` : 'Add New Partner'}
              </h2>
              <button onClick={() => setPartnerModal(false)} className="text-[#50575e] hover:text-[#1d2327] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePartnerSubmit} className="p-5 space-y-5 overflow-y-auto text-xs">
              {/* Partner Info */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <HandshakeIcon className="w-4 h-4 text-[#dba617]" />
                  Partner Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Partner Name *</label>
                    <input type="text" required value={partnerForm.partner_name} onChange={(e) => setPartnerForm({ ...partnerForm, partner_name: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. Acme Partners" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Joining Date</label>
                    <input type="date" value={partnerForm.joining_date} onChange={(e) => setPartnerForm({ ...partnerForm, joining_date: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Partner Type *</label>
                    <select value={partnerForm.partner_type} onChange={(e) => setPartnerForm({ ...partnerForm, partner_type: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none">
                      <option value="Service">Service Partner (Fixed Fee)</option>
                      <option value="Partner with %">Partner with % (Revenue Share)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Partnership / Share %</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={partnerForm.partner_share_percentage === 0 ? '' : partnerForm.partner_share_percentage}
                        onChange={(e) => setPartnerForm({ ...partnerForm, partner_share_percentage: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-[#8c8f94] text-xs font-bold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none pr-8"
                        placeholder="0.0"
                      />
                      <Percent className="w-3.5 h-3.5 text-[#dba617] absolute right-3 top-2" />
                    </div>
                  </div>
                </div>

                {/* Fixed RBS Indicator for Partner */}
                <div className="p-3 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm flex items-center justify-between mt-2">
                  <div>
                    <span className="block text-xs font-bold text-[#1d2327]">RBS Mode</span>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-xs bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                    Credit
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <Phone className="w-4 h-4 text-[#2271b1]" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Contact Person</label>
                    <input type="text" value={partnerForm.contact_person} onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Phone</label>
                    <input type="text" value={partnerForm.contact_phone} onChange={(e) => setPartnerForm({ ...partnerForm, contact_phone: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Email</label>
                    <input type="email" value={partnerForm.contact_email} onChange={(e) => setPartnerForm({ ...partnerForm, contact_email: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <MapPin className="w-4 h-4 text-[#2271b1]" />
                  Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Address</label>
                    <input type="text" value={partnerForm.address} onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">City</label>
                    <input type="text" value={partnerForm.city} onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">State</label>
                    <input type="text" value={partnerForm.state} onChange={(e) => setPartnerForm({ ...partnerForm, state: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Pincode</label>
                    <input type="text" value={partnerForm.pincode} onChange={(e) => setPartnerForm({ ...partnerForm, pincode: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" />
                  </div>
                </div>
              </div>

              {/* 1. Bank Details */}
              <div className="p-3.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm space-y-3">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <Landmark className="w-4 h-4 text-[#00a32a]" />
                  Bank Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Bank Name</label>
                    <input type="text" value={partnerForm.bank_name} onChange={(e) => setPartnerForm({ ...partnerForm, bank_name: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. HDFC Bank" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Account Number</label>
                    <input type="text" value={partnerForm.account_number} onChange={(e) => setPartnerForm({ ...partnerForm, account_number: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. 50200012345678" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">IFSC Code</label>
                    <input type="text" value={partnerForm.ifsc_code} onChange={(e) => setPartnerForm({ ...partnerForm, ifsc_code: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none uppercase" placeholder="e.g. HDFC0001234" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Branch Name</label>
                    <input type="text" value={partnerForm.branch_name} onChange={(e) => setPartnerForm({ ...partnerForm, branch_name: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. Surat Main Branch" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Accountant Name</label>
                    <input type="text" value={partnerForm.accountant_name} onChange={(e) => setPartnerForm({ ...partnerForm, accountant_name: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. Rahul Sharma" />
                  </div>
                </div>
              </div>

              {/* 2. Payment Platform Details */}
              <div className="p-3.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm space-y-3">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <CreditCard className="w-4 h-4 text-[#2271b1]" />
                  Payment Platform Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Select Platform</label>
                    <select value={partnerForm.bank_platform} onChange={(e) => setPartnerForm({ ...partnerForm, bank_platform: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none">
                      {BANK_PLATFORM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || '— Select Platform —'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Account Mail (Platform Email)</label>
                    <input type="email" value={partnerForm.account_mail} onChange={(e) => setPartnerForm({ ...partnerForm, account_mail: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. finance@partner.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Virtual Account No.</label>
                    <input type="text" value={partnerForm.virtual_account_no} onChange={(e) => setPartnerForm({ ...partnerForm, virtual_account_no: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. VA12345678" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Routing No.</label>
                    <input type="text" value={partnerForm.routing_no} onChange={(e) => setPartnerForm({ ...partnerForm, routing_no: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="e.g. 021000021" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2c3338] mb-1">Bank Data / Platform Notes</label>
                  <input type="text" value={partnerForm.bank_data} onChange={(e) => setPartnerForm({ ...partnerForm, bank_data: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" placeholder="Additional payment platform notes..." />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#2c3338] mb-1">Notes</label>
                <textarea value={partnerForm.notes} onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })} className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none" rows={2} />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#c3c4c7]">
                <button type="button" onClick={() => setPartnerModal(false)} className="px-4 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] text-xs font-bold rounded-sm transition-all">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#dba617] hover:bg-[#b8890e] text-white text-xs font-bold rounded-sm shadow-xs transition-all">
                  {editPartner ? 'Save Partner' : 'Create Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
