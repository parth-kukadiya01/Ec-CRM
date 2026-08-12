'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usersApi, rolesApi, accountsApi, authApi } from '@/lib/api';
import { hasPermission } from '@/lib/permissions';
import {
  Store,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Truck,
  UserCheck,
  Users,
  Plus,
  Eye,
  EyeOff,
  ShieldAlert
} from 'lucide-react';

export default function NewChannelPartnerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Simple Admin Registration Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    account_id: '',
    assigned_employee_id: '',
    requires_shipping: true,
    shipping_partner: 'FedEx Express',
  });

  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, accRes, usersRes, rolesRes] = await Promise.all([
        authApi.getMe().catch(() => ({ data: null })),
        accountsApi.list().catch(() => ({ data: [] })),
        usersApi.list().catch(() => ({ data: [] })),
        rolesApi.list().catch(() => ({ data: [] })),
      ]);

      if (meRes.data) setCurrentUser(meRes.data);

      const allUsers = usersRes.data || [];
      const internalStaff = allUsers.filter((u: any) => !u.is_partner);
      setEmployees(internalStaff);
      setRoles(rolesRes.data || []);

      const partnerAccounts = (accRes.data || []).filter(
        (a: any) => a.account_type !== 'User' && a.account_name !== 'Admin Primary Account'
      );
      setAccounts(partnerAccounts);

      if (partnerAccounts.length > 0) {
        const firstAcc = partnerAccounts[0];
        setFormData((prev) => ({
          ...prev,
          account_id: String(firstAcc.id),
          requires_shipping: firstAcc.shipping_enabled ?? true,
          shipping_partner: firstAcc.default_shipping_partner || 'FedEx Express',
          assigned_employee_id: internalStaff[0]?.id ? String(internalStaff[0].id) : '',
        }));
        setSelectedAccount(firstAcc);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (accIdStr: string) => {
    setFormData((prev) => ({ ...prev, account_id: accIdStr }));
    const acc = accounts.find((a) => String(a.id) === accIdStr);
    if (acc) {
      setSelectedAccount(acc);
      setFormData((prev) => ({
        ...prev,
        requires_shipping: acc.shipping_enabled ?? true,
        shipping_partner: acc.default_shipping_partner || 'FedEx Express',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const partnerRole = roles.find((r) => r.name === 'Channel Partner');
      const assignedEmp = employees.find((e) => String(e.id) === formData.assigned_employee_id);

      const userPayload = {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        is_partner: true,
        is_admin: false,
        is_active: true,
        account_id: formData.account_id ? parseInt(formData.account_id) : null,
        assigned_employee_id: formData.assigned_employee_id ? parseInt(formData.assigned_employee_id) : null,
        assigned_employee_name: assignedEmp ? (assignedEmp.full_name || assignedEmp.email) : null,
        onboarding_status: 'Draft',
        requires_shipping: formData.requires_shipping,
        shipping_partner: formData.requires_shipping ? formData.shipping_partner : 'Self Fulfillment',
        role_id: partnerRole ? partnerRole.id : null,
        personal_details: `Channel partner account for ${selectedAccount?.account_name || 'Marketplace'}`,
        responsibilities: `Manages sales and listing operations on ${selectedAccount?.account_name}`,
      };

      const userRes = await usersApi.create(userPayload);
      const createdUser = userRes.data;

      alert(`✅ Channel Partner ${formData.full_name} registered successfully and assigned to ${assignedEmp?.full_name || 'Assigned Lead'}! The assigned employee can now complete the onboarding workspace.`);
      router.push(`/dashboard/partners/${createdUser.id}`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Error creating channel partner');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreatePartner = currentUser?.is_admin || hasPermission(currentUser, 'employees:write');

  if (!loading && currentUser && !canCreatePartner) {
    return (
      <div className="py-16 text-center card-premium p-8 max-w-lg mx-auto mt-10 space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Partner Registration Restricted</h2>
          <p className="text-xs text-slate-500 mt-1">
            Only Administrators or authorized staff members can register new channel partners.
          </p>
        </div>
        <Link
          href="/dashboard/partners"
          className="btn-primary inline-flex text-xs py-2 px-4 shadow-sm"
        >
          &larr; Back to Channel Partners Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/partners"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Channel Partners</span>
        </Link>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Partner Registration
        </span>
      </div>

      {/* Header Banner (Blue & White Theme) */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 rounded-3xl shadow-md border border-blue-600/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              Register New Channel Partner
            </h1>
            <p className="text-xs text-blue-100 mt-1 max-w-xl">
              Select the marketplace store, enter partner representative details, and assign an internal employee to handle the complete onboarding and document submission process.
            </p>
          </div>
        </div>
      </div>

      {/* Simplified Admin Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* STEP 1: MARKETPLACE ACCOUNT SELECTION */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4.5 h-4.5 text-blue-600" />
            1. Select Marketplace Store Account
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((acc) => {
              const isSelected = String(acc.id) === formData.account_id;
              return (
                <div
                  key={acc.id}
                  onClick={() => handleAccountSelect(String(acc.id))}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                    ? 'bg-blue-50/80 border-blue-600 shadow-xs ring-2 ring-blue-600/20'
                    : 'bg-slate-50/60 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      <Store className="w-4 h-4" />
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{acc.account_name}</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{acc.notes || acc.account_type}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 2: PARTNER NAME & CONTACT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="w-4.5 h-4.5 text-blue-600" />
            2. Partner Representative Contact Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Partner Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Rahul Sharma"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone Number *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Login Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="partner@merchant.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Login Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl py-2.5 pl-3 pr-10 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>

        {/* STEP 3: ASSIGN EMPLOYEE LEAD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users className="w-4.5 h-4.5 text-blue-600" />
            3. Assign Internal Employee Onboarding Lead
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Internal Staff Lead *
            </label>
            <select
              value={formData.assigned_employee_id}
              onChange={(e) => setFormData({ ...formData, assigned_employee_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Internal Staff Member --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name || emp.email} ({emp.role_name || (emp.is_admin ? 'Super Admin' : 'Staff')})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              This employee will manage tax/bank information, upload compliance documents, and forward the onboarding process.
            </p>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/dashboard/partners"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary py-2.5 px-5 shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : 'Register Partner'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
