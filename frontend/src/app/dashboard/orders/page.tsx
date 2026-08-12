'use client';

import React, { useEffect, useState } from 'react';
import { ordersApi, inventoryApi, accountsApi, purchasesApi, shipmentsApi, authApi } from '@/lib/api';
import SearchableSelect from '@/components/SearchableSelect';
import ResizableTable from '@/components/ResizableTable';
import { ShoppingCart, Plus, Truck, ShoppingBag, CheckCircle2, AlertTriangle, Image as ImageIcon, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { hasPermission } from '@/lib/permissions';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // Edit Order Form
  const [editOrderForm, setEditOrderForm] = useState({
    buyer_name: '',
    mobile_number: '',
    product_name: '',
    qty: 1,
    product_price: 0,
    shipment_address_1: '',
    shipment_address_2: '',
    account_name: '',
    status: 'Pending Review',
  });

  // Add Order Form
  const [orderForm, setOrderForm] = useState({
    order_date: new Date().toISOString().split('T')[0],
    last_shipment_date: '',
    product_id: '',
    product_name: '',
    qty: 1,
    product_price: 0,
    product_image: '',
    shipment_address_1: '',
    shipment_address_2: '',
    buyer_name: '',
    mobile_number: '',
    account_id: '',
    account_name: '',
  });

  // Commission Type and Value state
  const [commissionType, setCommissionType] = useState<'percent' | 'amount'>('percent');
  const [commissionVal, setCommissionVal] = useState<number>(0);

  // Purchase Form
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

  // Shipment Form
  const [shipmentForm, setShipmentForm] = useState({
    order_id: 0,
    order_number: '',
    product_name: '',
    shipment_partner: 'FedEx Express',
    tracking_id: '',
    weight: 1.5,
    shipment_cost: 25.0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const ordRes = await ordersApi.list().catch(() => ({ data: [] }));
      const invRes = await inventoryApi.list().catch(() => ({ data: [] }));
      const accRes = await accountsApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      setOrders(ordRes.data || []);
      setInventoryList(invRes.data || []);
      setAccountsList(accRes.data || []);
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

  const handleProductSelect = (value: string | number) => {
    const invItem = inventoryList.find((item) => String(item.id) === String(value));
    if (invItem) {
      setOrderForm({
        ...orderForm,
        product_id: String(invItem.id),
        product_name: invItem.product_name,
        product_price: invItem.price,
      });
    } else {
      setOrderForm({ ...orderForm, product_id: String(value), product_name: String(value) });
    }
  };

  const handleAccountSelect = (value: string | number) => {
    const accItem = accountsList.find((acc) => String(acc.id) === String(value));
    if (accItem) {
      setOrderForm({
        ...orderForm,
        account_id: String(accItem.id),
        account_name: accItem.account_name,
      });
    }
  };

  // Calculate dynamic commission amount
  const totalOrderPrice = (orderForm.product_price || 0) * (orderForm.qty || 1);
  const calculatedCommissionPrice = commissionType === 'percent'
    ? (totalOrderPrice * (commissionVal / 100))
    : commissionVal;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ordersApi.create({
        ...orderForm,
        product_id: orderForm.product_id ? parseInt(orderForm.product_id) : null,
        account_id: orderForm.account_id ? parseInt(orderForm.account_id) : null,
        qty: parseInt(String(orderForm.qty)) || 1,
        product_price: parseFloat(String(orderForm.product_price)) || 0,
        commission_price: parseFloat(calculatedCommissionPrice.toFixed(2)) || 0,
      });
      setShowAddModal(false);
      setCommissionType('percent');
      setCommissionVal(0);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error creating order');
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
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error creating purchase');
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (confirm('Delete this order?')) {
      try {
        await ordersApi.delete(id);
        loadData();
      } catch (err) {
        console.error(err);
        alert('Error deleting order');
      }
    }
  };

  const openEditModal = (order: any) => {
    setEditingOrder(order);
    setEditOrderForm({
      buyer_name: order.buyer_name || '',
      mobile_number: order.mobile_number || '',
      product_name: order.product_name || '',
      qty: order.qty || 1,
      product_price: order.product_price || 0,
      shipment_address_1: order.shipment_address_1 || '',
      shipment_address_2: order.shipment_address_2 || '',
      account_name: order.account_name || '',
      status: order.status || 'Pending Review',
    });
    setShowEditModal(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      await ordersApi.update(editingOrder.id, editOrderForm);
      setShowEditModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error updating order');
    }
  };

  const openShipmentModal = (order: any) => {
    setSelectedOrder(order);
    setShipmentForm({
      order_id: order.id,
      order_number: order.order_number || `#ORD-${order.id}`,
      shipment_partner: 'FedEx Express',
      tracking_id: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      product_name: order.product_name || '',
      weight: 1.5,
      shipment_cost: 25.0,
    });
    setShowShipmentModal(true);
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await shipmentsApi.create({
        order_id: shipmentForm.order_id || selectedOrder.id,
        shipment_partner: shipmentForm.shipment_partner,
        tracking_id: shipmentForm.tracking_id,
        product_name: shipmentForm.product_name || selectedOrder.product_name,
        product_image: selectedOrder.product_image,
        weight: parseFloat(String(shipmentForm.weight)),
        shipment_cost: parseFloat(String(shipmentForm.shipment_cost)),
      });
      setShowShipmentModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error creating shipment');
    }
  };

  const productOptions = inventoryList.map((item) => ({
    value: item.id,
    label: item.product_name,
    sublabel: `Price: ₹${item.price} | Stock: ${item.stock_quantity} units`,
  }));

  const accountOptions = accountsList.map((acc) => ({
    value: acc.id,
    label: acc.account_name,
    sublabel: `Type: ${acc.account_type} | Bank: ${acc.bank_name || 'N/A'}`,
  }));

  const openAddOrderModal = () => {
    const userAccount = currentUser?.account_name
      ? accountsList.find(acc => acc.account_name === currentUser.account_name || acc.id === currentUser.account_id)
      : null;
    setOrderForm({
      order_date: new Date().toISOString().split('T')[0],
      last_shipment_date: '',
      product_id: '',
      product_name: '',
      qty: 1,
      product_price: 0,
      product_image: '',
      shipment_address_1: '',
      shipment_address_2: '',
      buyer_name: '',
      mobile_number: '',
      account_id: userAccount ? String(userAccount.id) : (currentUser?.account_id ? String(currentUser.account_id) : ''),
      account_name: userAccount ? userAccount.account_name : (currentUser?.account_name || ''),
    });
    setCommissionType('percent');
    setCommissionVal(0);
    setShowAddModal(true);
  };

  const isPartner = currentUser?.is_partner || currentUser?.role_name === 'Channel Partner';
  const roleName = currentUser?.role_name || (currentUser?.is_admin ? 'Super Admin' : 'Employee');
  const isAllowed = hasPermission(currentUser, 'orders:read');
  const canWrite = hasPermission(currentUser, 'orders:write');

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center card-premium p-8 max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-surface-900">Access Restricted</h2>
        <p className="text-xs text-surface-500 mt-1">
          Your role (<strong className="text-surface-700">{roleName || 'Employee'}</strong>) is restricted to your specific department.
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
              <ShoppingCart className="w-4 h-4" />
            </div>
            Orders Management
          </h1>
          <p className="text-xs text-surface-400 mt-0.5">Sales order processing, inventory checks, and shipping dispatches</p>
        </div>
        <button
          onClick={openAddOrderModal}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          <span>Add Order</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-surface-400">Loading sales orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingCart className="w-10 h-10 text-surface-300 mx-auto mb-2" />
            <p className="text-xs text-surface-400">No orders recorded yet. Click "Add Order" to begin.</p>
          </div>
        ) : (
          <div className="table-container">
            <ResizableTable className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4 font-bold">Total Price</th>
                  <th className="py-3 px-4">Comm.</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-center">Action Flow</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {orders.map((ord) => {
                  const isPendingReview = ord.status === 'Pending Review';
                  const isReady = ord.status === 'Ready for Shipment';
                  const isNeedPurchase = ord.status === 'Pending Procurement' || ord.status === 'Out of Stock';
                  const isPurchased = ord.status === 'Purchased';
                  const isShipped = ord.status === 'Shipped';
                  const isDelivered = ord.status === 'Delivered';

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">
                        {ord.order_number}
                        {ord.product_image && (
                          <span className="ml-1.5 inline-block text-slate-400 hover:text-blue-600" title="Has Image">
                            <ImageIcon className="w-3.5 h-3.5 inline" />
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-medium whitespace-nowrap">{ord.order_date}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{ord.buyer_name}</div>
                        <div className="text-xs text-slate-500 font-medium">{ord.mobile_number}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap max-w-xs truncate">
                        {ord.product_name}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-800 text-xs">
                          {ord.qty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap text-xs">
                        ₹{(ord.product_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700 whitespace-nowrap text-xs">
                        ₹{((ord.product_price || 0) * (ord.qty || 1)).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        ₹{(ord.commission_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-surface-600 whitespace-nowrap">{ord.account_name || 'Direct'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${isReady
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : isPendingReview || isNeedPurchase
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                : isShipped || isDelivered
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200/80'
                            }`}
                        >
                          {isReady && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {(isPendingReview || isNeedPurchase) && <AlertTriangle className="w-3.5 h-3.5" />}
                          {isPendingReview ? 'Pending Review' : ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isPartner ? (
                          <span className="text-xs font-semibold text-slate-600 italic">{ord.status}</span>
                        ) : (
                          <>
                            {isPendingReview && (
                              <a
                                href="/dashboard/purchases"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 font-semibold text-xs rounded-lg inline-flex items-center gap-1 transition-all"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                                <span>In Review</span>
                              </a>
                            )}
                            {isReady && (
                              <button
                                onClick={() => openShipmentModal(ord)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center gap-1 transition-all"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Dispatch</span>
                              </button>
                            )}
                            {isNeedPurchase && (
                              <button
                                onClick={() => openPurchaseModal(ord)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center gap-1 transition-all"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>Create PO</span>
                              </button>
                            )}
                            {isPurchased && (
                              <span className="text-xs text-purple-700 font-semibold italic">Purchased</span>
                            )}
                            {isShipped && (
                              <span className="text-xs text-blue-600 font-semibold italic">Shipped</span>
                            )}
                            {isDelivered && (
                              <span className="text-xs text-emerald-600 font-semibold italic">Delivered</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {!isPartner && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(ord)}
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
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-surface-200 w-full max-w-xl rounded-xl shadow-modal overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                Add Sales Order
              </h2>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Order Date *</label>
                  <input
                    type="date"
                    required
                    value={orderForm.order_date}
                    onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Last Shipment Date</label>
                  <input
                    type="date"
                    value={orderForm.last_shipment_date}
                    onChange={(e) => setOrderForm({ ...orderForm, last_shipment_date: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Product *</label>
                <SearchableSelect
                  options={productOptions}
                  value={orderForm.product_id}
                  onChange={handleProductSelect}
                  placeholder="Select product..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Qty *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.qty}
                    onChange={(e) => setOrderForm({ ...orderForm, qty: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={orderForm.product_price}
                    onChange={(e) => setOrderForm({ ...orderForm, product_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Commission</span>
                    <span className="text-xs text-blue-600 font-mono font-bold">
                      ₹{calculatedCommissionPrice.toFixed(2)}
                    </span>
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={commissionType}
                      onChange={(e) => setCommissionType(e.target.value as 'percent' | 'amount')}
                      className="bg-white rounded-lg px-2 py-2 text-xs text-surface-900 font-semibold input-premium shrink-0"
                    >
                      <option value="percent">%</option>
                      <option value="amount">₹</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={commissionVal}
                      onChange={(e) => setCommissionVal(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white rounded-lg py-2 px-2.5 text-sm text-surface-900 input-premium"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Account</label>
                {(currentUser?.is_partner || currentUser?.account_name) && !currentUser?.is_admin ? (
                  <div className="w-full bg-surface-100 border border-surface-200 rounded-lg py-2 px-3 text-sm font-medium text-surface-800 flex items-center justify-between">
                    <span>{orderForm.account_name || currentUser.account_name || 'My Channel Account'}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700">Channel Partner Account</span>
                  </div>
                ) : (
                  <SearchableSelect
                    options={accountOptions}
                    value={orderForm.account_id}
                    onChange={handleAccountSelect}
                    placeholder="Select account..."
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    required
                    value={orderForm.buyer_name}
                    onChange={(e) => setOrderForm({ ...orderForm, buyer_name: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={orderForm.mobile_number}
                    onChange={(e) => setOrderForm({ ...orderForm, mobile_number: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Shipment Address 1 *</label>
                <input
                  type="text"
                  required
                  value={orderForm.shipment_address_1}
                  onChange={(e) => setOrderForm({ ...orderForm, shipment_address_1: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  placeholder="Street address..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Shipment Address 2</label>
                <input
                  type="text"
                  value={orderForm.shipment_address_2}
                  onChange={(e) => setOrderForm({ ...orderForm, shipment_address_2: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  placeholder="City, state, zip..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Product Image URL</label>
                <input
                  type="text"
                  value={orderForm.product_image}
                  onChange={(e) => setOrderForm({ ...orderForm, product_image: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs text-surface-500 hover:text-surface-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Procurement Modal */}
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
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-all"
                >
                  Submit Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-surface-200 w-full max-w-md rounded-xl shadow-modal overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Order ({editingOrder.order_number})
              </h2>
            </div>

            <form onSubmit={handleUpdateOrder} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Buyer Name</label>
                <input
                  type="text"
                  required
                  value={editOrderForm.buyer_name}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, buyer_name: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Mobile</label>
                <input
                  type="text"
                  required
                  value={editOrderForm.mobile_number}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, mobile_number: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Product</label>
                <input
                  type="text"
                  required
                  value={editOrderForm.product_name}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, product_name: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Qty</label>
                  <input
                    type="number"
                    required
                    value={editOrderForm.qty}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, qty: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editOrderForm.product_price}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, product_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={editOrderForm.status}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, status: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="Ready for Shipment">Ready for Shipment</option>
                  <option value="Pending Procurement">Pending Procurement</option>
                  <option value="Purchased">Purchased</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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

      {/* Shipment Modal */}
      {showShipmentModal && selectedOrder && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-surface-200 w-full max-w-md rounded-xl shadow-modal overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Dispatch Shipment
              </h2>
            </div>

            <form onSubmit={handleCreateShipment} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Order # *</label>
                <input
                  type="text"
                  required
                  value={shipmentForm.order_number}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, order_number: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 font-mono input-premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Carrier *</label>
                  <input
                    type="text"
                    required
                    value={shipmentForm.shipment_partner}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, shipment_partner: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                    placeholder="FedEx, DHL..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Tracking ID *</label>
                  <input
                    type="text"
                    required
                    value={shipmentForm.tracking_id}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, tracking_id: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 font-mono input-premium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Product *</label>
                <input
                  type="text"
                  required
                  value={shipmentForm.product_name}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, product_name: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={shipmentForm.weight}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={shipmentForm.shipment_cost}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, shipment_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowShipmentModal(false)}
                  className="px-3.5 py-2 text-xs text-surface-500 hover:text-surface-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
