'use client';

import React, { useState } from 'react';
import { authApi } from '@/lib/api';
import { Lock, Mail, Sparkles, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@crm.com');
  const [password, setPassword] = useState('admin123');
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
        // Direct location navigation to guarantee immediate dashboard load
        window.location.href = '/dashboard';
      } else {
        setError('Login response did not contain access token');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Backend server is not running on http://127.0.0.1:8000. Please start backend server.');
      } else {
        setError(err.response?.data?.detail || 'Login failed. Please verify email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background Subtle Accent Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/80 p-8 rounded-2xl shadow-xl backdrop-blur-xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-sm text-slate-500 mt-1">Sign in directly to access CRM System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="admin@crm.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Preset Admin Credentials Box */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-700 font-semibold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Default Super Admin Credentials:</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 font-mono">
              <span>Email: <strong className="text-slate-900">admin@crm.com</strong></span>
            </div>
            <div className="flex justify-between items-center text-slate-600 font-mono">
              <span>Password: <strong className="text-slate-900">admin123</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
