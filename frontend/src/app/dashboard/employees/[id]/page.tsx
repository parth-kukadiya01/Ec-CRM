'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Building2,
  CreditCard,
  ArrowLeft,
  Crown,
  Landmark,
  Hash,
  FileText,
  MapPin,
  AlertCircle,
  UserCheck,
  UserX,
  Banknote,
  Plus,
  Edit2,
  Trash2,
  Laptop,
  Package,
  IndianRupee,
  X,
  Check,
  Clock,
} from 'lucide-react';
import { usersApi, authApi, employeeSalaryApi, employeeAssetsApi, employeeDocumentsApi } from '@/lib/api';

interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
  is_partner: boolean;
  account_id: number | null;
  account_name: string | null;
  role_id: number | null;
  role: { id: number; name: string; permissions: { id: number; name: string }[] } | null;
  personal_details: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  salary_summary: string | null;
  responsibilities: string | null;
  created_at: string;
}

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'salary', label: 'Salary', icon: IndianRupee },
  { id: 'assets', label: 'Assets', icon: Laptop },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'bank', label: 'Bank Details', icon: Landmark },
];

const ASSET_TYPES = ['Laptop', 'Phone', 'ID Card', 'Vehicle', 'Uniform', 'Tablet', 'Other'];
const ASSET_CONDITIONS = ['New', 'Good', 'Fair', 'Damaged', 'Returned'];
const DOCUMENT_TYPES = ['Aadhar Card', 'PAN Card', 'Passport', 'Driving License', 'Offer Letter', 'Experience Letter', 'Resignation Letter', 'Other'];
const PAYMENT_MODES = ['Bank', 'Cash', 'UPI'];

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = parseInt(params.id as string);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  // Salary state
  const [salaries, setSalaries] = useState<any[]>([]);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editSalary, setEditSalary] = useState<any>(null);
  const [salaryForm, setSalaryForm] = useState({
    base_salary: '', hra: '', da: '', special_allowance: '', bonus: '', deductions: '',
    effective_from: '', payment_mode: 'Bank', status: 'Active', notes: '',
  });

  // Assets state
  const [assets, setAssets] = useState<any[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editAsset, setEditAsset] = useState<any>(null);
  const [assetForm, setAssetForm] = useState({
    asset_name: '', asset_type: 'Laptop', serial_number: '', asset_value: '',
    assigned_date: '', return_date: '', condition: 'Good', notes: '',
  });

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    document_type: 'Aadhar Card', document_number: '', notes: '',
  });

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    if (user && isManagerOrAdmin()) {
      if (activeTab === 'salary') loadSalaries();
      if (activeTab === 'assets') loadAssets();
      if (activeTab === 'documents') loadDocuments();
    }
  }, [activeTab, user]);

  const isManagerOrAdmin = () => {
    if (!currentUser) return false;
    if (currentUser.is_admin) return true;
    const roleName = currentUser.role_name || '';
    return ['General Manager', 'Operations Manager'].includes(roleName);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, meRes] = await Promise.all([
        usersApi.getOne(userId),
        authApi.getMe(),
      ]);
      setUser(userRes.data);
      setCurrentUser(meRes.data);

      // If not admin or manager, redirect back
      const me = meRes.data;
      const rn = me?.role_name || '';
      if (!me?.is_admin && !['General Manager', 'Operations Manager'].includes(rn)) {
        router.push('/dashboard/employees');
      }
    } catch (err: any) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  // ── Salary ──
  const loadSalaries = async () => {
    try {
      const res = await employeeSalaryApi.list(userId);
      setSalaries(res.data || []);
    } catch { setSalaries([]); }
  };

  const openCreateSalary = () => {
    setEditSalary(null);
    setSalaryForm({
      base_salary: '', hra: '', da: '', special_allowance: '', bonus: '', deductions: '',
      effective_from: new Date().toISOString().split('T')[0], payment_mode: 'Bank', status: 'Active', notes: '',
    });
    setShowSalaryModal(true);
  };

  const openEditSalary = (s: any) => {
    setEditSalary(s);
    setSalaryForm({
      base_salary: String(s.base_salary || ''),
      hra: String(s.hra || ''),
      da: String(s.da || ''),
      special_allowance: String(s.special_allowance || ''),
      bonus: String(s.bonus || ''),
      deductions: String(s.deductions || ''),
      effective_from: s.effective_from || '',
      payment_mode: s.payment_mode || 'Bank',
      status: s.status || 'Active',
      notes: s.notes || '',
    });
    setShowSalaryModal(true);
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        base_salary: parseFloat(salaryForm.base_salary) || 0,
        hra: parseFloat(salaryForm.hra) || 0,
        da: parseFloat(salaryForm.da) || 0,
        special_allowance: parseFloat(salaryForm.special_allowance) || 0,
        bonus: parseFloat(salaryForm.bonus) || 0,
        deductions: parseFloat(salaryForm.deductions) || 0,
        effective_from: salaryForm.effective_from || null,
        payment_mode: salaryForm.payment_mode,
        status: salaryForm.status,
        notes: salaryForm.notes || null,
      };
      if (editSalary) {
        await employeeSalaryApi.update(userId, editSalary.id, payload);
      } else {
        await employeeSalaryApi.create(userId, payload);
      }
      setShowSalaryModal(false);
      loadSalaries();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error saving salary');
    }
  };

  const handleDeleteSalary = async (id: number) => {
    if (confirm('Delete this salary record?')) {
      try {
        await employeeSalaryApi.delete(userId, id);
        loadSalaries();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Error deleting salary');
      }
    }
  };

  // ── Assets ──
  const loadAssets = async () => {
    try {
      const res = await employeeAssetsApi.list(userId);
      setAssets(res.data || []);
    } catch { setAssets([]); }
  };

  const openCreateAsset = () => {
    setEditAsset(null);
    setAssetForm({
      asset_name: '', asset_type: 'Laptop', serial_number: '', asset_value: '',
      assigned_date: new Date().toISOString().split('T')[0], return_date: '', condition: 'Good', notes: '',
    });
    setShowAssetModal(true);
  };

  const openEditAsset = (a: any) => {
    setEditAsset(a);
    setAssetForm({
      asset_name: a.asset_name || '',
      asset_type: a.asset_type || 'Laptop',
      serial_number: a.serial_number || '',
      asset_value: a.asset_value || '',
      assigned_date: a.assigned_date || '',
      return_date: a.return_date || '',
      condition: a.condition || 'Good',
      notes: a.notes || '',
    });
    setShowAssetModal(true);
  };

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...assetForm,
        assigned_date: assetForm.assigned_date || null,
        return_date: assetForm.return_date || null,
        notes: assetForm.notes || null,
      };
      if (editAsset) {
        await employeeAssetsApi.update(userId, editAsset.id, payload);
      } else {
        await employeeAssetsApi.create(userId, payload);
      }
      setShowAssetModal(false);
      loadAssets();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error saving asset');
    }
  };

  const handleDeleteAsset = async (id: number) => {
    if (confirm('Delete this asset record?')) {
      try {
        await employeeAssetsApi.delete(userId, id);
        loadAssets();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Error deleting asset');
      }
    }
  };

  // ── Documents ──
  const loadDocuments = async () => {
    try {
      const res = await employeeDocumentsApi.list(userId);
      setDocuments(res.data || []);
    } catch { setDocuments([]); }
  };

  const openCreateDoc = () => {
    setDocForm({ document_type: 'Aadhar Card', document_number: '', notes: '' });
    setShowDocModal(true);
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeeDocumentsApi.create(userId, {
        ...docForm,
        document_number: docForm.document_number || null,
        notes: docForm.notes || null,
      });
      setShowDocModal(false);
      loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error saving document');
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (confirm('Delete this document?')) {
      try {
        await employeeDocumentsApi.delete(userId, id);
        loadDocuments();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Error deleting document');
      }
    }
  };

  // ── Toggle Active ──
  const toggleActive = async () => {
    if (!user) return;
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;

    try {
      setToggling(true);
      await usersApi.update(user.id, { is_active: !user.is_active });
      setUser({ ...user, is_active: !user.is_active });
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to ${action} user`);
    } finally {
      setToggling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.is_admin) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 border border-amber-200/80">
          <Crown className="w-3.5 h-3.5" />
          Super Admin
        </span>
      );
    }
    if (user.is_partner) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
          <Building2 className="w-3.5 h-3.5" />
          Partner
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
        <Shield className="w-3.5 h-3.5" />
        {user.role?.name || 'Employee'}
      </span>
    );
  };

  const calcNetSalary = () => {
    const b = parseFloat(salaryForm.base_salary) || 0;
    const h = parseFloat(salaryForm.hra) || 0;
    const d = parseFloat(salaryForm.da) || 0;
    const s = parseFloat(salaryForm.special_allowance) || 0;
    const bo = parseFloat(salaryForm.bonus) || 0;
    const ded = parseFloat(salaryForm.deductions) || 0;
    return b + h + d + s + bo - ded;
  };

  const getConditionColor = (cond: string) => {
    switch (cond) {
      case 'New': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Good': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Fair': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Damaged': return 'bg-red-50 text-red-600 border-red-200';
      case 'Returned': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-surface-100 text-surface-600 border-surface-200';
    }
  };

  const getSalaryStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Revised': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Stopped': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-surface-100 text-surface-600 border-surface-200';
    }
  };

  // ── Loading / Error States ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin" style={{ borderWidth: 3 }} />
          <span className="text-sm text-surface-400 font-medium">Loading user profile...</span>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">{error || 'User not found'}</p>
          <Link href="/dashboard/employees" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  // ── Modal Wrapper ──
  const ModalWrapper = ({ show, onClose, title, icon: Icon, children }: { show: boolean; onClose: () => void; title: string; icon: any; children: React.ReactNode }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
        <div className="modal-content bg-white border border-surface-200 w-full max-w-xl rounded-xl shadow-modal overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
              <Icon className="w-4 h-4 text-blue-600" />
              {title}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-md text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <Link
        href="/dashboard/employees"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-400 hover:text-surface-700 transition-colors mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Employees
      </Link>

      {/* Profile Header Card */}
      <div className="card-premium p-0 overflow-hidden mb-6">
        {/* Gradient Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWMkgyVjBoMzR6TTIgMjBoMzR2Mkgydi0yem0xNS0xNWgydjM0aC0yVjV6bS0xNSAwaDJ2MzRIMlY1em0zMCAwaDF2MzRoLTFWNXoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={toggleActive}
              disabled={toggling}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm transition-all flex items-center gap-1.5 disabled:opacity-50 ${user.is_active
                  ? 'bg-red-500/20 text-red-100 border border-red-400/30 hover:bg-red-500/35'
                  : 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 hover:bg-emerald-500/35'
                }`}
            >
              {toggling ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : user.is_active ? (
                <UserX className="w-3.5 h-3.5" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              {user.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm ${user.is_active ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30' : 'bg-red-500/20 text-red-100 border border-red-400/30'}`}>
              {user.is_active ? '● Active' : '● Inactive'}
            </span>
          </div>
        </div>

        {/* Avatar + Name */}
        <div className="px-8 pb-6 -mt-12 relative">
          <div className="flex items-end gap-5">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-blue-500/25 border-4 border-white shrink-0">
              {getInitials(user.full_name)}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-surface-900 truncate">{user.full_name}</h1>
                {getRoleBadge()}
              </div>
              <p className="text-sm text-surface-400 mt-0.5">{user.email}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {formatDate(user.created_at)}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 border-t border-surface-100">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-surface-400 hover:text-surface-700 hover:border-surface-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: PROFILE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="card-premium p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-surface-800">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                  <div className="flex items-center gap-2 text-sm text-slate-900 font-bold">
                    <User className="w-4 h-4 text-slate-400" />
                    {user.full_name}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="flex items-center gap-2 text-sm text-slate-900 font-bold">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {user.email}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <div className="flex items-center gap-2 text-sm text-slate-800 font-semibold">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {user.phone || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Member Since</label>
                  <div className="flex items-center gap-2 text-sm text-slate-800 font-semibold">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(user.created_at)}
                  </div>
                </div>
              </div>
              {user.personal_details && (
                <div className="mt-5 pt-4 border-t border-surface-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Personal Details</label>
                  <div className="flex items-start gap-2 text-sm text-slate-800 font-medium">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span className="whitespace-pre-wrap">{user.personal_details}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Role & Permissions */}
            <div className="card-premium p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-sm font-bold text-surface-800">Role & Access</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5">Role</label>
                  <div className="text-sm font-semibold text-surface-800">
                    {user.is_admin ? 'Super Admin' : user.role?.name || 'No Role Assigned'}
                  </div>
                </div>
                {(user.responsibilities || (user.role as any)?.description) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5">Key Responsibilities</label>
                    <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/70 text-xs text-slate-800 font-medium leading-relaxed">
                      {user.responsibilities || (user.role as any)?.description}
                    </div>
                  </div>
                )}
                {user.role && user.role.permissions && user.role.permissions.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2">Permissions</label>
                    <div className="flex flex-wrap gap-1.5">
                      {user.role.permissions.map((p) => (
                        <span key={p.id} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {user.is_admin && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/60">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                      <Crown className="w-3.5 h-3.5" />
                      Full system access granted
                    </div>
                    <p className="text-[11px] text-amber-600 mt-1">
                      Super Admins have unrestricted access to all features and data.
                    </p>
                  </div>
                )}
                {/* Account Status */}
                <div>
                  <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2">Account Status</label>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${user.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-red-50 text-red-600 border border-red-200/80'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Partner Details */}
            {(user.is_partner || user.account_name) && (
              <div className="card-premium p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <h2 className="text-sm font-bold text-surface-800">Partner Details</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1">Account Name</label>
                    <div className="text-sm text-surface-700 font-medium">{user.account_name || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1">Partner Status</label>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${user.is_partner ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-surface-100 text-surface-500 border border-surface-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_partner ? 'bg-emerald-500' : 'bg-surface-300'}`} />
                      {user.is_partner ? 'Active Partner' : 'Not a Partner'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* System Info */}
            <div className="card-premium p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
                  <Hash className="w-4 h-4 text-surface-500" />
                </div>
                <h2 className="text-sm font-bold text-surface-800">System Info</h2>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400 font-medium">User ID</span>
                  <span className="text-surface-700 font-mono font-semibold">#{user.id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400 font-medium">Role ID</span>
                  <span className="text-surface-700 font-mono font-semibold">{user.role_id ? `#${user.role_id}` : '—'}</span>
                </div>
                {user.account_id && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-surface-400 font-medium">Account ID</span>
                    <span className="text-surface-700 font-mono font-semibold">#{user.account_id}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: SALARY */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'salary' && (
        <div className="space-y-6">
          {/* Salary Summary Cards */}
          {salaries.length > 0 && (() => {
            const activeSalary = salaries.find((s) => s.status === 'Active');
            return activeSalary ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card-premium p-4">
                  <div className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Base Salary</div>
                  <div className="text-lg font-bold text-slate-900">{formatCurrency(activeSalary.base_salary)}</div>
                </div>
                <div className="card-premium p-4">
                  <div className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Allowances</div>
                  <div className="text-lg font-bold text-emerald-700">{formatCurrency(activeSalary.hra + activeSalary.da + activeSalary.special_allowance)}</div>
                </div>
                <div className="card-premium p-4">
                  <div className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Deductions</div>
                  <div className="text-lg font-bold text-red-600">{formatCurrency(activeSalary.deductions)}</div>
                </div>
                <div className="card-premium p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Net Salary</div>
                  <div className="text-lg font-bold text-blue-700">{formatCurrency(activeSalary.net_salary)}</div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Salary Table */}
          <div className="card-premium overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-surface-800">Salary Records</h2>
                  <p className="text-[11px] text-surface-400">Manage salary structure and revisions</p>
                </div>
              </div>
              <button onClick={openCreateSalary} className="btn-primary">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Salary</span>
              </button>
            </div>

            {salaries.length === 0 ? (
              <div className="py-12 text-center">
                <IndianRupee className="w-10 h-10 text-surface-200 mx-auto mb-2" />
                <p className="text-xs text-surface-400 font-medium">No salary records yet</p>
                <p className="text-[11px] text-surface-300 mt-0.5">Click &quot;Add Salary&quot; to add a salary structure</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Effective From</th>
                      <th className="py-3 px-4">Base</th>
                      <th className="py-3 px-4">HRA</th>
                      <th className="py-3 px-4">DA</th>
                      <th className="py-3 px-4">Spl. Allow</th>
                      <th className="py-3 px-4">Bonus</th>
                      <th className="py-3 px-4">Deductions</th>
                      <th className="py-3 px-4">Net Salary</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {salaries.map((s) => (
                      <tr key={s.id} className="table-row-hover">
                        <td className="py-3 px-4 text-xs font-semibold text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-surface-400" />
                            {formatShortDate(s.effective_from)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-bold text-slate-900 font-mono whitespace-nowrap">{formatCurrency(s.base_salary)}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700 font-mono whitespace-nowrap">{formatCurrency(s.hra)}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700 font-mono whitespace-nowrap">{formatCurrency(s.da)}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700 font-mono whitespace-nowrap">{formatCurrency(s.special_allowance)}</td>
                        <td className="py-3 px-4 text-xs font-medium text-emerald-700 font-mono whitespace-nowrap">{formatCurrency(s.bonus)}</td>
                        <td className="py-3 px-4 text-xs font-medium text-red-600 font-mono whitespace-nowrap">{formatCurrency(s.deductions)}</td>
                        <td className="py-3 px-4 text-xs font-bold text-blue-700 font-mono whitespace-nowrap">{formatCurrency(s.net_salary)}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">{s.payment_mode}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getSalaryStatusColor(s.status)}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditSalary(s)} className="p-1.5 rounded-md text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteSalary(s.id)} className="p-1.5 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: ASSETS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          {/* Asset Stats */}
          {assets.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-premium p-4">
                <div className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Total Assets</div>
                <div className="text-lg font-bold text-slate-900">{assets.length}</div>
              </div>
              <div className="card-premium p-4">
                <div className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Active</div>
                <div className="text-lg font-bold text-emerald-700">{assets.filter((a) => a.condition !== 'Returned').length}</div>
              </div>
              <div className="card-premium p-4">
                <div className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Returned</div>
                <div className="text-lg font-bold text-slate-500">{assets.filter((a) => a.condition === 'Returned').length}</div>
              </div>
              <div className="card-premium p-4">
                <div className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Damaged</div>
                <div className="text-lg font-bold text-red-600">{assets.filter((a) => a.condition === 'Damaged').length}</div>
              </div>
            </div>
          )}

          {/* Assets Table */}
          <div className="card-premium overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-surface-800">Assigned Assets</h2>
                  <p className="text-[11px] text-surface-400">Company equipment and resources</p>
                </div>
              </div>
              <button onClick={openCreateAsset} className="btn-primary">
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Asset</span>
              </button>
            </div>

            {assets.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 text-surface-200 mx-auto mb-2" />
                <p className="text-xs text-surface-400 font-medium">No assets assigned</p>
                <p className="text-[11px] text-surface-300 mt-0.5">Click &quot;Assign Asset&quot; to assign company equipment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Asset</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Serial / ID</th>
                      <th className="py-3 px-4">Value</th>
                      <th className="py-3 px-4">Assigned</th>
                      <th className="py-3 px-4">Returned</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {assets.map((a) => (
                      <tr key={a.id} className="table-row-hover">
                        <td className="py-3 px-4 text-sm font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <Laptop className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div>{a.asset_name}</div>
                              {a.notes && <div className="text-[11px] text-surface-400 font-medium">{a.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-surface-100 border border-surface-200 text-slate-700">{a.asset_type}</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">{a.serial_number || '—'}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-800 whitespace-nowrap">{a.asset_value || '—'}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">{formatShortDate(a.assigned_date)}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">{formatShortDate(a.return_date)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getConditionColor(a.condition)}`}>
                            {a.condition}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditAsset(a)} className="p-1.5 rounded-md text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteAsset(a.id)} className="p-1.5 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: DOCUMENTS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'documents' && (
        <div className="card-premium overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-surface-800">Employee Documents</h2>
                <p className="text-[11px] text-surface-400">Identity proofs and employment documents</p>
              </div>
            </div>
            <button onClick={openCreateDoc} className="btn-primary">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-10 h-10 text-surface-200 mx-auto mb-2" />
              <p className="text-xs text-surface-400 font-medium">No documents recorded</p>
              <p className="text-[11px] text-surface-300 mt-0.5">Click &quot;Add Document&quot; to record employee documents</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {documents.map((doc) => (
                <div key={doc.id} className="px-5 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{doc.document_type}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {doc.document_number && (
                          <span className="text-xs font-mono font-semibold text-slate-600">
                            #{doc.document_number}
                          </span>
                        )}
                        <span className="text-[11px] text-surface-400">
                          Added {formatShortDate(doc.uploaded_at)}
                        </span>
                      </div>
                      {doc.notes && <p className="text-[11px] text-surface-400 mt-0.5">{doc.notes}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-1.5 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB: BANK DETAILS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'bank' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-premium p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Landmark className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Banking Details</h2>
                <p className="text-xs text-slate-600 font-medium">Salary payment account information</p>
              </div>
            </div>
            {(user.bank_name || user.account_number || user.ifsc_code) ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bank Name</label>
                  <div className="flex items-center gap-2 text-sm text-slate-900 font-bold">
                    <Landmark className="w-3.5 h-3.5 text-slate-400" />
                    {user.bank_name || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Account Number</label>
                  <div className="flex items-center gap-2 text-sm text-surface-700 font-medium font-mono">
                    <Hash className="w-3.5 h-3.5 text-surface-300" />
                    {user.account_number || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">IFSC Code</label>
                  <div className="flex items-center gap-2 text-sm text-surface-700 font-medium font-mono">
                    <CreditCard className="w-3.5 h-3.5 text-surface-300" />
                    {user.ifsc_code || '—'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Landmark className="w-10 h-10 text-surface-200 mx-auto mb-2" />
                <p className="text-xs text-surface-400 font-medium">No banking details added yet</p>
                <p className="text-[11px] text-surface-300 mt-0.5">Bank details can be added when editing the employee profile</p>
              </div>
            )}
          </div>

          {/* Legacy Salary Summary */}
          {!user.is_partner && user.salary_summary && (
            <div className="card-premium p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-sky-600" />
                </div>
                <h2 className="text-sm font-bold text-surface-800">Salary Summary (Legacy)</h2>
              </div>
              <p className="text-sm text-surface-600 whitespace-pre-wrap bg-surface-50 p-4 rounded-lg border border-surface-200">{user.salary_summary}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SALARY MODAL */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <ModalWrapper
        show={showSalaryModal}
        onClose={() => setShowSalaryModal(false)}
        title={editSalary ? 'Edit Salary Record' : 'Add Salary Record'}
        icon={IndianRupee}
      >
        <form onSubmit={handleSalarySubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Base Salary *</label>
              <input
                type="number"
                required
                step="0.01"
                value={salaryForm.base_salary}
                onChange={(e) => setSalaryForm({ ...salaryForm, base_salary: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">HRA</label>
              <input
                type="number"
                step="0.01"
                value={salaryForm.hra}
                onChange={(e) => setSalaryForm({ ...salaryForm, hra: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">DA</label>
              <input
                type="number"
                step="0.01"
                value={salaryForm.da}
                onChange={(e) => setSalaryForm({ ...salaryForm, da: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Special Allowance</label>
              <input
                type="number"
                step="0.01"
                value={salaryForm.special_allowance}
                onChange={(e) => setSalaryForm({ ...salaryForm, special_allowance: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Bonus</label>
              <input
                type="number"
                step="0.01"
                value={salaryForm.bonus}
                onChange={(e) => setSalaryForm({ ...salaryForm, bonus: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Deductions</label>
              <input
                type="number"
                step="0.01"
                value={salaryForm.deductions}
                onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Net Salary Preview */}
          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Calculated Net Salary</span>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(calcNetSalary())}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Effective From</label>
              <input
                type="date"
                value={salaryForm.effective_from}
                onChange={(e) => setSalaryForm({ ...salaryForm, effective_from: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Payment Mode</label>
              <select
                value={salaryForm.payment_mode}
                onChange={(e) => setSalaryForm({ ...salaryForm, payment_mode: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={salaryForm.status}
                onChange={(e) => setSalaryForm({ ...salaryForm, status: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              >
                <option value="Active">Active</option>
                <option value="Revised">Revised</option>
                <option value="Stopped">Stopped</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Notes</label>
            <textarea
              rows={2}
              value={salaryForm.notes}
              onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
              className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <button type="button" onClick={() => setShowSalaryModal(false)} className="px-3.5 py-2 text-xs text-surface-500 hover:text-surface-800 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editSalary ? 'Save Changes' : 'Add Salary'}
            </button>
          </div>
        </form>
      </ModalWrapper>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ASSET MODAL */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <ModalWrapper
        show={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        title={editAsset ? 'Edit Asset' : 'Assign Asset'}
        icon={Package}
      >
        <form onSubmit={handleAssetSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Asset Name *</label>
              <input
                type="text"
                required
                value={assetForm.asset_name}
                onChange={(e) => setAssetForm({ ...assetForm, asset_name: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                placeholder="e.g. MacBook Pro 16"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Asset Type</label>
              <select
                value={assetForm.asset_type}
                onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Serial Number</label>
              <input
                type="text"
                value={assetForm.serial_number}
                onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium font-mono"
                placeholder="e.g. SN-12345"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Asset Value</label>
              <input
                type="text"
                value={assetForm.asset_value}
                onChange={(e) => setAssetForm({ ...assetForm, asset_value: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                placeholder="e.g. ₹1,50,000"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Assigned Date</label>
              <input
                type="date"
                value={assetForm.assigned_date}
                onChange={(e) => setAssetForm({ ...assetForm, assigned_date: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Return Date</label>
              <input
                type="date"
                value={assetForm.return_date}
                onChange={(e) => setAssetForm({ ...assetForm, return_date: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Condition</label>
              <select
                value={assetForm.condition}
                onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              >
                {ASSET_CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Notes</label>
            <textarea
              rows={2}
              value={assetForm.notes}
              onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
              className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              placeholder="Any additional notes..."
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <button type="button" onClick={() => setShowAssetModal(false)} className="px-3.5 py-2 text-xs text-surface-500 hover:text-surface-800 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editAsset ? 'Save Changes' : 'Assign Asset'}
            </button>
          </div>
        </form>
      </ModalWrapper>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DOCUMENT MODAL */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <ModalWrapper
        show={showDocModal}
        onClose={() => setShowDocModal(false)}
        title="Add Document"
        icon={FileText}
      >
        <form onSubmit={handleDocSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Document Type *</label>
            <select
              value={docForm.document_type}
              onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
              className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Document Number</label>
            <input
              type="text"
              value={docForm.document_number}
              onChange={(e) => setDocForm({ ...docForm, document_number: e.target.value })}
              className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium font-mono"
              placeholder="e.g. XXXX-XXXX-1234"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Notes</label>
            <textarea
              rows={2}
              value={docForm.notes}
              onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
              className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
              placeholder="Any additional notes..."
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <button type="button" onClick={() => setShowDocModal(false)} className="px-3.5 py-2 text-xs text-surface-500 hover:text-surface-800 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Document
            </button>
          </div>
        </form>
      </ModalWrapper>
    </div>
  );
}
