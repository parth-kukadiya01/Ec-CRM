'use client';

import React, { useState } from 'react';
import { authApi } from '@/lib/api';
import { getDefaultRoute } from '@/lib/permissions';
import { Lock, Mail, Zap, ArrowRight, ShieldCheck, AlertCircle, BarChart3, Package, Users, Globe, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({ email, password });
      const { access_token } = response.data;
      if (access_token) {
        localStorage.setItem('crm_token', access_token);
        try {
          const meRes = await authApi.getMe();
          const target = getDefaultRoute(meRes.data);
          window.location.href = target;
        } catch {
          window.location.href = '/dashboard';
        }
      } else {
        setError('Login response did not contain access token');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Cannot connect to the backend server. Please ensure the server is running.');
      } else {
        setError(err.response?.data?.detail || 'Login failed. Please verify email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track orders, revenue, and inventory live' },
    { icon: Package, title: 'Inventory Control', desc: 'Automated stock management & alerts' },
    { icon: Users, title: 'Team Management', desc: 'RBAC with granular permissions' },
    { icon: Globe, title: 'Multi-Channel', desc: 'Manage partner accounts & channels' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand / Feature Showcase */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-gradient-to-br from-[#0f172a] via-[#0f1d38] to-[#0c1629] flex-col justify-between p-12 overflow-hidden">
        {/* Background Mesh */}
        <div className="absolute inset-0 mesh-gradient opacity-40" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[100px] animate-float" style={{ animationDelay: '3s' }} />

        {/* Top — Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-white tracking-tight">RBS Suite</h1>
              <p className="text-[11px] text-blue-300/80 font-medium">Enterprise Order Operations Platform</p>
            </div>
          </div>
        </div>

        {/* Center — Headline */}
        <div className="relative z-10 -mt-8">
          <h2 className="text-[36px] font-extrabold text-white leading-[1.15] tracking-tight mb-4">
            Manage Your<br />
            <span className="gradient-text">Entire Business</span><br />
            In One Place
          </h2>
          <p className="text-slate-300 text-[13px] max-w-md leading-relaxed">
            End-to-end B2B operations platform with inventory management, order processing, procurement workflows, and shipment tracking — all with role-based access control.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all group"
                >
                  <div className="w-8 h-8 rounded-md bg-blue-500/15 flex items-center justify-center mb-2.5 group-hover:bg-blue-500/25 transition-colors">
                    <Icon className="w-4 h-4 text-blue-300" />
                  </div>
                  <div className="text-[13px] font-semibold text-white mb-0.5">{f.title}</div>
                  <div className="text-[11px] text-slate-400 leading-normal">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-[11px] text-slate-500 font-medium">© 2026 CRM Suite. Built for enterprise teams.</p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 lg:px-16 bg-white relative">
        {/* Subtle Background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/[0.03] rounded-full blur-[60px] pointer-events-none" />

        <div className="w-full max-w-[400px] relative z-10">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Zap className="w-[18px] h-[18px] text-white" />
            </div>
            <h1 className="text-[16px] font-bold text-slate-900">CRM Suite</h1>
          </div>

          <div className="mb-7">
            <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-[13px] text-slate-500 font-medium mt-1">Sign in to access your CRM dashboard</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-[13px] font-medium flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-[13px] text-slate-900 placeholder:text-slate-400 input-premium focus:bg-white"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-lg py-2.5 pl-10 pr-10 text-[13px] text-slate-900 placeholder:text-slate-400 input-premium focus:bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-[13px]">Signing in...</span>
                </div>
              ) : (
                <>
                  <span className="text-[13px]">Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
