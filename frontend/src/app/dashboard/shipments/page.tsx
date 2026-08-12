'use client';

import React, { useEffect, useState } from 'react';
import { shipmentsApi, ordersApi, authApi } from '@/lib/api';
import { Truck, CheckCircle2, Clock, MapPin, PackageCheck, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import ResizableTable from '@/components/ResizableTable';
import { hasPermission } from '@/lib/permissions';

export default function ShipmentsPage() {
  const [activeTab, setActiveTab] = useState<'ready' | 'dispatched'>('ready');
  
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dispatch Shipment Modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [shipmentForm, setShipmentForm] = useState({
    order_id: 0,
    order_number: '',
    shipment_partner: 'FedEx Express',
    tracking_id: '',
    product_name: '',
    weight: 1.5,
    shipment_cost: 25.0,
  });

  // Edit Shipment Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState<any>(null);
  const [editShipmentForm, setEditShipmentForm] = useState({
    shipment_partner: '',
    tracking_id: '',
    weight: 1.5,
    shipment_cost: 0,
    status: 'In Transit',
  });

  const loadAllData = async () => {
    try {
      setLoading(true);
      const ordRes = await ordersApi.list().catch(() => ({ data: [] }));
      const shipRes = await shipmentsApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      
      const allOrders = ordRes.data || [];
      const ready = allOrders.filter((ord: any) => 
        ord.status === 'Ready to Ship' || 
        ord.status === 'Ready for Shipment' || 
        ord.status === 'Ready for Dispatch'
      );
      setReadyOrders(ready);
      setShipments(shipRes.data || []);
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

  const openDispatchModal = (order: any) => {
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
    setShowDispatchModal(true);
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
      setShowDispatchModal(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error creating shipment');
    }
  };

  const handleMarkDelivered = async (id: number) => {
    try {
      await shipmentsApi.update(id, { status: 'Delivered' });
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error updating shipment status');
    }
  };

  const handleDeleteShipment = async (id: number) => {
    if (confirm('Delete this shipment?')) {
      try {
        await shipmentsApi.delete(id);
        loadAllData();
      } catch (err) {
        console.error(err);
        alert('Error deleting shipment');
      }
    }
  };

  const openEditModal = (shipment: any) => {
    setEditingShipment(shipment);
    setEditShipmentForm({
      shipment_partner: shipment.shipment_partner || '',
      tracking_id: shipment.tracking_id || '',
      weight: shipment.weight || 0,
      shipment_cost: shipment.shipment_cost || 0,
      status: shipment.status || 'In Transit',
    });
    setShowEditModal(true);
  };

  const handleUpdateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;
    try {
      await shipmentsApi.update(editingShipment.id, editShipmentForm);
      setShowEditModal(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error updating shipment');
    }
  };

  const isPartner = currentUser?.is_partner || currentUser?.role_name === 'Channel Partner';
  const roleName = currentUser?.role_name || (currentUser?.is_admin ? 'Super Admin' : 'Employee');
  const isAllowed = hasPermission(currentUser, 'shipments:read');
  const isShipmentManager = currentUser?.is_admin || currentUser?.role_name === 'Shipment Manager';
  const canManage = isShipmentManager && hasPermission(currentUser, 'shipments:write');

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

  const displayReadyOrders = isPartner
    ? readyOrders.filter(
        (ord) =>
          ord.account_id === currentUser?.account_id ||
          ord.account_name === currentUser?.account_name ||
          ord.account_id === currentUser?.id ||
          ord.account_name === currentUser?.full_name
      )
    : readyOrders;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            Shipment Logistics & Tracking
          </h1>
          <p className="text-xs text-surface-400 mt-0.5">Courier dispatch, tracking IDs, and delivery updates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 pb-3">
        <button
          onClick={() => setActiveTab('ready')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'ready'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Ready for Dispatch</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'ready' ? 'bg-blue-700 text-white' : 'bg-surface-100 text-surface-700'
          }`}>
            {displayReadyOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dispatched')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'dispatched'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Dispatched & In-Transit</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'dispatched' ? 'bg-blue-700 text-white' : 'bg-surface-100 text-surface-700'
          }`}>
            {shipments.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Orders Ready for Dispatch */}
      {activeTab === 'ready' && (
        <div className="card-premium overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-surface-400">Loading orders...</span>
            </div>
          ) : displayReadyOrders.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold text-surface-700">No orders waiting for dispatch</p>
            </div>
          ) : (
            <div className="table-container">
              <ResizableTable className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Buyer</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 font-bold">Total Price</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {displayReadyOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">{ord.order_number}</td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-medium whitespace-nowrap">{ord.order_date}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{ord.buyer_name}</div>
                        <div className="text-xs text-slate-500 font-medium">{ord.mobile_number}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 max-w-xs">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-800">{ord.shipment_address_1}</div>
                            {ord.shipment_address_2 && <div className="text-slate-500 font-medium">{ord.shipment_address_2}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {ord.product_name}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-800 text-xs">
                          {ord.qty}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700 whitespace-nowrap text-xs">
                        ₹{((ord.product_price || 0) * (ord.qty || 1)).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          Ready for Shipment
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {canManage ? (
                          <button
                            onClick={() => openDispatchModal(ord)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center gap-1 transition-all"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Dispatch</span>
                          </button>
                        ) : (
                          <span className="text-xs text-surface-400 font-medium italic">Pending Dispatch</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ResizableTable>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Dispatched & In-Transit Shipments */}
      {activeTab === 'dispatched' && (
        <div className="card-premium overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-surface-400">Loading shipments...</span>
            </div>
          ) : shipments.length === 0 ? (
            <div className="py-12 text-center">
              <Truck className="w-10 h-10 text-surface-300 mx-auto mb-2" />
              <p className="text-xs text-surface-400">No shipments found</p>
            </div>
          ) : (
            <div className="table-container">
              <ResizableTable className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-50 text-surface-500 text-[11px] font-semibold uppercase tracking-wider border-b border-surface-200">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Carrier</th>
                    <th className="py-3 px-4">Tracking ID</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Weight</th>
                    <th className="py-3 px-4">Cost (₹)</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {shipments.map((ship) => {
                    const isDelivered = ship.status === 'Delivered';
                    return (
                      <tr key={ship.id} className="table-row-hover">
                        <td className="py-3 px-4 font-mono text-xs text-blue-600 font-medium whitespace-nowrap">#ORD-{ship.order_id}</td>
                        <td className="py-3 px-4 font-semibold text-surface-900 whitespace-nowrap">{ship.shipment_partner}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80 inline-block font-semibold">
                            {ship.tracking_id}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-surface-700 whitespace-nowrap">{ship.product_name}</td>
                        <td className="py-3 px-4 text-surface-500 whitespace-nowrap">{ship.weight} kg</td>
                        <td className="py-3 px-4 font-semibold text-emerald-600 whitespace-nowrap">₹{ship.shipment_cost.toFixed(2)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-blue-50 text-blue-700 border border-blue-200/80'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isDelivered ? '#10b981' : '#2563eb' }} />
                            {ship.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {canManage && !isDelivered ? (
                            <button
                              onClick={() => handleMarkDelivered(ship.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center gap-1 transition-all"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Delivered</span>
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {canManage ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(ship)}
                                className="p-1.5 rounded-md text-surface-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteShipment(ship.id)}
                                className="p-1.5 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-surface-400 font-medium italic">View Only</span>
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
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && selectedOrder && (
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
                  onClick={() => setShowDispatchModal(false)}
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

      {/* Edit Shipment Modal */}
      {showEditModal && editingShipment && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-surface-200 w-full max-w-md rounded-xl shadow-modal overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Shipment
              </h2>
            </div>

            <form onSubmit={handleUpdateShipment} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Carrier</label>
                  <input
                    type="text"
                    required
                    value={editShipmentForm.shipment_partner}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, shipment_partner: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Tracking ID</label>
                  <input
                    type="text"
                    required
                    value={editShipmentForm.tracking_id}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, tracking_id: e.target.value })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 font-mono input-premium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editShipmentForm.weight}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editShipmentForm.shipment_cost}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, shipment_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={editShipmentForm.status}
                  onChange={(e) => setEditShipmentForm({ ...editShipmentForm, status: e.target.value })}
                  className="w-full bg-white rounded-lg py-2 px-3 text-sm text-surface-900 input-premium"
                >
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
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
    </div>
  );
}
