'use client';

import React, { useEffect, useState } from 'react';
import { rolesApi } from '@/lib/api';
import { ShieldCheck, Plus, Edit2, Trash2, CheckSquare, Square, Key } from 'lucide-react';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
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
      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);
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
    if (confirm('Are you sure you want to delete this role?')) {
      try {
        await rolesApi.delete(id);
        loadData();
      } catch (err: any) {
        console.error(err);
        alert('Error deleting role');
      }
    }
  };

  // Group permissions by module
  const groupedPerms: { [key: string]: any[] } = {};
  permissions.forEach((perm) => {
    const mod = perm.module || 'general';
    if (!groupedPerms[mod]) groupedPerms[mod] = [];
    groupedPerms[mod].push(perm);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Roles & Granular Permissions
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure employee roles and grant module permissions across the CRM system</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Role</span>
        </button>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading roles & permissions...</div>
      ) : roles.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">No custom roles created yet</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div key={role.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-600" />
                    {role.name}
                  </h3>
                  <div className="space-x-1">
                    <button
                      onClick={() => openEditModal(role)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {role.name !== 'Super Admin' && (
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">{role.description || 'No description provided'}</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Assigned Permissions ({role.permissions?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(role.permissions || []).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No permissions assigned</span>
                    ) : (
                      role.permissions.map((p: any) => (
                        <span key={p.id} className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
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

      {/* Role Creation/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
              {editRole ? 'Edit Role Permissions' : 'Create Role & Assign Permissions'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. Sales Manager, Warehouse Clerk"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Brief description of this role's duties..."
                />
              </div>

              {/* Permission Checkboxes grouped by Module */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Module Permissions:</h3>
                {Object.keys(groupedPerms).map((modName) => (
                  <div key={modName} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">{modName} Module</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupedPerms[modName].map((perm) => {
                        const isChecked = selectedPermIds.includes(perm.id);
                        return (
                          <button
                            key={perm.id}
                            type="button"
                            onClick={() => togglePermission(perm.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-colors border ${
                              isChecked
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-300 font-semibold'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <div>
                              <div className="font-mono text-slate-900">{perm.name}</div>
                              <div className="text-[11px] text-slate-500 font-normal">{perm.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  {editRole ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
