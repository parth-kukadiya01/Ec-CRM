'use client';

import React, { useEffect, useState } from 'react';
import { shipmentsApi, ordersApi } from '@/lib/api';
import { Truck, CheckCircle2, Navigation, Clock, MapPin, PackageCheck, AlertCircle, Edit2, Trash2 } from 'lucide-react';

export default function ShipmentsPage() {
  const [activeTab, setActiveTab] = useState<'ready' | 'dispatched'>('ready');
  
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
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
      
      const allOrders = ordRes.data || [];
      const ready = allOrders.filter((ord: any) => ord.status === 'Ready for Shipment');
      setReadyOrders(ready);
      setShipments(shipRes.data || []);
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
      alert('Error creating shipment dispatch');
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

  // Delete Shipment
  const handleDeleteShipment = async (id: number) => {
    if (confirm('Are you sure you want to delete this shipment record?')) {
      try {
        await shipmentsApi.delete(id);
        loadAllData();
      } catch (err) {
        console.error(err);
        alert('Error deleting shipment');
      }
    }
  };

  // Open Edit Shipment Modal
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-purple-600" />
            Shipment Logistics & Tracking Department
          </h1>
          <p className="text-sm text-slate-500 mt-1">Receive orders approved by Purchase Department, assign courier carriers, generate tracking IDs, and monitor deliveries</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('ready')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'ready'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Orders Ready for Dispatch</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'ready' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {readyOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dispatched')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'dispatched'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Dispatched & In-Transit Shipments</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'dispatched' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {shipments.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Orders Ready for Dispatch */}
      {activeTab === 'ready' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading orders ready for shipment...</div>
          ) : readyOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              No pending orders waiting for dispatch right now
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Order Date</th>
                    <th className="py-3.5 px-4">Buyer & Mobile</th>
                    <th className="py-3.5 px-4">Destination Address</th>
                    <th className="py-3.5 px-4">Product Details</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {readyOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-blue-600">{ord.order_number}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{ord.order_date}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ord.buyer_name}</div>
                        <div className="text-xs text-slate-500">{ord.mobile_number}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium text-slate-800">{ord.shipment_address_1}</div>
                            {ord.shipment_address_2 && <div className="text-slate-500">{ord.shipment_address_2}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{ord.product_name} <span className="text-xs text-slate-500">(x{ord.qty})</span></div>
                        <div className="text-xs text-emerald-700 font-semibold">${((ord.product_price || 0) * (ord.qty || 1)).toFixed(2)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready for Shipment
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openDispatchModal(ord)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch Shipment</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Dispatched & In-Transit Shipments */}
      {activeTab === 'dispatched' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading shipment dispatches...</div>
          ) : shipments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No active shipments found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Carrier Partner</th>
                    <th className="py-3.5 px-4">Tracking ID</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">Weight (kg)</th>
                    <th className="py-3.5 px-4">Freight Cost ($)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {shipments.map((ship) => {
                    const isDelivered = ship.status === 'Delivered';
                    return (
                      <tr key={ship.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-blue-600 font-medium">#ORD-{ship.order_id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{ship.shipment_partner}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200 inline-block font-semibold">
                            {ship.tracking_id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{ship.product_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{ship.weight} kg</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-700">${ship.shipment_cost.toFixed(2)}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                              isDelivered
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {isDelivered ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Navigation className="w-3.5 h-3.5" />}
                            {ship.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {!isDelivered ? (
                            <button
                              onClick={() => handleMarkDelivered(ship.id)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
                            >
                              Mark Delivered
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-semibold">Delivered to Buyer</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(ship)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Shipment"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteShipment(ship.id)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Shipment"
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

      {/* Dispatch Shipment Modal */}
      {showDispatchModal && selectedOrder && (
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Freight Cost ($) *</label>
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
                  onClick={() => setShowDispatchModal(false)}
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

      {/* EDIT SHIPMENT MODAL */}
      {showEditModal && editingShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-purple-600" />
              Edit Shipment (#ORD-{editingShipment.order_id})
            </h2>

            <form onSubmit={handleUpdateShipment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Carrier Partner</label>
                <input
                  type="text"
                  required
                  value={editShipmentForm.shipment_partner}
                  onChange={(e) => setEditShipmentForm({ ...editShipmentForm, shipment_partner: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tracking ID</label>
                <input
                  type="text"
                  required
                  value={editShipmentForm.tracking_id}
                  onChange={(e) => setEditShipmentForm({ ...editShipmentForm, tracking_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editShipmentForm.weight}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Shipment Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editShipmentForm.shipment_cost}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, shipment_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={editShipmentForm.status}
                  onChange={(e) => setEditShipmentForm({ ...editShipmentForm, status: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600"
                >
                  <option value="In Transit">In Transit</option>
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-lg shadow-xs"
                >
                  Save Shipment Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
