'use client';

import React, { useEffect, useState } from 'react';
import { rolesApi, authApi } from '@/lib/api';
import { ShieldCheck, Plus, Edit2, Trash2, CheckSquare, Square, Key, ShieldAlert } from 'lucide-react';
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
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Error saving role');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this role?')) {
      try {
        await rolesApi.delete(id);
        loadData();
      } catch (err: any) {
        console.error(err);
        alert('Error deleting role');
      }
    }
  };

  const groupedPerms: { [key: string]: any[] } = {};
  permissions.forEach((perm) => {
    const mod = perm.module || 'general';
    if (!groupedPerms[mod]) groupedPerms[mod] = [];
    groupedPerms[mod].push(perm);
  });

  const roleName = currentUser?.role_name || (currentUser?.is_admin ? 'Super Admin' : 'Employee');
  const isAllowed = hasPermission(currentUser, 'roles:manage');

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center card-premium p-8 max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-surface-900">Access Restricted</h2>
        <p className="text-xs text-surface-500 mt-1">
          Role administration is restricted to Super Admin users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            Roles & Permissions
          </h1>
          <p className="text-xs text-surface-400 mt-0.5">Role definitions and module permission access control</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          <span>New Role</span>
        </button>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-surface-400">Loading roles...</span>
        </div>
      ) : roles.length === 0 ? (
        <div className="py-12 text-center">
          <ShieldCheck className="w-10 h-10 text-surface-300 mx-auto mb-2" />
          <p className="text-xs text-surface-400">No custom roles created</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div 
              key={role.id} 
              className="card-premium p-5 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white shrink-0">
                      <Key className="w-3 h-3" />
                    </div>
                    {role.name}
                  </h3>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => openEditModal(role)}
                      className="p-1.5 rounded-md text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {role.name !== 'Super Admin' && (
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="p-1.5 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1 ml-8">{role.description || 'No description'}</p>

                <div className="mt-3 pt-3 border-t border-surface-100">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Permissions ({role.permissions?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(role.permissions || []).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">None</span>
                    ) : (
                      role.permissions.map((p: any) => (
                        <span key={p.id} className="px-2.5 py-1 rounded-md text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 font-semibold whitespace-nowrap">
                          {p.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-surface-200 w-full max-w-xl rounded-xl shadow-modal overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                {editRole ? 'Edit Role' : 'Create Role'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-slate-900 input-premium"
                  placeholder="e.g. Sales Manager"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-slate-900 input-premium"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-surface-100">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Module Permissions:</h3>
                {Object.keys(groupedPerms).map((modName) => (
                  <div key={modName} className="bg-surface-50 p-3.5 rounded-lg border border-surface-200 space-y-2">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">{modName}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {groupedPerms[modName].map((perm) => {
                        const isChecked = selectedPermIds.includes(perm.id);
                        return (
                          <button
                            key={perm.id}
                            type="button"
                            onClick={() => togglePermission(perm.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-all border ${
                              isChecked
                                ? 'bg-blue-50 text-blue-800 border-blue-300 font-semibold'
                                : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-surface-300 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="font-mono text-surface-800 truncate">{perm.name}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 text-xs text-surface-500 hover:text-surface-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editRole ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
