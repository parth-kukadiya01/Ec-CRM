'use client';

import React, { useEffect, useState } from 'react';
import { rolesApi, authApi } from '@/lib/api';
import { ShieldCheck, Plus, Edit2, Trash2, Key, ShieldAlert } from 'lucide-react';
import { hasPermission } from '@/lib/permissions';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const rolesRes = await rolesApi.list().catch(() => ({ data: [] }));
      const permsRes = await rolesApi.listPermissions().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);
      setCurrentUser(meRes?.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditRole(null);
    setName('');
    setDescription('');
    setSelectedPermIds([]);
    setShowModal(true);
  };

  const openEditModal = (role: any) => {
    setEditRole(role);
    setName(role.name || '');
    setDescription(role.description || '');
    const activeIds = (role.permissions || []).map((p: any) => p.id);
    setSelectedPermIds(activeIds);
    setShowModal(true);
  };

  const togglePermission = (id: number) => {
    if (selectedPermIds.includes(id)) {
      setSelectedPermIds(selectedPermIds.filter((pId) => pId !== id));
    } else {
      setSelectedPermIds([...selectedPermIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        description,
        permission_ids: selectedPermIds,
      };

      if (editRole) {
        await rolesApi.update(editRole.id, payload);
      } else {
        await rolesApi.create(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error saving role');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this role record?')) {
      try {
        await rolesApi.delete(id);
        loadData();
      } catch (err) {
        console.error(err);
        alert('Error deleting role');
      }
    }
  };

  const isAllowed = hasPermission(currentUser, 'roles:manage');

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center bg-white border border-[#c3c4c7] p-8 max-w-lg mx-auto mt-10 rounded-xs shadow-xs">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1d2327]">Access Restricted</h2>
        <p className="text-xs text-[#50575e] mt-1">
          Only Super Administrators can manage roles and permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-[#2c3338]">
      
      {/* WP Admin Header Toolbar */}
      <div className="bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1d2327] tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#2271b1] inline-block rounded-xs" />
            Roles & Granular Access Control
          </h1>
          <p className="text-xs text-[#50575e] mt-1">System Role Matrix & RBAC Module Permissions</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm shadow-xs transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Role</span>
        </button>
      </div>

      {/* WP Admin Roles Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="w-6 h-6 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-[#50575e]">Loading roles matrix...</span>
          </div>
        ) : roles.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border border-[#c3c4c7] rounded-sm">
            <ShieldCheck className="w-8 h-8 text-[#a7aaad] mx-auto mb-2" />
            <p className="text-xs text-[#50575e]">No custom roles created yet.</p>
          </div>
        ) : (
          roles.map((role) => {
            const rolePerms = role.permissions || [];
            return (
              <div key={role.id} className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm p-4 flex flex-col justify-between hover:border-[#2271b1] transition-all">
                <div>
                  <div className="flex items-center justify-between border-b border-[#c3c4c7] pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#2271b1]" />
                      <h3 className="font-bold text-sm text-[#1d2327]">{role.name}</h3>
                    </div>
                    <span className="px-2 py-0.5 bg-[#f0f0f1] text-[#1d2327] border border-[#c3c4c7] font-bold text-[10px] uppercase rounded-xs">
                      {rolePerms.length} Permissions
                    </span>
                  </div>

                  <p className="text-xs text-[#50575e] mb-3 line-clamp-2">{role.description || 'No description provided.'}</p>

                  <div className="space-y-1 mb-4">
                    <span className="text-[10px] font-bold text-[#50575e] uppercase tracking-wider block mb-1">Granted Privileges:</span>
                    <div className="flex flex-wrap gap-1">
                      {rolePerms.slice(0, 6).map((p: any) => (
                        <span key={p.id} className="px-2 py-0.5 bg-[#e8f3fc] text-[#135e96] border border-[#b2d4f5] text-[10px] font-semibold rounded-xs">
                          {p.name}
                        </span>
                      ))}
                      {rolePerms.length > 6 && (
                        <span className="px-2 py-0.5 bg-[#f0f0f1] text-[#50575e] text-[10px] font-bold rounded-xs">
                          +{rolePerms.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f1]">
                  <button
                    onClick={() => openEditModal(role)}
                    className="px-2.5 py-1 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2271b1] border border-[#c3c4c7] font-bold text-xs rounded-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Permissions</span>
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded-xs"
                    title="Delete Role"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* WP Meta-Box Create / Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] w-full max-w-2xl shadow-xl rounded-sm font-sans overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#1d2327] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Key className="w-4 h-4 text-[#72aee6]" />
                {editRole ? `Edit Role: ${editRole.name}` : 'Create New Custom Role'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-[#1d2327] mb-1">Role Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Logistics Coordinator"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#8c8f94] p-2 font-bold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#1d2327] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Responsibilities and access scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-[#8c8f94] p-2 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1d2327] mb-2 uppercase tracking-wider">Module Permissions Matrix:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#f6f7f7] border border-[#c3c4c7] p-3 rounded-xs max-h-56 overflow-y-auto">
                  {permissions.map((perm) => {
                    const isChecked = selectedPermIds.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`p-2 border rounded-xs flex items-start gap-2 cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#e8f3fc] border-[#2271b1] text-[#135e96]' : 'bg-white border-[#c3c4c7] text-[#2c3338]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 accent-[#2271b1]"
                        />
                        <div>
                          <div className="font-bold">{perm.name}</div>
                          <div className="text-[10px] text-[#50575e]">{perm.description || perm.module}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#c3c4c7]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-[#f6f7f7] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold rounded-xs shadow-xs"
                >
                  Save Role & Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
