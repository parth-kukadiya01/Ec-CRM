'use client';

import React, { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { Package, Plus, Search, Edit2, Trash2, AlertCircle } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    product_name: '',
    price: 0,
    stock_quantity: 0,
    sku: '',
    category: '',
    other_details: '',
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.list(search);
      setItems(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search]);

  const openCreateModal = () => {
    setEditItem(null);
    setFormData({
      product_name: '',
      price: 0,
      stock_quantity: 0,
      sku: '',
      category: '',
      other_details: '',
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
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) {
        await inventoryApi.update(editItem.id, formData);
      } else {
        await inventoryApi.create(formData);
      }
      setShowModal(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      alert('Error saving inventory item');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product from inventory?')) {
      try {
        await inventoryApi.delete(id);
        fetchInventory();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-emerald-600" />
            Inventory Stock Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Maintain product catalogue, pricing, and stock levels</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-xs">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product name..."
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading inventory products...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No inventory products found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price ($)</th>
                  <th className="py-3.5 px-4">Stock Quantity</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{item.product_name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{item.sku || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.category || 'General'}</td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">${item.price.toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.stock_quantity > 5
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.stock_quantity > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {item.stock_quantity <= 0 && <AlertCircle className="w-3 h-3" />}
                        {item.stock_quantity} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-500">{item.other_details || '—'}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-900">{editItem ? 'Edit Product' : 'Add New Inventory Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Other Details / Specifications</label>
                <textarea
                  rows={3}
                  value={formData.other_details}
                  onChange={(e) => setFormData({ ...formData, other_details: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Enter specs, warranty, features..."
                />
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  {editItem ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
