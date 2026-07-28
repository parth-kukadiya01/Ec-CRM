'use client';

import React, { useEffect, useState } from 'react';
import { ordersApi, inventoryApi, accountsApi, purchasesApi, shipmentsApi } from '@/lib/api';
import SearchableSelect from '@/components/SearchableSelect';
import { ShoppingCart, Plus, Truck, ShoppingBag, CheckCircle2, AlertTriangle, Image as ImageIcon, Percent, DollarSign, Edit2, Trash2 } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
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

  // Commission Type and Value state (Default: percent)
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
      setOrders(ordRes.data || []);
      setInventoryList(invRes.data || []);
      setAccountsList(accRes.data || []);
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
      // Reset commission inputs
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
    if (confirm('Are you sure you want to delete this order?')) {
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
    sublabel: `Price: $${item.price} | Stock: ${item.stock_quantity} units`,
  }));

  const accountOptions = accountsList.map((acc) => ({
    value: acc.id,
    label: acc.account_name,
    sublabel: `Type: ${acc.account_type} | Bank: ${acc.bank_name || 'N/A'}`,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-blue-600" />
            Add & Manage Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create sales orders, check automated stock status, dispatch shipments or generate procurement purchases</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Order</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading sales orders...</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No orders recorded yet. Click "Add New Order" to begin.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Buyer & Mobile</th>
                  <th className="py-3.5 px-4">Product & Price</th>
                  <th className="py-3.5 px-4">Commission</th>
                  <th className="py-3.5 px-4">Account Source</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4 text-center">Action Flow</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {orders.map((ord) => {
                  const isPendingReview = ord.status === 'Pending Review';
                  const isReady = ord.status === 'Ready for Shipment';
                  const isNeedPurchase = ord.status === 'Make a Purchase' || ord.status === 'Out of Stock';
                  const isPurchased = ord.status === 'Purchased';
                  const isShipped = ord.status === 'Shipped';
                  const isDelivered = ord.status === 'Delivered';

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-blue-600">
                        {ord.order_number}
                        {ord.product_image && (
                          <span className="ml-2 inline-block text-slate-400 hover:text-blue-600" title="Has Image">
                            <ImageIcon className="w-3.5 h-3.5 inline" />
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{ord.order_date}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ord.buyer_name}</div>
                        <div className="text-xs text-slate-500">{ord.mobile_number}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{ord.product_name} <span className="text-xs text-slate-500">(x{ord.qty})</span></div>
                        <div className="text-xs text-emerald-700 font-semibold">${(ord.product_price * ord.qty).toFixed(2)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-blue-700">
                        ${(ord.commission_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">{ord.account_name || 'Direct Admin'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                            isReady
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPendingReview || isNeedPurchase
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isShipped || isDelivered
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {isReady && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {(isPendingReview || isNeedPurchase) && <AlertTriangle className="w-3.5 h-3.5" />}
                          {isPendingReview ? 'Pending Purchase Review' : ord.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPendingReview && (
                          <a
                            href="/dashboard/purchases"
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs rounded-xl inline-flex items-center gap-1 transition-all"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                            <span>In Purchase Dept Review</span>
                          </a>
                        )}
                        {isReady && (
                          <button
                            onClick={() => openShipmentModal(ord)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Dispatch Shipment</span>
                          </button>
                        )}
                        {isNeedPurchase && (
                          <button
                            onClick={() => openPurchaseModal(ord)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Make a Purchase</span>
                          </button>
                        )}
                        {isPurchased && (
                          <span className="text-xs text-purple-700 font-semibold italic">Procurement Purchase Created</span>
                        )}
                        {isShipped && (
                          <span className="text-xs text-blue-700 font-semibold italic">Shipped</span>
                        )}
                        {isDelivered && (
                          <span className="text-xs text-emerald-700 font-semibold italic">Delivered</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(ord)}
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

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              Create Sales Order
            </h2>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Order Date *</label>
                  <input
                    type="date"
                    required
                    value={orderForm.order_date}
                    onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Last Shipment Date</label>
                  <input
                    type="date"
                    value={orderForm.last_shipment_date}
                    onChange={(e) => setOrderForm({ ...orderForm, last_shipment_date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Product Selection with Search */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name (Searchable Dropdown) *</label>
                <SearchableSelect
                  options={productOptions}
                  value={orderForm.product_id}
                  onChange={handleProductSelect}
                  placeholder="Search and select product from inventory..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.qty}
                    onChange={(e) => setOrderForm({ ...orderForm, qty: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Product Unit Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={orderForm.product_price}
                    onChange={(e) => setOrderForm({ ...orderForm, product_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Commission input with Percent % and Flat Amount $ options */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Commission</span>
                    <span className="text-[11px] text-blue-700 font-mono font-medium">
                      Calc: ${calculatedCommissionPrice.toFixed(2)}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={commissionType}
                      onChange={(e) => setCommissionType(e.target.value as 'percent' | 'amount')}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600 shrink-0"
                    >
                      <option value="percent">% Percent</option>
                      <option value="amount">$ Amount</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={commissionVal}
                      onChange={(e) => setCommissionVal(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                      placeholder={commissionType === 'percent' ? 'e.g. 5%' : 'e.g. 10.00'}
                    />
                  </div>
                </div>
              </div>

              {/* Account Selection with Search */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Account / Channel (Searchable Dropdown)</label>
                <SearchableSelect
                  options={accountOptions}
                  value={orderForm.account_id}
                  onChange={handleAccountSelect}
                  placeholder="Select which partner/store account received this order..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    required
                    value={orderForm.buyer_name}
                    onChange={(e) => setOrderForm({ ...orderForm, buyer_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={orderForm.mobile_number}
                    onChange={(e) => setOrderForm({ ...orderForm, mobile_number: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Shipment Address 1 *</label>
                <input
                  type="text"
                  required
                  value={orderForm.shipment_address_1}
                  onChange={(e) => setOrderForm({ ...orderForm, shipment_address_1: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  placeholder="Street address, building, suite..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Shipment Address 2</label>
                <input
                  type="text"
                  value={orderForm.shipment_address_2}
                  onChange={(e) => setOrderForm({ ...orderForm, shipment_address_2: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  placeholder="City, State, Zipcode..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Image URL</label>
                <input
                  type="text"
                  value={orderForm.product_image}
                  onChange={(e) => setOrderForm({ ...orderForm, product_image: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  placeholder="https://example.com/product.jpg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  Create Order & Check Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Make a Purchase Modal */}
      {showPurchaseModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-amber-600" />
              Make a Procurement Purchase
            </h2>
            <p className="text-xs text-slate-500">
              Create supplier purchase order for missing inventory stock
            </p>

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
                  placeholder="e.g. Supplier Vendor Account"
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

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
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
                  onClick={() => setShowEditModal(false)}
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

      {/* Shipment Modal */}
      {showShipmentModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-600" />
              Dispatch Shipment
            </h2>
            <p className="text-xs text-slate-500">
              Dispatching order for buyer <strong className="text-slate-900">{selectedOrder.buyer_name}</strong>
            </p>

            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Order ID *</label>
                <input
                  type="text"
                  required
                  value={shipmentForm.order_number}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, order_number: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Shipment Partner *</label>
                  <input
                    type="text"
                    required
                    value={shipmentForm.shipment_partner}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, shipment_partner: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    placeholder="e.g. FedEx Express, DHL, UPS"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tracking ID *</label>
                  <input
                    type="text"
                    required
                    value={shipmentForm.tracking_id}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, tracking_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={shipmentForm.product_name}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, product_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={shipmentForm.weight}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Shipment Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={shipmentForm.shipment_cost}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, shipment_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowShipmentModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  Dispatch Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
