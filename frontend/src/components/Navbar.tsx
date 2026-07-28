'use client';

import React, { useEffect, useState } from 'react';
import { User, Shield, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function Navbar() {
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    authApi
      .getMe()
      .then((res) => setUserInfo(res.data))
      .catch(() => {});
  }, []);

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Database Online
        </span>
      </div>

      {userInfo && (
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-800">{userInfo.full_name}</div>
            <div className="text-xs text-blue-600 flex items-center justify-end gap-1 font-medium">
              <Shield className="w-3 h-3 text-blue-600" />
              {userInfo.is_admin ? 'Super Admin' : userInfo.account_name ? `Partner (${userInfo.account_name})` : userInfo.role_name || 'Employee'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600 font-bold shadow-xs">
            <User className="w-5 h-5" />
          </div>
        </div>
      )}
    </header>
  );
}
