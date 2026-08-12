'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { inventoryApi, authApi, usersApi } from '@/lib/api';
import ResizableTable from '@/components/ResizableTable';
import { Package, Plus, Search, Edit2, Trash2, AlertCircle, ShieldAlert, Store, CheckCircle2, Filter, Upload, Image as ImageIcon, Link as LinkIcon, Paperclip } from 'lucide-react';
import { hasPermission } from '@/lib/permissions';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    product_name: '',
    price: 0,
    stock_quantity: 0,
    sku: '',
    category: '',
    other_details: '',
    partner_id: '',
    image_url: '',
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      if (meRes.data) {
        setCurrentUser(meRes.data);
      }

      const [invRes, usersRes] = await Promise.all([
        inventoryApi.list(search).catch(() => ({ data: [] })),
        usersApi.list().catch(() => ({ data: [] })),
      ]);

      setItems(invRes.data || []);

      const allUsers = usersRes.data || [];
      const partnerUsers = allUsers.filter((u: any) => u.is_partner);
      setPartners(partnerUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search]);

  const roleName = currentUser?.role_name || currentUser?.role?.name || (currentUser?.is_admin ? 'Super Admin' : 'Employee');
  const isPartner = currentUser?.is_partner || currentUser?.role_name === 'Channel Partner';
  
  // Strictly restrict adding/editing/deleting inventory ONLY to Inventory Managers & Admins. Regular staff and partners are view-only.
  const isInventoryManager = !isPartner && (
    currentUser?.is_admin || 
    ['Inventory Manager', 'Super Admin', 'Operations Manager', 'General Manager'].includes(roleName) ||
    hasPermission(currentUser, 'inventory:write')
  );

  const isAllowed = isInventoryManager || hasPermission(currentUser, 'inventory:read');
  const canWrite = isInventoryManager;

  // Filter approved partners eligible for inventory stock linkage
  const approvedPartners = partners.filter((p) => p.onboarding_status === 'Active' || p.is_active);

  const openCreateModal = () => {
    setEditItem(null);
    setFormData({
      product_name: '',
      price: 0,
      stock_quantity: 0,
      sku: '',
      category: '',
      other_details: '',
      partner_id: '',
      image_url: '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditItem(item);
    setFormData({
      product_name: item.product_name || '',
      price: item.price || 0,
      stock_quantity: item.stock_quantity || 0,
      sku: item.sku || '',
      category: item.category || '',
      other_details: item.other_details || '',
      partner_id: item.partner_id ? String(item.partner_id) : '',
      image_url: item.image_url || '',
    });
    setShowModal(true);
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_name.trim()) {
      alert('Please enter Product Name');
      return;
    }
    if (!formData.sku.trim()) {
      alert('Please enter SKU Code');
      return;
    }
    if (!formData.category.trim()) {
      alert('Please enter Category');
      return;
    }

    try {
      const payload: any = {
        product_name: formData.product_name,
        price: parseFloat(String(formData.price)) || 0,
        stock_quantity: parseInt(String(formData.stock_quantity)) || 0,
        sku: formData.sku || null,
        category: formData.category || null,
        other_details: formData.other_details || null,
        partner_id: formData.partner_id ? parseInt(formData.partner_id) : 0,
        image_url: formData.image_url || null,
      };

      if (editItem) {
        await inventoryApi.update(editItem.id, payload);
      } else {
        await inventoryApi.create(payload);
      }
      setShowModal(false);
      fetchInventory();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Error saving product');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this inventory product?')) {
      try {
        await inventoryApi.delete(id);
        fetchInventory();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Error deleting product');
      }
    }
  };

  const filteredItems = items.filter((item) => {
    if (isPartner) {
      const isOwn = item.partner_id === currentUser?.id || item.partner_id === currentUser?.account_id || (item.partner_name && currentUser?.account_name && item.partner_name.includes(currentUser.account_name));
      return isOwn;
    }
    if (!selectedPartnerFilter) return true;
    if (selectedPartnerFilter === 'unlinked') return !item.partner_id;
    return String(item.partner_id) === selectedPartnerFilter;
  });

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center card-premium p-8 max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-surface-900">Access Restricted</h2>
        <p className="text-xs text-surface-500 mt-1">
          Your role (<strong className="text-surface-700">{roleName}</strong>) is restricted to your specific department.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Package className="w-4 h-4" />
            </div>
            {isPartner ? 'My Inventory Catalog' : 'Inventory & Channel Partner Products'}
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {isPartner ? 'View inventory catalog products assigned to your store' : 'Catalog stock management linked to Approved & Active Channel Partners'}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreateModal}
            className="btn-primary text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Inventory Item</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${isPartner ? 'sm:col-span-3' : 'sm:col-span-2'} card-premium p-2.5 flex items-center gap-2 bg-white`}>
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, SKU, or category..."
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
          />
        </div>

        {!isPartner && (
          <div className="card-premium p-2 bg-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600 ml-1 shrink-0" />
            <select
              value={selectedPartnerFilter}
              onChange={(e) => setSelectedPartnerFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="">-- All Partner Inventory --</option>
              <option value="unlinked">General Company Stock (Unlinked)</option>
              {approvedPartners.map((p) => (
                <option key={p.id} value={p.id}>
                  Partner: {p.full_name || p.email} ({p.account_name || 'Marketplace'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Product Table */}
      <div className="card-premium overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-medium">Loading inventory products...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No inventory items found</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {isPartner ? 'No products currently assigned to your store.' : 'Inventory managers can assign products directly to Approved & Active channel partners.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <ResizableTable className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <th className="py-3 px-4 text-center">Image</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Category</th>
                  {!isPartner && <th className="py-3 px-4">Linked Channel Partner</th>}
                  {!isPartner && <th className="py-3 px-4">Price</th>}
                  {!isPartner && <th className="py-3 px-4">Stock Level</th>}
                  {canWrite && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 text-center">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50 mx-auto"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 mx-auto">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">{item.product_name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-blue-700 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{item.sku || 'N/A'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-700 font-medium px-2 py-0.5 rounded bg-slate-100 border border-slate-200">{item.category || 'General'}</span>
                    </td>
                    {!isPartner && (
                      <td className="py-3.5 px-4">
                        {item.partner_name ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                            <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{item.partner_name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">General Stock (Unlinked)</span>
                        )}
                      </td>
                    )}
                    {!isPartner && (
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        ${item.price?.toFixed(2) || '0.00'}
                      </td>
                    )}
                    {!isPartner && (
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          item.stock_quantity < 10
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {item.stock_quantity} units in stock
                        </span>
                      </td>
                    )}
                    {canWrite && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </div>

      {/* Add / Edit Inventory Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="w-5 h-5 text-blue-600" />
              {editItem ? 'Edit Inventory Product' : 'Add New Inventory Product'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="e.g. Premium Silk Saree / Wireless Headphones"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* PRODUCT IMAGE UPLOAD / URL SECTION */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  Product Image (File Upload or Image URL):
                </label>

                <div className="flex items-center gap-3">
                  {formData.image_url ? (
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-300 shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Local Image File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileSelect}
                      />
                    </label>

                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* LINK CHANNEL PARTNER ACCOUNT */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-1.5">
                <label className="block text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-blue-600" />
                  Link to Channel Partner:
                </label>
                <select
                  value={formData.partner_id}
                  onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- General Company Stock (Unlinked) --</option>
                  {approvedPartners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email} ({p.account_name || 'Marketplace'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU-10023"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Electronics / Apparel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Initial Stock Units *</label>
                  <input
                    type="number"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Specifications & Notes</label>
                <textarea
                  rows={2}
                  value={formData.other_details}
                  onChange={(e) => setFormData({ ...formData, other_details: e.target.value })}
                  placeholder="e.g. Dimensions, weight, warranty details..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  {editItem ? 'Save Product Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
