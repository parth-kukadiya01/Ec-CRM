'use client';

import React, { useEffect, useState } from 'react';
import { purchasesApi, ordersApi, inventoryApi, authApi } from '@/lib/api';
import { ShoppingBag, CheckCircle, Clock, PackageCheck, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import ResizableTable from '@/components/ResizableTable';
import { hasPermission } from '@/lib/permissions';

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'purchases'>('pending');

  const [orders, setOrders] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pending Procurement Modal state
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
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      setOrders(ordRes.data || []);
      setInventoryList(invRes.data || []);
      setPurchases(purRes.data || []);
      setCurrentUser(meRes?.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const pendingOrders = orders.filter(
    (ord) => ord.status === 'Pending Review' || ord.status === 'Pending Procurement' || ord.status === 'Out of Stock'
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
      alert('Error creating purchase');
    }
  };

  const handlePurchaseDone = async (id: number) => {
    try {
      await purchasesApi.update(id, { status: 'Received' });
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error updating purchase status');
    }
  };

  const handleDeletePurchase = async (id: number) => {
    if (confirm('Delete this purchase?')) {
      try {
        await purchasesApi.delete(id);
        loadAllData();
      } catch (err) {
        console.error(err);
        alert('Error deleting purchase');
      }
    }
  };

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

  const handleDeleteOrder = async (id: number) => {
    if (confirm('Delete this order?')) {
      try {
        await ordersApi.delete(id);
        loadAllData();
      } catch (err) {
        console.error(err);
        alert('Error deleting order');
      }
    }
  };

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

  const roleName = currentUser?.role_name || (currentUser?.is_admin ? 'Super Admin' : 'Employee');
  const isAllowed = hasPermission(currentUser, 'purchases:read');
  const canWrite = hasPermission(currentUser, 'purchases:write');

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            Purchases & Procurement
          </h1>
          <p className="text-xs text-surface-400 mt-0.5">Order review, stock verification, and supplier procurement</p>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              if (orders.length > 0) {
                openPurchaseModal(orders[0]);
              } else {
                alert('No pending orders available to create a purchase order');
              }
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>+ Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 pb-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'pending'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
            }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Review</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'pending' ? 'bg-blue-700 text-white' : 'bg-surface-100 text-surface-700'
            }`}>
            {pendingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'purchases'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
            }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span>Purchase Orders</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'purchases' ? 'bg-blue-700 text-white' : 'bg-surface-100 text-surface-700'
            }`}>
            {purchases.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Orders Pending Review */}
      {activeTab === 'pending' && (
        <div className="card-premium overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-surface-400">Loading orders...</span>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold text-surface-700">All orders processed and routed!</p>
            </div>
          ) : (
            <div className="table-container">
              <ResizableTable className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Buyer & Partner</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4 whitespace-nowrap">Database Stock Status</th>
                    <th className="py-3 px-4 text-center">Purchase Manager Actions</th>
                    <th className="py-3 px-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {pendingOrders.map((ord) => {
                    const currentStock = getStock(ord);
                    const isStockSufficient = currentStock >= ord.qty;

                    return (
                      <tr key={ord.id} className="table-row-hover">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">{ord.order_number}</td>
                        <td className="py-3 px-4 text-xs text-slate-600 font-medium whitespace-nowrap">{ord.order_date}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{ord.buyer_name}</div>
                          <div className="text-xs text-blue-600 font-semibold">{ord.account_name || 'Channel Partner'}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{ord.product_name}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{ord.qty} units</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 ${isStockSufficient
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border border-amber-300'
                              }`}
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isStockSufficient ? '#10b981' : '#f59e0b' }} />
                            {isStockSufficient
                              ? `Stock Available: ${currentStock} in DB`
                              : `Insufficient DB Stock: ${currentStock} available`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {isStockSufficient && (
                              <button
                                onClick={() => handleMarkReadyForShipment(ord.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-all"
                                title="Approve order and deduct inventory stock"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approve & Fulfill</span>
                              </button>
                            )}

                            <button
                              onClick={() => openPurchaseModal(ord)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-all"
                              title="Create supplier purchase order"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Create PO</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditOrderModal(ord)}
                              className="p-1.5 rounded-md text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(ord.id)}
                              className="p-1.5 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ResizableTable>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Procurement Purchase Orders */}
      {activeTab === 'purchases' && (
        <div className="card-premium overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-surface-400">Loading purchase orders...</span>
            </div>
          ) : purchases.length === 0 ? (
            <div className="py-12 text-center">
              <PackageCheck className="w-10 h-10 text-surface-300 mx-auto mb-2" />
              <p className="text-xs text-surface-400">No purchases recorded</p>
            </div>
          ) : (
            <div className="table-container">
              <ResizableTable className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-50 text-surface-500 text-[11px] font-semibold uppercase tracking-wider border-b border-surface-200">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Value (₹)</th>
                    <th className="py-3 px-4">Est. Delivery</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {purchases.map((pur) => (
                    <tr key={pur.id} className="table-row-hover">
                      <td className="py-3 px-4 font-mono font-medium text-blue-600 whitespace-nowrap">#ORD-{pur.order_id}</td>
                      <td className="py-3 px-4 text-xs text-surface-400 whitespace-nowrap">{pur.order_date || '—'}</td>
                      <td className="py-3 px-4 font-semibold text-surface-900 whitespace-nowrap">{pur.product_name}</td>
                      <td className="py-3 px-4 font-bold text-surface-800 whitespace-nowrap">{pur.qty}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600 whitespace-nowrap">₹{pur.purchase_value.toFixed(2)}</td>
                      <td className="py-3 px-4 text-xs text-surface-500 whitespace-nowrap">{pur.estimated_shipment_date || 'TBD'}</td>
                      <td className="py-3 px-4 text-xs text-surface-600 whitespace-nowrap">{pur.account_name || 'Direct'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${pur.status === 'Received'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                          }`}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pur.status === 'Received' ? '#10b981' : '#f59e0b' }} />
                          {pur.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {pur.status !== 'Received' && (
                            <button
                              onClick={() => handlePurchaseDone(pur.id)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-md text-xs font-semibold transition-all"
                            >
                              Received
                            </button>
                          )}
                          <button
                            onClick={() => openEditPurchaseModal(pur)}
                            className="p-1.5 rounded-md text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePurchase(pur.id)}
                            className="p-1.5 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ResizableTable>
            </div>
          )}
        </div>
      )}

      {/* Make Purchase Modal */}
      {showPurchaseModal && selectedOrder && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-surface-200 w-full max-w-md rounded-xl shadow-modal overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                Make Purchase
              </h2>
            </div>

            <form onSubmit={handleCreatePurchase} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">PO ID *</label>
                  <input
                    type="text"
                    required
                    value={purchaseForm.order_number}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, order_number: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 font-mono input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.order_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, order_date: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Product *</label>
                <input
                  type="text"
                  required
                  value={purchaseForm.product_name}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, product_name: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Value (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchaseForm.purchase_value}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Est. Delivery</label>
                  <input
                    type="date"
                    value={purchaseForm.estimated_shipment_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, estimated_shipment_date: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Supplier</label>
                <input
                  type="text"
                  value={purchaseForm.account_name}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, account_name: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-3.5 py-2 text-xs text-surface-500 hover:text-surface-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase Modal */}
      {showEditPurchaseModal && editingPurchase && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-surface-200 w-full max-w-md rounded-xl shadow-modal overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Purchase
              </h2>
            </div>

            <form onSubmit={handleUpdatePurchase} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Value (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editPurchaseForm.purchase_value}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, purchase_value: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Est. Delivery</label>
                <input
                  type="date"
                  value={editPurchaseForm.estimated_shipment_date}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, estimated_shipment_date: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Supplier</label>
                <input
                  type="text"
                  value={editPurchaseForm.account_name}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, account_name: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={editPurchaseForm.status}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, status: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                >
                  <option value="Pending">Pending</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Received">Received</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowEditPurchaseModal(false)}
                  className="px-3.5 py-2 text-xs text-surface-500 hover:text-surface-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
