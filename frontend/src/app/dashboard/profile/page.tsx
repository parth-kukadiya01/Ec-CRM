'use client';

import React, { useEffect, useState } from 'react';
import {
  User,
  Phone,
  CreditCard,
  Lock,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Eye,
  EyeOff,
  Landmark,
  Hash,
  Clock,
  Laptop,
  Receipt,
  Plus,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Check,
} from 'lucide-react';
import { usersApi, expenseClaimsApi } from '@/lib/api';

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
  created_at: string;
}

interface ExpenseClaim {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  status: 'Approved' | 'Pending Review' | 'Reimbursed' | 'Rejected';
  receiptImage: string | null;
  notes: string | null;
  approvalProof: string | null;
}

interface CompanyAsset {
  id: string;
  name: string;
  category: string;
  assetTag: string;
  serialNumber: string;
  assignedDate: string;
  status: 'Issued / Active' | 'Under Maintenance';
}

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hours: string;
  status: 'Present' | 'Late' | 'On Leave';
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'salary' | 'assets' | 'attendance' | 'spending'>('overview');

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    personal_details: '',
    password: '',
    confirmPassword: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
  });

  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);

  const [assets] = useState<CompanyAsset[]>([]);

  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);

  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'Travel & Logistics',
    date: new Date().toISOString().split('T')[0],
    receiptImages: [] as string[],
    notes: '',
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await usersApi.getMyProfile();
      setProfile(res.data);
      setFormData({
        full_name: res.data.full_name || '',
        phone: res.data.phone || '',
        personal_details: res.data.personal_details || '',
        password: '',
        confirmPassword: '',
        bank_name: res.data.bank_name || '',
        account_number: res.data.account_number || '',
        ifsc_code: res.data.ifsc_code || '',
      });

      // Load user's expense claims
      try {
        const claimsRes = await expenseClaimsApi.getMyClaims();
        const mapped = claimsRes.data.map((c: any) => ({
          id: String(c.id),
          title: c.title,
          amount: c.amount,
          category: c.category,
          date: c.date,
          status: c.status,
          receiptImage: c.receipt_image,
          notes: c.notes,
          approvalProof: c.approval_proof,
        }));
        setExpenses(mapped);
      } catch (cErr) {
        console.error('Failed to load expense claims', cErr);
      }
    } catch (err: any) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const updatePayload: any = {
        full_name: formData.full_name,
        phone: formData.phone || null,
        personal_details: formData.personal_details || null,
        bank_name: formData.bank_name || null,
        account_number: formData.account_number || null,
        ifsc_code: formData.ifsc_code || null,
      };
      if (formData.password) updatePayload.password = formData.password;
      await usersApi.update(profile.id, updatePayload);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      await loadProfile();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        personal_details: profile.personal_details || '',
        password: '',
        confirmPassword: '',
        bank_name: profile.bank_name || '',
        account_number: profile.account_number || '',
        ifsc_code: profile.ifsc_code || '',
      });
    }
    setEditing(false);
    setError('');
  };

  const toggleClock = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    if (!clockedIn) {
      setClockedIn(true);
      setClockInTime(timeStr);
      setAttendanceLogs((prev) => [
        { id: String(Date.now()), date: dateStr, clockIn: timeStr, clockOut: null, hours: 'In Progress', status: 'Present' },
        ...prev,
      ]);
    } else {
      setClockedIn(false);
      setAttendanceLogs((prev) =>
        prev.map((log, idx) =>
          idx === 0 && log.clockOut === null
            ? { ...log, clockOut: timeStr, hours: '8.5 hrs' }
            : log
        )
      );
      setClockInTime(null);
    }
  };

  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      const promises = fileList.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then((base64Strings) => {
        setNewExpense((prev) => ({
          ...prev,
          receiptImages: [...(prev.receiptImages || []), ...base64Strings],
        }));
      });
    }
  };

  const handleRemoveReceiptImage = (indexToRemove: number) => {
    setNewExpense((prev) => ({
      ...prev,
      receiptImages: prev.receiptImages.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;
    try {
      const payload = {
        title: newExpense.title,
        amount: parseFloat(newExpense.amount) || 0,
        category: newExpense.category,
        date: newExpense.date,
        receipt_image: newExpense.receiptImages.length > 0 ? JSON.stringify(newExpense.receiptImages) : null,
        notes: newExpense.notes || null,
      };
      const res = await expenseClaimsApi.create(payload);
      const newClaim: ExpenseClaim = {
        id: String(res.data.id),
        title: res.data.title,
        amount: res.data.amount,
        category: res.data.category,
        date: res.data.date,
        status: res.data.status,
        receiptImage: res.data.receipt_image,
        notes: res.data.notes,
        approvalProof: res.data.approval_proof,
      };
      setExpenses((prev) => [newClaim, ...prev]);
      setNewExpense({
        title: '',
        amount: '',
        category: 'Travel & Logistics',
        date: new Date().toISOString().split('T')[0],
        receiptImages: [],
        notes: '',
      });
      setSuccess('Expense claim submitted successfully! It is now visible to Admins & Managers.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit expense claim');
    }
  };

  const renderReceiptThumbnails = (receiptImageStr: string | null, isTable = true) => {
    if (!receiptImageStr) {
      return (
        <div className={`${isTable ? 'w-8 h-8' : 'w-10 h-10'} rounded bg-surface-100 text-surface-400 flex items-center justify-center`}>
          <ImageIcon className={`${isTable ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </div>
      );
    }

    let images: string[] = [];
    if (receiptImageStr.startsWith('[')) {
      try {
        images = JSON.parse(receiptImageStr);
      } catch {
        images = [receiptImageStr];
      }
    } else {
      images = [receiptImageStr];
    }

    return (
      <div className="flex flex-wrap gap-1.5 max-w-[120px]">
        {images.map((imgUrl, idx) => (
          <img
            key={idx}
            src={imgUrl}
            alt={`Receipt ${idx + 1}`}
            onClick={() => setPreviewImage(imgUrl)}
            className={`${isTable ? 'w-8 h-8' : 'w-10 h-10'} rounded object-cover border cursor-pointer hover:opacity-80 transition-opacity`}
            title={`Click to view receipt #${idx + 1}`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleBadge = () => {
    if (!profile) return null;
    if (profile.is_admin) return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">Admin</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">{profile.role?.name || 'Employee'}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin" />
          <span className="text-sm text-surface-400 font-medium">Loading profile portal...</span>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-sm font-medium flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-sm font-medium flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="card-premium p-0 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWMkgyVjBoMzR6TTIgMjBoMzR2Mkgydi0yem0xNS0xNWgydjM0aC0yVjV6bS0xNSAwaDJ2MzRIMlY1em0zMCAwaDF2MzRoLTFWNXoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="absolute top-4 right-4 flex gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleCancel} className="px-3.5 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-blue-600 text-xs font-bold shadow-md hover:bg-blue-50 transition-all flex items-center gap-1.5 disabled:opacity-50">
                  {saving ? <div className="w-3.5 h-3.5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg shrink-0">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-extrabold text-2xl tracking-wider shadow-inner">{getInitials(profile.full_name)}</div>
              </div>
              <div className="mb-1">
                <h1 className="text-xl font-bold text-surface-900 flex items-center gap-2">{profile.full_name} {getRoleBadge()}</h1>
                <p className="text-xs text-surface-400 font-mono mt-0.5">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 border-t border-surface-100 flex items-center gap-2 overflow-x-auto bg-surface-50/50">
          {[
            { id: 'overview', icon: User, label: 'Profile & Account', show: true },
            { id: 'salary', icon: DollarSign, label: 'Salary Progress', show: !profile.is_partner },
            { id: 'assets', icon: Laptop, label: `Company Assets (${assets.length})`, show: true },
            { id: 'attendance', icon: Clock, label: 'Attendance & Clock In', show: true },
            { id: 'spending', icon: Receipt, label: `Spending & Expenses (${expenses.length})`, show: true },
          ].filter(t => t.show).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-surface-500 hover:text-surface-800'}`}>
              <tab.icon className="w-4 h-4" /> <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card-premium p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><User className="w-4 h-4 text-blue-600" /></div>
                <h2 className="text-sm font-bold text-surface-800">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                  {editing ? <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full bg-white border border-surface-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 input-premium" /> : <div className="text-sm text-slate-900 font-bold py-1">{profile.full_name}</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                  {editing ? <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white border border-surface-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 input-premium" /> : <div className="flex items-center gap-2 text-sm text-slate-800 font-semibold py-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {profile.phone || 'Not provided'}</div>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Personal Details & Bio</label>
                  {editing ? <textarea rows={3} value={formData.personal_details} onChange={(e) => setFormData({ ...formData, personal_details: e.target.value })} className="w-full bg-white border border-surface-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 input-premium" /> : <div className="text-sm text-slate-800 font-medium py-1 whitespace-pre-wrap">{profile.personal_details || 'No personal details provided.'}</div>}
                </div>
              </div>
            </div>
            {editing && (
              <div className="card-premium p-6 border-blue-200/80 bg-blue-50/30 animate-fade-in">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Lock className="w-4 h-4 text-blue-600" /></div>
                  <div><h2 className="text-sm font-bold text-slate-900">Change Password</h2><p className="text-xs text-slate-600 font-medium">Leave blank if you don't want to change</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">New Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-white border border-surface-200 rounded-lg py-2.5 px-3.5 pr-10 text-sm text-slate-900 input-premium" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm Password</label>
                    <input type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full bg-white border border-surface-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 input-premium" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="space-y-6">
          <div className="card-premium p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-surface-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-surface-900">Salary Summary & Compensation</h2>
                <p className="text-xs text-surface-400">Current compensation breakdown and payment details</p>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-surface-200 bg-surface-50/50">
              <p className="text-sm text-surface-800 font-medium whitespace-pre-wrap">
                {profile.salary_summary || 'No salary summary details available.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="card-premium p-6 space-y-4">
          {assets.length === 0 ? (
            <div className="py-8 text-center text-surface-400 text-xs font-medium">
              No company assets currently assigned.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assets.map((ast) => (
                <div key={ast.id} className="p-4 rounded-xl border border-surface-200 bg-surface-50/50 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5"><Laptop className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-surface-900 truncate">{ast.name}</h3>
                    <p className="text-[11px] text-surface-500 font-medium mb-2">{ast.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="card-premium p-6 bg-surface-900 text-white space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Daily Attendance</h2>
              <button onClick={toggleClock} className={`px-5 py-2.5 rounded-xl font-bold text-xs ${clockedIn ? 'bg-red-600' : 'bg-emerald-600'}`}>{clockedIn ? 'Clock Out' : 'Clock In'}</button>
            </div>
          </div>
          <div className="card-premium p-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="bg-surface-50 text-surface-500 font-semibold uppercase border-b border-surface-200"><th className="py-3 px-4">Date</th><th className="py-3 px-4">Clock In</th><th className="py-3 px-4">Status</th></tr></thead>
              <tbody>
                {attendanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-surface-400 font-medium">No attendance records available.</td>
                  </tr>
                ) : (
                  attendanceLogs.map((log) => (
                    <tr key={log.id} className="border-b"> <td className="py-3 px-4">{log.date}</td> <td className="py-3 px-4">{log.clockIn}</td> <td className="py-3 px-4">{log.status}</td> </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'spending' && (
        <div className="space-y-6">
          <div className="card-premium p-6 space-y-4">
            <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Submit Spending Expense Claim
            </h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase mb-1">Expense Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Taxi travel to client"
                    value={newExpense.title}
                    onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                    className="w-full bg-white border rounded-lg p-2.5 text-xs text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full bg-white border rounded-lg p-2.5 text-xs text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase mb-1">Category *</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-white border rounded-lg p-2.5 text-xs text-surface-900 input-premium"
                  >
                    <option value="Travel & Logistics">Travel & Logistics</option>
                    <option value="Meals & Dining">Meals & Dining</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Software License">Software License</option>
                  </select>
                </div>
              </div>

              {/* Receipt File Upload */}
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase mb-1">Attach Receipt Image *</label>
                <div className="flex items-center gap-4 p-3 rounded-xl border border-dashed border-surface-300 bg-surface-50/50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReceiptFile}
                    id="expense-file-input"
                    className="hidden"
                  />
                  <label
                    htmlFor="expense-file-input"
                    className="px-4 py-2 bg-white border border-surface-300 rounded-lg text-xs font-bold text-surface-700 cursor-pointer flex items-center gap-1.5 shadow-xs hover:bg-surface-100"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Upload Receipt Image(s)</span>
                  </label>

                  {newExpense.receiptImages && newExpense.receiptImages.length > 0 ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      {newExpense.receiptImages.map((img, idx) => (
                        <div key={idx} className="relative group w-12 h-12">
                          <img
                            src={img}
                            alt={`Receipt thumbnail ${idx}`}
                            className="w-full h-full rounded-lg object-cover border shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveReceiptImage(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow-md flex items-center justify-center transition-transform hover:scale-105"
                            title="Remove image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {newExpense.receiptImages.length} Image(s) Attached
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-surface-400">PNG, JPG or JPEG screenshot (select multiple allowed)</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase mb-1">Expense Remarks / Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide additional details or reasons for this expense claim..."
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                  className="w-full bg-white border rounded-lg p-2.5 text-xs text-surface-900 input-premium"
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary">
                  <Plus className="w-4 h-4" />
                  <span>Submit Reimbursement Claim</span>
                </button>
              </div>
            </form>
          </div>

          {/* Expense Claims Table */}
          <div className="card-premium p-6 overflow-x-auto">
            <h2 className="text-base font-bold text-surface-900 mb-3">Submitted Reimbursements</h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-50 border-b text-surface-500 uppercase font-semibold">
                  <th className="py-3 px-4">Receipt Image</th>
                  <th className="py-3 px-4">Title & Remarks</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Approval Proof / Reviewer Remarks</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-surface-800">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-surface-400 font-medium">No expense claims submitted yet.</td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-surface-50">
                      <td className="py-3 px-4">
                        {renderReceiptThumbnails(exp.receiptImage)}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <div className="font-bold text-surface-900">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-surface-500 mt-0.5 max-w-[200px] whitespace-pre-wrap font-sans">
                            {exp.notes.split(" | Review Note:")[0]}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">{exp.category}</td>
                      <td className="py-3 px-4 text-surface-500">{exp.date}</td>
                      <td className="py-3 px-4 font-bold text-blue-600">₹{exp.amount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        {exp.approvalProof || (exp.notes && exp.notes.includes("Review Note:")) ? (
                          <div className="space-y-1 max-w-[220px]">
                            {exp.notes && exp.notes.includes("Review Note:") && (
                              <div className="text-[11px] text-slate-700 font-medium whitespace-pre-wrap italic">
                                &quot;{exp.notes.split(" | Review Note:")[1]}&quot;
                              </div>
                            )}
                            {exp.approvalProof && (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Proof:</span>
                                <img
                                  src={exp.approvalProof}
                                  alt="Approval Proof"
                                  onClick={() => setPreviewImage(exp.approvalProof)}
                                  className="w-8 h-8 rounded object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                                  title="View approval sign-off slip"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-surface-400 italic text-[11px]">Pending verification</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          exp.status === 'Approved' || exp.status === 'Reimbursed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : exp.status === 'Rejected'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <img src={previewImage} alt="Receipt" className="max-h-96 rounded-xl border" />
        </div>
      )}
    </div>
  );
}
