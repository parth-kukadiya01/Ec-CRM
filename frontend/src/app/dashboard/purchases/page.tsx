'use client';

import React, { useEffect, useState } from 'react';
import { purchasesApi, ordersApi, inventoryApi } from '@/lib/api';
import { ShoppingBag, CheckCircle, Clock, PackageCheck, AlertTriangle, Truck, Edit2, Trash2, Package } from 'lucide-react';

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'purchases'>('pending');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Make a Purchase Modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    order_id: 0,
    order_number: '',
    order_date: '',
    product_name: '',
    purchase_value: 0,
    estimated_shipment_date: '',
    account_name: '',
    qty: 1,
  });

  // Edit Purchase Modal state
  const [showEditPurchaseModal, setShowEditPurchaseModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [editPurchaseForm, setEditPurchaseForm] = useState({
    purchase_value: 0,
    estimated_shipment_date: '',
    account_name: '',
    status: 'Pending',
  });

  // Edit Order Modal state
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editOrderForm, setEditOrderForm] = useState({
    buyer_name: '',
    mobile_number: '',
    product_name: '',
    qty: 1,
    product_price: 0,
    account_name: '',
    status: 'Pending Review',
  });

  const loadAllData = async () => {
    try {
      setLoading(true);
      const ordRes = await ordersApi.list().catch(() => ({ data: [] }));
      const invRes = await inventoryApi.list().catch(() => ({ data: [] }));
      const purRes = await purchasesApi.list().catch(() => ({ data: [] }));
      setOrders(ordRes.data || []);
      setInventoryList(invRes.data || []);
      setPurchases(purRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Pending orders
  const pendingOrders = orders.filter(
    (ord) => ord.status === 'Pending Review' || ord.status === 'Make a Purchase' || ord.status === 'Out of Stock'
  );

  const getStock = (ord: any) => {
    const inv = inventoryList.find(
      (item) => String(item.id) === String(ord.product_id) || item.product_name.toLowerCase() === ord.product_name?.toLowerCase()
    );
    return inv ? inv.stock_quantity : 0;
  };

  const handleMarkReadyForShipment = async (orderId: number) => {
    try {
      await ordersApi.update(orderId, { status: 'Ready for Shipment' });
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error updating order status');
    }
  };

  const openPurchaseModal = (order: any) => {
    setSelectedOrder(order);
    setPurchaseForm({
      order_id: order.id,
      order_number: order.order_number || `#ORD-${order.id}`,
      order_date: order.order_date || new Date().toISOString().split('T')[0],
      product_name: order.product_name || '',
      purchase_value: (order.product_price || 0) * (order.qty || 1),
      estimated_shipment_date: '',
      account_name: order.account_name || '',
      qty: order.qty || 1,
    });
    setShowPurchaseModal(true);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await purchasesApi.create({
        order_id: purchaseForm.order_id,
        order_date: purchaseForm.order_date,
        product_name: purchaseForm.product_name,
        purchase_value: parseFloat(String(purchaseForm.purchase_value)),
        estimated_shipment_date: purchaseForm.estimated_shipment_date || null,
        account_name: purchaseForm.account_name,
        qty: purchaseForm.qty,
      });
      setShowPurchaseModal(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error creating procurement purchase');
    }
  };

  // Mark Purchase Done & Restock
  const handlePurchaseDone = async (id: number) => {
    try {
      await purchasesApi.update(id, { status: 'Received' });
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error updating purchase status');
    }
  };

  // Delete Purchase
  const handleDeletePurchase = async (id: number) => {
    if (confirm('Are you sure you want to delete this purchase entry?')) {
      try {
        await purchasesApi.delete(id);
        loadAllData();
      } catch (err) {
        console.error(err);
        alert('Error deleting purchase');
      }
    }
  };

  // Open Edit Purchase Modal
  const openEditPurchaseModal = (pur: any) => {
    setEditingPurchase(pur);
    setEditPurchaseForm({
      purchase_value: pur.purchase_value || 0,
      estimated_shipment_date: pur.estimated_shipment_date || '',
      account_name: pur.account_name || '',
      status: pur.status || 'Pending',
    });
    setShowEditPurchaseModal(true);
  };

  const handleUpdatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;
    try {
      await purchasesApi.update(editingPurchase.id, editPurchaseForm);
      setShowEditPurchaseModal(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error updating purchase');
    }
  };

  // Delete Order
  const handleDeleteOrder = async (id: number) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        await ordersApi.delete(id);
        loadAllData();
      } catch (err) {
        console.error(err);
        alert('Error deleting order');
      }
    }
  };

  // Open Edit Order Modal
  const openEditOrderModal = (order: any) => {
    setEditingOrder(order);
    setEditOrderForm({
      buyer_name: order.buyer_name || '',
      mobile_number: order.mobile_number || '',
      product_name: order.product_name || '',
      qty: order.qty || 1,
      product_price: order.product_price || 0,
      account_name: order.account_name || '',
      status: order.status || 'Pending Review',
    });
    setShowEditOrderModal(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      await ordersApi.update(editingOrder.id, editOrderForm);
      setShowEditOrderModal(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error updating order');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-amber-600" />
            Purchase Department & Procurement
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review incoming sales orders, verify stock availability, approve for shipment, or generate supplier purchase orders</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Orders Pending Review</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'pending' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {pendingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'purchases'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Procurement Purchase Orders</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'purchases' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {purchases.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Orders Pending Review */}
      {activeTab === 'pending' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading incoming orders...</div>
          ) : pendingOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              All incoming orders have been reviewed and processed!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Buyer & Contact</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">Required Qty</th>
                    <th className="py-3.5 px-4">Inventory Stock</th>
                    <th className="py-3.5 px-4 text-center">Purchase Department Actions</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {pendingOrders.map((ord) => {
                    const currentStock = getStock(ord);
                    const isStockSufficient = currentStock >= ord.qty;

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-blue-600">{ord.order_number}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">{ord.order_date}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{ord.buyer_name}</div>
                          <div className="text-xs text-slate-500">{ord.mobile_number}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">{ord.product_name}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{ord.qty} units</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                              isStockSufficient
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <Package className="w-3.5 h-3.5" />
                            {isStockSufficient
                              ? `Stock OK: ${currentStock} in stock`
                              : `Stock Low: ${currentStock} in stock`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleMarkReadyForShipment(ord.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                              title="Mark order ready for shipment"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Ready for Shipment</span>
                            </button>

                            <button
                              onClick={() => openPurchaseModal(ord)}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                              title="Generate supplier purchase order"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Make a Purchase</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditOrderModal(ord)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Order"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(ord.id)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Procurement Purchase Orders */}
      {activeTab === 'purchases' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading procurement purchases...</div>
          ) : purchases.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No procurement purchases recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Order Date</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">Qty</th>
                    <th className="py-3.5 px-4">Purchase Value</th>
                    <th className="py-3.5 px-4">Est. Delivery Date</th>
                    <th className="py-3.5 px-4">Account / Supplier</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Purchase Item Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {purchases.map((pur) => {
                    const isReceived = pur.status === 'Received';
                    return (
                      <tr key={pur.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-blue-600 font-medium">#ORD-{pur.order_id}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">{pur.order_date}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{pur.product_name}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{pur.qty}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-700">${pur.purchase_value.toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{pur.estimated_shipment_date || 'TBD'}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">{pur.account_name || 'N/A'}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                              isReceived
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {isReceived ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {isReceived ? 'Received / Done' : pur.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {!isReceived ? (
                            <button
                              onClick={() => handlePurchaseDone(pur.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Purchase Done (Received & Restock)</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-semibold">Purchase Done & Restocked</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditPurchaseModal(pur)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Purchase"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePurchase(pur.id)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Purchase"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MAKE A PURCHASE MODAL */}
      {showPurchaseModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-amber-600" />
              Make a Procurement Purchase
            </h2>
            <p className="text-xs text-slate-500">Enter procurement purchase details for company inventory restock</p>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase Order ID *</label>
                  <input
                    type="text"
                    required
                    value={purchaseForm.order_number}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, order_number: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-amber-600"
                    placeholder="Enter Purchase Order ID..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Order Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.order_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, order_date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={purchaseForm.product_name}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, product_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase Value ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchaseForm.purchase_value}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={purchaseForm.estimated_shipment_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, estimated_shipment_date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Account / Supplier Name</label>
                <input
                  type="text"
                  value={purchaseForm.account_name}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, account_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                  placeholder="e.g. Vendor Supplier Account"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  Submit Purchase Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PURCHASE MODAL */}
      {showEditPurchaseModal && editingPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-blue-600" />
              Edit Purchase Entry (#ORD-{editingPurchase.order_id})
            </h2>

            <form onSubmit={handleUpdatePurchase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editPurchaseForm.purchase_value}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, purchase_value: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estimated Delivery Date</label>
                <input
                  type="date"
                  value={editPurchaseForm.estimated_shipment_date}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, estimated_shipment_date: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Account / Supplier Name</label>
                <input
                  type="text"
                  value={editPurchaseForm.account_name}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, account_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={editPurchaseForm.status}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, status: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="Pending">Pending</option>
                  <option value="Received">Received / Done</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditPurchaseModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  Save Purchase Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORDER MODAL */}
      {showEditOrderModal && editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-blue-600" />
              Edit Order ({editingOrder.order_number})
            </h2>

            <form onSubmit={handleUpdateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Buyer Name</label>
                <input
                  type="text"
                  required
                  value={editOrderForm.buyer_name}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, buyer_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number</label>
                <input
                  type="text"
                  required
                  value={editOrderForm.mobile_number}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, mobile_number: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editOrderForm.product_name}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, product_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    value={editOrderForm.qty}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, qty: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editOrderForm.product_price}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, product_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={editOrderForm.status}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, status: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="Ready for Shipment">Ready for Shipment</option>
                  <option value="Make a Purchase">Make a Purchase</option>
                  <option value="Purchased">Purchased</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditOrderModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  Save Order Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
