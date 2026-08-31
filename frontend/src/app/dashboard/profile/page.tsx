'use client';

import React, { useEffect, useState } from 'react';
import {
  User,
  Phone,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Landmark,
  Clock,
  Laptop,
  Receipt,
  Plus,
  Image as ImageIcon,
  DollarSign,
  Check,
  ShieldCheck
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

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-6 h-6 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs text-[#50575e] font-semibold">Loading user profile...</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4 font-sans text-[#2c3338]">
      
      {/* WP Admin Alerts */}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between rounded-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs font-bold flex items-center justify-between rounded-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* WP Admin Profile Header Bar */}
      <div className="bg-white border border-[#c3c4c7] p-5 shadow-xs rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xs bg-[#2271b1] text-white flex items-center justify-center font-bold text-xl border border-white/20 shadow-xs">
            {getInitials(profile.full_name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#1d2327] tracking-tight">{profile.full_name}</h1>
              <span className="px-2 py-0.5 bg-[#2271b1] text-white text-[10px] font-bold uppercase rounded-xs">
                {profile.is_admin ? 'Super Admin' : profile.role?.name || 'Employee'}
              </span>
            </div>
            <p className="text-xs text-[#50575e] font-mono mt-0.5">{profile.email}</p>
          </div>
        </div>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2271b1] border border-[#c3c4c7] font-bold text-xs rounded-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit User Profile</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-[#f6f7f7] text-[#2c3338] border border-[#c3c4c7] font-semibold text-xs rounded-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-xs rounded-xs shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {/* WP Admin Meta-Box Profile Details Form */}
      <div className="bg-white border border-[#c3c4c7] p-5 shadow-xs rounded-sm space-y-6">
        
        {/* Personal Details */}
        <div>
          <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider border-b border-[#c3c4c7] pb-2 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#2271b1]" />
            Personal & Account Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#1d2327] mb-1">Full Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-white border border-[#8c8f94] p-2 font-bold outline-none"
                />
              ) : (
                <div className="p-2 bg-[#f6f7f7] border border-[#dcdcde] font-semibold">{profile.full_name}</div>
              )}
            </div>

            <div>
              <label className="block font-bold text-[#1d2327] mb-1">Contact Phone</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-white border border-[#8c8f94] p-2 font-mono outline-none"
                />
              ) : (
                <div className="p-2 bg-[#f6f7f7] border border-[#dcdcde] font-mono">{profile.phone || '—'}</div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-[#1d2327] mb-1">Address / Personal Notes</label>
              {editing ? (
                <textarea
                  rows={2}
                  value={formData.personal_details}
                  onChange={(e) => setFormData({ ...formData, personal_details: e.target.value })}
                  className="w-full bg-white border border-[#8c8f94] p-2 outline-none"
                />
              ) : (
                <div className="p-2 bg-[#f6f7f7] border border-[#dcdcde]">{profile.personal_details || '—'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Banking Information */}
        <div>
          <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider border-b border-[#c3c4c7] pb-2 mb-4 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#2271b1]" />
            Direct Deposit & Banking Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#1d2327] mb-1">Bank Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full bg-white border border-[#8c8f94] p-2 font-semibold outline-none"
                />
              ) : (
                <div className="p-2 bg-[#f6f7f7] border border-[#dcdcde] font-semibold">{profile.bank_name || '—'}</div>
              )}
            </div>

            <div>
              <label className="block font-bold text-[#1d2327] mb-1">Account Number</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full bg-white border border-[#8c8f94] p-2 font-mono outline-none"
                />
              ) : (
                <div className="p-2 bg-[#f6f7f7] border border-[#dcdcde] font-mono">{profile.account_number || '—'}</div>
              )}
            </div>

            <div>
              <label className="block font-bold text-[#1d2327] mb-1">IFSC Code</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                  className="w-full bg-white border border-[#8c8f94] p-2 font-mono uppercase outline-none"
                />
              ) : (
                <div className="p-2 bg-[#f6f7f7] border border-[#dcdcde] font-mono uppercase">{profile.ifsc_code || '—'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Change Password (Only in Editing Mode) */}
        {editing && (
          <div>
            <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider border-b border-[#c3c4c7] pb-2 mb-4">
              Security & Password Reset
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#1d2327] mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-white border border-[#8c8f94] p-2 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1d2327] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-white border border-[#8c8f94] p-2 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
