'use client';

import React, { useEffect, useState } from 'react';
import { shipmentsApi, ordersApi, authApi, purchasesApi, getImageUrl } from '@/lib/api';
import { Truck, CheckCircle2, Clock, MapPin, PackageCheck, Edit2, Trash2, ShieldAlert, Plus, Layers, Calendar, RotateCcw, ChevronLeft, ChevronRight, Search, X, Scale, Box, DollarSign, FileText, Barcode, Calculator, Check, ExternalLink, Phone, Building2 } from 'lucide-react';
import ResizableTable from '@/components/ResizableTable';
import { hasPermission, getAllowedCompanies } from '@/lib/permissions';

export default function ShipmentsPage() {
  const [activeTab, setActiveTab] = useState<'ready' | 'dispatched'>('ready');

  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [allOrdersList, setAllOrdersList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [shipmentForm, setShipmentForm] = useState({
    order_id: 0,
    order_number: '',
    shipment_partner: 'RBS Online',
    awb_number: '',
    forwarding_number: '',
    tracking_id: '',
    product_name: '',
    weight: 0.5,
    length: 10,
    width: 5,
    height: 8,
    domestic_cost: 0,
    international_cost: 0,
    dump_cost: 0,
    label_cost_usd: 0,
    exchange_rate: 99.0,
    label_cost_inr: 0,
    shipment_cost: 0,
  });

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination states for tabs
  const [currentPageReady, setCurrentPageReady] = useState<number>(1);
  const [currentPageDispatched, setCurrentPageDispatched] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [receivingOrderId, setReceivingOrderId] = useState<number | null>(null);

  const loadAllData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const ordRes = await ordersApi.list().catch(() => ({ data: [] }));
      const shipRes = await shipmentsApi.list().catch(() => ({ data: [] }));
      const purRes = await purchasesApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));

      const allOrders = ordRes.data || [];
      const shipList = shipRes.data || [];
      const purList = purRes.data || [];
      setPurchases(purList);
      setAllOrdersList(allOrders);

      const existingShipmentOrderIds = new Set(shipList.map((s: any) => s.order_id));
      const purOrderIds = new Set(purList.map((p: any) => String(p.order_id)));

      // Orders with any Purchase Price (INR ₹) done or completed purchase entry show in Shipments:
      const ready = allOrders.filter((ord: any) =>
        (
          purOrderIds.has(String(ord.id)) ||
          (ord.purchase_cost_inr !== null && ord.purchase_cost_inr !== undefined && Number(ord.purchase_cost_inr) > 0)
        ) &&
        ord.status !== 'Shipped' &&
        ord.status !== 'Delivered' &&
        ord.status !== 'Cancelled'
      );

      // Include all orders with status 'Shipped' or 'Delivered' so they appear in Dispatched Carrier Shipments
      const autoShippedOrders = allOrders
        .filter((o: any) => (o.status === 'Shipped' || o.status === 'Delivered') && !existingShipmentOrderIds.has(o.id))
        .map((o: any) => ({
          id: `ord-${o.id}`,
          order_id: o.id,
          order_number: o.order_number || `#ORD-${o.id}`,
          tracking_id: o.shipment_id || o.oi || `TRK-${o.id}`,
          shipment_partner: o.delivery_service,
          product_name: o.product_name,
          weight: 1.0,
          dimensions: '10 x 5 x 8 cm',
          shipment_cost: 0,
          status: o.status,
          created_at: o.order_process_date || o.order_date || o.created_at,
          shipment_date: o.order_process_date || o.order_date || o.created_at,
          arriving_date: o.arriving_date,
          buyer_name: o.buyer_name,
          company: o.company,
        }));

      setReadyOrders(ready);
      setShipments([...shipList, ...autoShippedOrders]);
      if (meRes?.data) setCurrentUser(meRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(true);
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPageReady(1);
    setCurrentPageDispatched(1);
  }, [startDate, endDate, searchQuery, pageSize]);

  // Helper for Date Range checking
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const d = dateStr.split('T')[0];
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  // Search filtering helper
  const matchesSearch = (item: any, fields: string[]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return fields.some(field => {
      const val = item[field];
      return val && String(val).toLowerCase().includes(q);
    });
  };

  // Allowed companies for current user
  const companyOptions = getAllowedCompanies(currentUser);
  const isAllowedCompany = (comp?: string) => {
    if (!comp) return true;
    if (currentUser?.is_admin || currentUser?.role_name === 'Super Admin' || currentUser?.role?.name === 'Super Admin') return true;
    const target = comp.trim().toLowerCase();
    return companyOptions.some(c => {
      const allowed = c.trim().toLowerCase();
      return target === allowed || target.includes(allowed) || allowed.includes(target);
    });
  };

  // Date and Search Filtered Datasets
  const dateFilteredReadyOrders = readyOrders
    .filter(o => isAllowedCompany(o.company))
    .filter(o => isDateInRange(o.order_process_date || o.order_date || o.created_at))
    .filter(o => {
      const pur = purchases.find((p: any) => p.order_id === o.id);
      return matchesSearch(
        {
          ...o,
          po_number: pur?.po_number || '',
          arriving_date: o.arriving_date || pur?.estimated_shipment_date || '',
          consignee_name: o.consignee_name || o.buyer_name || '',
          contact_number: o.mobile_number || '',
          zip_code: o.zip_code || '',
          city: o.city || '',
          state: o.state || '',
          country: o.country || '',
          address: `${o.shipment_address_1 || ''} ${o.shipment_address_2 || ''}`
        },
        ['order_number', 'po_number', 'arriving_date', 'shipping_date', 'last_delivery_date', 'shipment_id', 'oi', 'product_name', 'buyer_name', 'consignee_name', 'contact_number', 'city', 'state', 'zip_code', 'country', 'address', 'company', 'account_name', 'delivery_service']
      );
    });

  const dateFilteredShipments = shipments
    .filter(s => isAllowedCompany(s.company))
    .filter(s => isDateInRange(s.created_at || s.shipment_date))
    .filter(s => {
      const pur = purchases.find((p: any) => p.order_id === s.order_id);
      const matchingOrder = allOrdersList.find((o: any) => o.id === s.order_id);
      const arrDate = matchingOrder?.arriving_date || pur?.estimated_shipment_date || s.arriving_date || '';
      return matchesSearch(
        {
          ...s,
          po_number: pur?.po_number || '',
          arriving_date: arrDate,
          shipping_date: matchingOrder?.shipping_date || s.shipping_date || '',
          last_delivery_date: matchingOrder?.last_delivery_date || s.last_delivery_date || '',
          shipment_id: matchingOrder?.shipment_id || s.shipment_id || matchingOrder?.oi || '',
          consignee_name: matchingOrder?.consignee_name || matchingOrder?.buyer_name || s.consignee_name || s.buyer_name || '',
          contact_number: matchingOrder?.mobile_number || s.mobile_number || '',
          city: matchingOrder?.city || s.city || '',
          state: matchingOrder?.state || s.state || '',
          zip_code: matchingOrder?.zip_code || s.zip_code || '',
          country: matchingOrder?.country || s.country || '',
          address: `${matchingOrder?.shipment_address_1 || s.shipment_address_1 || ''} ${matchingOrder?.shipment_address_2 || s.shipment_address_2 || ''}`
        },
        ['order_number', 'po_number', 'arriving_date', 'shipping_date', 'last_delivery_date', 'shipment_id', 'tracking_id', 'awb_number', 'forwarding_number', 'shipment_partner', 'product_name', 'buyer_name', 'consignee_name', 'contact_number', 'city', 'state', 'zip_code', 'country', 'address', 'company', 'notes']
      );
    });

  // Paginated Datasets
  const paginatedReadyOrders = dateFilteredReadyOrders.slice((currentPageReady - 1) * pageSize, currentPageReady * pageSize);
  const paginatedShipments = dateFilteredShipments.slice((currentPageDispatched - 1) * pageSize, currentPageDispatched * pageSize);

  const openDispatchModal = (order: any) => {
    setSelectedOrder(order);
    const defaultAwb = order.shipment_id || order.oi || `AWB${Math.floor(1000000 + Math.random() * 9000000)}`;
    // Pre-fill forwarding_number from label tracking ID (extracted from label PDF)
    const forwardingNum = order.label_tracking_id || '';
    // Pre-fill label cost from order's label cost
    const labelCostUsd = order.label_free ? 0 : (order.label_cost_usd || 0);
    const exRate = 99.0;
    const labelCostInr = parseFloat((labelCostUsd * exRate).toFixed(2));
    setShipmentForm({
      order_id: order.id,
      order_number: order.order_number || `#ORD-${order.id}`,
      shipment_partner: 'RBS Online',
      awb_number: defaultAwb,
      forwarding_number: forwardingNum,
      tracking_id: defaultAwb,
      product_name: order.product_name || '',
      weight: 0.5,
      length: 10,
      width: 5,
      height: 8,
      domestic_cost: 0,
      international_cost: 0,
      dump_cost: 0,
      label_cost_usd: labelCostUsd,
      exchange_rate: exRate,
      label_cost_inr: labelCostInr,
      shipment_cost: 0,
    });
    setShowDispatchModal(true);
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const targetOrderId = shipmentForm.order_id || selectedOrder.id;
      const dCost = parseFloat(String(shipmentForm.domestic_cost)) || 0;
      const iCost = parseFloat(String(shipmentForm.international_cost)) || 0;
      const dumpUsd = parseFloat(String(shipmentForm.dump_cost)) || 0;
      const labelUsd = parseFloat(String(shipmentForm.label_cost_usd)) || 0;
      const exRate = parseFloat(String(shipmentForm.exchange_rate)) || 99.0;
      const dumpInr = parseFloat((dumpUsd * exRate).toFixed(2));
      const labelInr = parseFloat((labelUsd * exRate).toFixed(2));

      const sCost = shipmentForm.shipment_partner === 'RBS Online'
        ? parseFloat((dCost + iCost + dumpInr + labelInr).toFixed(2))
        : (parseFloat(String(shipmentForm.shipment_cost)) || 0);

      const len = parseFloat(String(shipmentForm.length)) || 0;
      const wid = parseFloat(String(shipmentForm.width)) || 0;
      const hgt = parseFloat(String(shipmentForm.height)) || 0;
      const volWt = parseFloat((((len * wid * hgt) / 5000) || 0).toFixed(3));
      const dimStr = `${len} × ${wid} × ${hgt} cm`;
      const awbVal = shipmentForm.awb_number || shipmentForm.tracking_id || `AWB-${targetOrderId}`;

      await shipmentsApi.create({
        order_id: targetOrderId,
        shipment_partner: shipmentForm.shipment_partner,
        tracking_id: awbVal,
        awb_number: awbVal,
        forwarding_number: shipmentForm.forwarding_number || null,
        product_name: shipmentForm.product_name || selectedOrder.product_name,
        weight: parseFloat(String(shipmentForm.weight)) || 0,
        dimensions: dimStr,
        length: len,
        width: wid,
        height: hgt,
        volumetric_weight: volWt,
        domestic_cost: dCost,
        international_cost: iCost,
        dump_cost: dumpUsd,
        label_cost_usd: labelUsd,
        exchange_rate: exRate,
        label_cost_inr: labelInr,
        shipment_cost: sCost,
      });

      // Automatically update order status to 'Shipped'
      await ordersApi.update(targetOrderId, {
        status: 'Shipped',
        delivery_service: shipmentForm.shipment_partner,
        shipment_id: awbVal,
        shipment_cost: sCost
      });

      setShowDispatchModal(false);
      setActiveTab('dispatched');
      loadAllData(false);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Error creating shipment';
      alert(msg);
    }
  };

  const handleOrderStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await ordersApi.update(orderId, { status: newStatus });
      const matchingPur = purchases.find((p: any) => p.order_id === orderId);
      if (matchingPur && (newStatus === 'Ready to Ship' || newStatus === 'Ready for Shipment' || newStatus === 'In Stock')) {
        await purchasesApi.update(matchingPur.id, { status: 'Received' });
      }
      loadAllData(false);
    } catch (err) {
      console.error(err);
      alert('Error updating order status');
    }
  };

  const handleQuickReceive = async (ord: any) => {
    try {
      setReceivingOrderId(ord.id);
      // 1. Instant optimistic state update — zero flicker, zero page reload!
      setPurchases(prev =>
        prev.map(p => p.order_id === ord.id ? { ...p, status: 'Received' } : p)
      );
      setReadyOrders(prev =>
        prev.map(o => o.id === ord.id ? { ...o, status: 'Ready to Ship' } : o)
      );
      setAllOrdersList(prev =>
        prev.map(o => o.id === ord.id ? { ...o, status: 'Ready to Ship' } : o)
      );

      // 2. Perform backend API updates
      const pur = purchases.find((p: any) => p.order_id === ord.id);
      if (pur?.id) {
        await purchasesApi.update(pur.id, { status: 'Received' });
      }
      await ordersApi.update(ord.id, { status: 'Ready to Ship' });

      // 3. Silent background refresh (showSpinner = false)
      await loadAllData(false);
    } catch (err) {
      console.error(err);
      alert('Error marking purchase as received');
      loadAllData(false);
    } finally {
      setReceivingOrderId(null);
    }
  };

  const openEditShipmentModal = (ship: any) => {
    setEditingShipment(ship);
    let l = ship.length || 0;
    let w = ship.width || 0;
    let h = ship.height || 0;
    if (!l && !w && !h && ship.dimensions) {
      const parts = String(ship.dimensions).replace(/cm/gi, '').split(/[x×]/);
      if (parts.length >= 3) {
        l = parseFloat(parts[0]) || 0;
        w = parseFloat(parts[1]) || 0;
        h = parseFloat(parts[2]) || 0;
      }
    }

    setShipmentForm({
      order_id: ship.order_id,
      order_number: ship.tracking_id,
      shipment_partner: ship.shipment_partner || 'RBS Online',
      awb_number: ship.awb_number || ship.tracking_id || '',
      forwarding_number: ship.forwarding_number || '',
      tracking_id: ship.tracking_id || '',
      product_name: ship.product_name || '',
      weight: ship.weight || 0.5,
      length: l || 10,
      width: w || 5,
      height: h || 8,
      domestic_cost: ship.domestic_cost || 0,
      international_cost: ship.international_cost || 0,
      dump_cost: ship.dump_cost || 0,
      label_cost_usd: ship.label_cost_usd || 0,
      exchange_rate: ship.exchange_rate || 99.0,
      label_cost_inr: ship.label_cost_inr || 0,
      shipment_cost: ship.shipment_cost || 0,
    });
  };

  const handleUpdateShipmentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;
    try {
      const dCost = parseFloat(String(shipmentForm.domestic_cost)) || 0;
      const iCost = parseFloat(String(shipmentForm.international_cost)) || 0;
      const dumpUsd = parseFloat(String(shipmentForm.dump_cost)) || 0;
      const labelUsd = parseFloat(String(shipmentForm.label_cost_usd)) || 0;
      const exRate = parseFloat(String(shipmentForm.exchange_rate)) || 99.0;
      const dumpInr = parseFloat((dumpUsd * exRate).toFixed(2));
      const labelInr = parseFloat((labelUsd * exRate).toFixed(2));

      const sCost = shipmentForm.shipment_partner === 'RBS Online'
        ? parseFloat((dCost + iCost + dumpInr + labelInr).toFixed(2))
        : (parseFloat(String(shipmentForm.shipment_cost)) || 0);

      const len = parseFloat(String(shipmentForm.length)) || 0;
      const wid = parseFloat(String(shipmentForm.width)) || 0;
      const hgt = parseFloat(String(shipmentForm.height)) || 0;
      const volWt = parseFloat((((len * wid * hgt) / 5000) || 0).toFixed(3));
      const dimStr = `${len} × ${wid} × ${hgt} cm`;
      const awbVal = shipmentForm.awb_number || shipmentForm.tracking_id;

      await shipmentsApi.update(editingShipment.id, {
        shipment_partner: shipmentForm.shipment_partner,
        tracking_id: awbVal,
        awb_number: awbVal,
        forwarding_number: shipmentForm.forwarding_number || null,
        weight: parseFloat(String(shipmentForm.weight)) || 0,
        dimensions: dimStr,
        length: len,
        width: wid,
        height: hgt,
        volumetric_weight: volWt,
        domestic_cost: dCost,
        international_cost: iCost,
        dump_cost: dumpUsd,
        label_cost_usd: labelUsd,
        exchange_rate: exRate,
        label_cost_inr: labelInr,
        shipment_cost: sCost,
      });
      setEditingShipment(null);
      loadAllData(false);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Error updating shipment details';
      alert(msg);
    }
  };

  const handleUpdateStatus = async (id: any, newStatus: string) => {
    try {
      if (typeof id === 'string' && id.startsWith('ord-')) {
        const orderId = parseInt(id.replace('ord-', ''));
        await ordersApi.update(orderId, { status: newStatus });
      } else {
        await shipmentsApi.update(Number(id), { status: newStatus });
      }
      loadAllData(false);
    } catch (err) {
      console.error(err);
      alert('Error updating shipment status');
    }
  };

  const handleDeleteShipment = async (id: any) => {
    if (confirm('Delete shipment tracking record?')) {
      try {
        if (typeof id === 'string' && id.startsWith('ord-')) {
          const orderId = parseInt(id.replace('ord-', ''));
          await ordersApi.update(orderId, { status: 'Ready to Ship' });
        } else {
          await shipmentsApi.delete(Number(id));
        }
        loadAllData(false);
      } catch (err) {
        console.error(err);
        alert('Error deleting shipment');
      }
    }
  };

  const isAllowed = hasPermission(currentUser, 'shipments:read');
  const canWrite = hasPermission(currentUser, 'shipments:write');

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center bg-white border border-[#c3c4c7] p-8 max-w-lg mx-auto mt-10 rounded-xs shadow-xs">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1d2327]">Access Restricted</h2>
        <p className="text-xs text-[#50575e] mt-1">
          Your role is restricted from viewing Shipments records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-[#2c3338]">

      {/* WP Admin Header Toolbar */}
      <div className="bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1d2327] tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#2271b1] inline-block rounded-xs" />
            Shipments & Logistics Dispatches
          </h1>
          <p className="text-xs text-[#50575e] mt-1">Carrier Dispatches & Tracking ID Management</p>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              if (readyOrders.length > 0) {
                openDispatchModal(readyOrders[0]);
              } else {
                alert('No ready orders available for dispatch');
              }
            }}
            className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Carrier Dispatch</span>
          </button>
        )}
      </div>

      {/* Date Range & Search Filter Controls */}
      <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search Input Bar */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-[#50575e] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order #, tracking ID, carrier, product, buyer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#8c8f94] text-xs font-semibold pl-9 pr-8 py-1.5 rounded-xs focus:border-[#2271b1] outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-[#50575e] hover:text-[#1d2327]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#2271b1]" />
            <span className="font-semibold text-[#50575e]">Start:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs text-xs outline-none focus:border-[#2271b1]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#50575e]">End:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs text-xs outline-none focus:border-[#2271b1]"
            />
          </div>
          {(startDate || endDate || searchQuery) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#d63638] font-bold border border-[#c3c4c7] rounded-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* WP Admin Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#c3c4c7] pb-2">
        <button
          onClick={() => setActiveTab('ready')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xs transition-all ${activeTab === 'ready'
            ? 'bg-[#2271b1] text-white shadow-xs'
            : 'bg-[#f6f7f7] text-[#2c3338] border border-[#c3c4c7] hover:bg-[#f0f0f1]'
            }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Orders Ready to Ship</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'ready' ? 'bg-white text-[#2271b1]' : 'bg-[#e0e0e0] text-[#1d2327]'}`}>
            {dateFilteredReadyOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dispatched')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xs transition-all ${activeTab === 'dispatched'
            ? 'bg-[#2271b1] text-white shadow-xs'
            : 'bg-[#f6f7f7] text-[#2c3338] border border-[#c3c4c7] hover:bg-[#f0f0f1]'
            }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Dispatched Carrier Shipments</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'dispatched' ? 'bg-white text-[#2271b1]' : 'bg-[#e0e0e0] text-[#1d2327]'}`}>
            {dateFilteredShipments.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Orders Ready for Shipment */}
      {activeTab === 'ready' && (
        <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-[#50575e]">Loading ready orders...</span>
            </div>
          ) : dateFilteredReadyOrders.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-[#1d2327]">No pending dispatches found for this filter.</p>
            </div>
          ) : (
            <>
              <div className="table-container overflow-x-auto">
                <ResizableTable className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f0f0f1] text-[#1d2327] font-bold border-b border-[#c3c4c7] whitespace-nowrap">
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Process Date</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipping Date</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Last Delivery Date</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Arrive Date</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Order ID</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">PO</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipment No</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Company</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Partner / Seller</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[200px]">Product Name</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Qty</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Consignee Name</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[160px]">Address Line 1</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[140px]">Address Line 2</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">City</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">State</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Zip Code</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Contact Number</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Country</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dcdcde]">
                    {paginatedReadyOrders.map((ord, idx) => {
                      const pur = purchases.find((p: any) => p.order_id === ord.id);
                      const isInStock =
                        (ord.order_status || '').toLowerCase() === 'in stock' ||
                        ord.status === 'In Stock' ||
                        Boolean(pur && (pur.notes?.includes('In-Stock') || pur.purchase_partner_name === 'In Stock' || pur.bank === 'In Stock'));

                      const isPurchaseReceived = Boolean(
                        pur && (pur.status === 'Received' || pur.status === 'Completed')
                      );

                      const isPurchasePending =
                        !isInStock &&
                        !isPurchaseReceived &&
                        (ord.status === 'Purchase Pending' || ord.status === 'Pending' || (pur && pur.status !== 'Received'));

                      return (
                        <tr key={ord.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f6f7f7]'} hover:bg-[#e8f3fc] transition-colors whitespace-nowrap`}>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#50575e]">{ord.order_process_date || ord.order_date || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">{ord.shipping_date || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">{ord.last_delivery_date || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">{ord.arriving_date || pur?.estimated_shipment_date || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-bold text-[#2271b1]">{ord.order_number}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[11px] font-bold text-[#1d2327]">{pur?.po_number || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-semibold text-[#2271b1]">{ord.shipment_id || ord.oi || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">{ord.company || 'ADBH'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#2271b1]">{ord.seller_account || ord.account_name || pur?.purchase_partner_name || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-semibold max-w-xs truncate" title={ord.product_name}>
                            <div className="flex items-center gap-2">
                              {ord.product_image && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={getImageUrl(ord.product_image)}
                                  alt=""
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                  className="w-7 h-7 rounded-xs object-cover border border-[#c3c4c7] shrink-0"
                                />
                              )}
                              {ord.product_url ? (
                                <a
                                  href={ord.product_url.startsWith('http') ? ord.product_url : `https://${ord.product_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#2271b1] hover:underline inline-flex items-center gap-1 max-w-[200px] truncate font-bold"
                                >
                                  <span className="truncate">{ord.product_name}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0 text-[#2271b1]" />
                                </a>
                              ) : (
                                <span>{ord.product_name}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center font-bold text-[#1d2327]">{ord.qty || 1}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">{ord.consignee_name || ord.buyer_name || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#50575e] max-w-[160px] truncate" title={ord.shipment_address_1}>{ord.shipment_address_1 || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#50575e] max-w-[140px] truncate" title={ord.shipment_address_2}>{ord.shipment_address_2 || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#1d2327] font-medium">{ord.city || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#1d2327] font-medium">{ord.state || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#1d2327]">{ord.zip_code || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#1d2327]">
                            {ord.mobile_number ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-[#2271b1]" />
                                <span>{ord.mobile_number}</span>
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">{ord.country || 'USA'}</td>

                          {/* STATUS Column */}
                          <td className="py-2 px-3 border-r border-[#e0e0e0] text-center">
                            {isInStock ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] uppercase rounded-xs inline-flex items-center gap-1.5 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span>In Stock</span>
                              </span>
                            ) : isPurchasePending ? (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] uppercase rounded-xs inline-flex items-center gap-1.5 shadow-2xs">
                                <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                                <span>Purchase Pending</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[10px] uppercase rounded-xs inline-flex items-center gap-1.5 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-blue-700" />
                                <span>Purchase Received</span>
                              </span>
                            )}
                          </td>

                          {/* ACTIONS Column */}
                          <td className="py-2 px-3 text-right">
                            {ord.status === 'Shipped' || ord.status === 'Delivered' ? (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px] rounded-xs">
                                ✓ Dispatched
                              </span>
                            ) : isPurchasePending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleQuickReceive(ord)}
                                  disabled={receivingOrderId === ord.id}
                                  className="px-2.5 py-1 bg-[#00a32a] hover:bg-[#008a20] text-white font-bold text-[11px] rounded-xs flex items-center gap-1 transition-all shadow-xs disabled:opacity-50"
                                  title="Mark Purchase as Received to enable Dispatch"
                                >
                                  {receivingOrderId === ord.id ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <PackageCheck className="w-3 h-3" />
                                  )}
                                  <span>{receivingOrderId === ord.id ? 'Receiving...' : 'Mark Received'}</span>
                                </button>
                                <button
                                  disabled
                                  className="px-2.5 py-1 bg-slate-200 text-slate-400 font-bold text-[11px] rounded-xs cursor-not-allowed border border-slate-300 flex items-center gap-1"
                                  title="Cannot dispatch: Purchase not received yet"
                                >
                                  <Truck className="w-3 h-3 opacity-40" />
                                  <span>Dispatch</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openDispatchModal(ord)}
                                className="px-3 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-[11px] rounded-xs shadow-xs flex items-center gap-1 ml-auto transition-all"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Dispatch Carrier</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </ResizableTable>
              </div>

              {/* Pagination Controls */}
              <div className="p-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#50575e]">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-[#1d2327]">{dateFilteredReadyOrders.length} entries</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#50575e]">Show:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 bg-white border border-[#c3c4c7] rounded-xs text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPageReady(prev => Math.max(prev - 1, 1))}
                      disabled={currentPageReady === 1}
                      className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs font-bold text-[#2c3338] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f0f1] transition-all flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="px-2.5 py-1 font-bold text-[#1d2327]">
                      Page {currentPageReady} of {Math.max(1, Math.ceil(dateFilteredReadyOrders.length / pageSize))}
                    </span>
                    <button
                      onClick={() => setCurrentPageReady(prev => Math.min(prev + 1, Math.max(1, Math.ceil(dateFilteredReadyOrders.length / pageSize))))}
                      disabled={currentPageReady >= Math.max(1, Math.ceil(dateFilteredReadyOrders.length / pageSize))}
                      className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs font-bold text-[#2c3338] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f0f1] transition-all flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: Dispatched Carrier Shipments Table */}
      {activeTab === 'dispatched' && (
        <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-[#50575e]">Loading shipments dataset...</span>
            </div>
          ) : dateFilteredShipments.length === 0 ? (
            <div className="py-12 text-center">
              <Truck className="w-8 h-8 text-[#a7aaad] mx-auto mb-2" />
              <p className="text-xs text-[#50575e]">No active shipments tracked for this filter.</p>
            </div>
          ) : (
            <>
              <div className="table-container overflow-x-auto">
                <ResizableTable className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f0f0f1] text-[#1d2327] font-bold border-b border-[#c3c4c7] whitespace-nowrap">
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Carrier Partner</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">AWB / Tracking</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Forwarding #</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipping Date</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Last Delivery Date</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Arrive Date</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Order ID</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">PO</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipment No</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[200px]">Product Name</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Qty</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Consignee Name</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[160px]">Address Line 1</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[140px]">Address Line 2</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">City</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">State</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Zip Code</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Contact Number</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Country</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Weight (kg / oz)</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Dimensions (cm)</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Vol. Wt (kg)</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Cost Breakdown</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Total Cost (₹)</th>
                      <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dcdcde]">
                    {paginatedShipments.map((ship, idx) => {
                      const pur = purchases.find((p: any) => p.order_id === ship.order_id);
                      const matchingOrder = allOrdersList.find((o: any) => o.id === ship.order_id);
                      const arriveDate = matchingOrder?.arriving_date || pur?.estimated_shipment_date || ship.arriving_date || '—';
                      const shippingDate = matchingOrder?.shipping_date || ship.shipping_date || '—';
                      const lastDeliveryDate = matchingOrder?.last_delivery_date || ship.last_delivery_date || '—';
                      const orderId = matchingOrder?.order_number || ship.order_number || (ship.order_id ? `#ORD-${ship.order_id}` : '—');
                      const shipmentId = matchingOrder?.shipment_id || ship.shipment_id || matchingOrder?.oi || '—';
                      const qty = matchingOrder?.qty || ship.qty || 1;
                      const consignee = matchingOrder?.consignee_name || matchingOrder?.buyer_name || ship.consignee_name || ship.buyer_name || '—';
                      const addr1 = matchingOrder?.shipment_address_1 || ship.shipment_address_1 || '—';
                      const addr2 = matchingOrder?.shipment_address_2 || ship.shipment_address_2 || '—';
                      const city = matchingOrder?.city || ship.city || '—';
                      const state = matchingOrder?.state || ship.state || '—';
                      const zipCode = matchingOrder?.zip_code || ship.zip_code || '—';
                      const mobile = matchingOrder?.mobile_number || ship.mobile_number || '—';
                      const country = matchingOrder?.country || ship.country || 'USA';
                      const shipOz = ((ship.weight || 0) * 35.274).toFixed(2);
                      const isRbs = (ship.shipment_partner || '').toLowerCase().includes('rbs');
                      const volWtVal = ship.volumetric_weight || (ship.length && ship.width && ship.height ? ((ship.length * ship.width * ship.height) / 5000).toFixed(2) : '—');

                      return (
                        <tr key={ship.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f6f7f7]'} hover:bg-[#e8f3fc] transition-colors whitespace-nowrap`}>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">
                            <span className={`px-2 py-0.5 rounded-xs border font-bold text-[10px] ${isRbs ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-orange-100 text-orange-900 border-orange-300'}`}>
                              {ship.shipment_partner}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-bold text-[#2271b1]">
                            {ship.awb_number || ship.tracking_id}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#50575e] font-semibold">
                            {ship.forwarding_number || '—'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">
                            {shippingDate}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">
                            {lastDeliveryDate}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">
                            {arriveDate}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-bold text-[#2271b1]">
                            {orderId}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[11px] font-bold text-[#1d2327]">
                            {pur?.po_number || '—'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-semibold text-[#2271b1]">
                            {shipmentId}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-semibold max-w-xs truncate" title={ship.product_name}>
                            <div className="flex items-center gap-2">
                              {(ship.product_image || matchingOrder?.product_image) && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={getImageUrl(ship.product_image || matchingOrder?.product_image)}
                                  alt=""
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                  className="w-7 h-7 rounded-xs object-cover border border-[#c3c4c7] shrink-0"
                                />
                              )}
                              <span>{ship.product_name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center font-bold text-[#1d2327]">
                            {qty}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">
                            {consignee}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#50575e] max-w-[160px] truncate" title={addr1}>
                            {addr1}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#50575e] max-w-[140px] truncate" title={addr2}>
                            {addr2}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#1d2327] font-medium">
                            {city}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#1d2327] font-medium">
                            {state}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#1d2327]">
                            {zipCode}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#1d2327]">
                            {mobile !== '—' ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-[#2271b1]" />
                                <span>{mobile}</span>
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">
                            {country}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono">
                            <span className="font-bold text-[#1d2327]">{ship.weight} kg</span>
                            <span className="text-[10px] text-blue-700 font-semibold block">({shipOz} oz)</span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#50575e]">
                            {ship.dimensions || (ship.length && ship.width && ship.height ? `${ship.length} × ${ship.width} × ${ship.height} cm` : '—')}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#2271b1] font-semibold">
                            {volWtVal !== '—' ? `${volWtVal} kg` : '—'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[10px]">
                            {isRbs ? (
                              <div className="flex flex-col gap-0.5 font-mono">
                                <span>Dom: <b>₹{(ship.domestic_cost || 0).toFixed(2)}</b></span>
                                <span>Intl: <b>₹{(ship.international_cost || 0).toFixed(2)}</b></span>
                                {ship.dump_cost > 0 && (
                                  <span className="text-emerald-800 font-semibold">
                                    Dump: ${ship.dump_cost.toFixed(2)} <span className="text-slate-600 font-normal">(₹{(ship.dump_cost * (ship.exchange_rate || 99.0)).toFixed(2)})</span>
                                  </span>
                                )}
                                {ship.label_cost_usd > 0 && (
                                  <span className="text-emerald-800 font-semibold">
                                    Label: ${ship.label_cost_usd.toFixed(2)} <span className="text-slate-600 font-normal">(₹{(ship.label_cost_inr || (ship.label_cost_usd * (ship.exchange_rate || 99.0))).toFixed(2)})</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span>Shipping: <b>₹{(ship.shipment_cost || 0).toFixed(2)}</b></span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-emerald-700">
                            ₹{(ship.shipment_cost || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2 border-r border-[#e0e0e0] text-center">
                            <select
                              value={ship.status || 'In Transit'}
                              onChange={(e) => handleUpdateStatus(ship.id, e.target.value)}
                              className={`px-2 py-1 font-bold text-[10px] uppercase rounded-xs border outline-none cursor-pointer transition-all ${ship.status === 'Delivered'
                                ? 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200'
                                : ship.status === 'Shipped'
                                  ? 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                                }`}
                            >
                              <option value="In Transit" className="bg-white text-blue-900 font-bold">In Transit</option>
                              <option value="Ready for Shipment" className="bg-white text-emerald-900 font-bold">Ready for Shipment</option>
                              <option value="Shipped" className="bg-white text-blue-900 font-bold">Shipped</option>
                              <option value="Delivered" className="bg-white text-purple-900 font-bold">Delivered</option>
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {ship.status !== 'Delivered' && (
                                <button
                                  onClick={() => handleUpdateStatus(ship.id, 'Delivered')}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xs shadow-xs"
                                >
                                  Mark Delivered
                                </button>
                              )}
                              <button
                                onClick={() => openEditShipmentModal(ship)}
                                className="p-1 text-[#2271b1] hover:bg-[#f0f0f1] rounded-xs"
                                title="Edit Shipment Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteShipment(ship.id)}
                                className="p-1 text-red-600 hover:bg-[#f0f0f1] rounded-xs"
                                title="Delete Shipment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </ResizableTable>
              </div>

              {/* Pagination Controls */}
              <div className="p-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#50575e]">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-[#1d2327]">{dateFilteredShipments.length} entries</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#50575e]">Show:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 bg-white border border-[#c3c4c7] rounded-xs text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPageDispatched(prev => Math.max(prev - 1, 1))}
                      disabled={currentPageDispatched === 1}
                      className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs font-bold text-[#2c3338] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f0f1] transition-all flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="px-2.5 py-1 font-bold text-[#1d2327]">
                      Page {currentPageDispatched} of {Math.max(1, Math.ceil(dateFilteredShipments.length / pageSize))}
                    </span>
                    <button
                      onClick={() => setCurrentPageDispatched(prev => Math.min(prev + 1, Math.max(1, Math.ceil(dateFilteredShipments.length / pageSize))))}
                      disabled={currentPageDispatched >= Math.max(1, Math.ceil(dateFilteredShipments.length / pageSize))}
                      className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs font-bold text-[#2c3338] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f0f1] transition-all flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* WP Meta-Box Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl rounded-sm font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#1d2327] text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-[#2c3338]">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#72aee6]" />
                <span>
                  Dispatch Carrier Shipment (Order #{selectedOrder?.order_number}
                  {purchases.find((p: any) => p.order_id === selectedOrder?.id)?.po_number
                    ? ` | PO${purchases.find((p: any) => p.order_id === selectedOrder?.id)?.po_number}`
                    : ''})
                </span>
              </h3>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-white font-bold text-lg leading-none">×</button>
            </div>

            <form onSubmit={handleCreateShipment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Row 1: Carrier Partner & AWB Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-[#2271b1]" />
                      <span>Carrier Partner *</span>
                    </label>
                    <select
                      value={shipmentForm.shipment_partner}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, shipment_partner: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                    >
                      <option value="RBS Online">RBS Online</option>
                      <option value="Shiprocket">Shiprocket</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-[#2271b1]" />
                      <span>AWB Number *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AWB9842109"
                      value={shipmentForm.awb_number}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, awb_number: e.target.value, tracking_id: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#2271b1] outline-none focus:border-[#2271b1] rounded-xs"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Forwarding Number & (Shipping Cost if Shiprocket OR Label PDF if RBS Online) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#2271b1]" />
                      <span>Forwarding Number</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FWD-8849201"
                      value={shipmentForm.forwarding_number}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, forwarding_number: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                    />
                  </div>

                  {shipmentForm.shipment_partner === 'Shiprocket' ? (
                    <div>
                      <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Shipping Cost (INR ₹) *</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 350.00"
                        value={shipmentForm.shipment_cost === 0 ? '' : shipmentForm.shipment_cost}
                        onChange={(e) => setShipmentForm({ ...shipmentForm, shipment_cost: e.target.value === '' ? 0 : (e.target.value as any) })}
                        className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-emerald-800 outline-none focus:border-[#2271b1] rounded-xs"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Label PDF</span>
                      </label>
                      {selectedOrder?.label_pdf_url ? (
                        <a
                          href={`/backend-api/orders/${selectedOrder.id}/download-label?download=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={`${selectedOrder.label_tracking_id || selectedOrder.order_number || 'label'} - ${selectedOrder.product_name}.pdf`}
                          className="w-full h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xs transition-colors shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Download Label PDF</span>
                        </a>
                      ) : (
                        <div className="w-full h-[38px] flex items-center justify-center bg-[#f0f0f1] text-[#50575e] font-semibold text-[11px] rounded-xs border border-[#c3c4c7]">
                          No Label PDF Uploaded
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* If Shiprocket and has label PDF, show below */}
                {shipmentForm.shipment_partner === 'Shiprocket' && selectedOrder?.label_pdf_url && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xs border bg-indigo-50 border-indigo-200">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-700 shrink-0">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>Label PDF:</span>
                    </div>
                    <a
                      href={`/backend-api/orders/${selectedOrder.id}/download-label?download=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`${selectedOrder.label_tracking_id || selectedOrder.order_number || 'label'} - ${selectedOrder.product_name}.pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xs transition-colors shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Download Label PDF
                    </a>
                  </div>
                )}

                {/* RBS Online Specific Costs: Domestic (₹), International (₹) + Dump ($ -> ₹) + Label ($ -> ₹) */}
                {shipmentForm.shipment_partner === 'RBS Online' && (() => {
                  const domInr = parseFloat(String(shipmentForm.domestic_cost)) || 0;
                  const intlInr = parseFloat(String(shipmentForm.international_cost)) || 0;
                  const dumpUsd = parseFloat(String(shipmentForm.dump_cost)) || 0;
                  const labelUsd = parseFloat(String(shipmentForm.label_cost_usd)) || 0;
                  const rate = parseFloat(String(shipmentForm.exchange_rate)) || 99.0;
                  const dumpInr = dumpUsd * rate;
                  const labelInr = labelUsd * rate;
                  const totalInr = domInr + intlInr + dumpInr + labelInr;

                  return (
                    <div className="p-3.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-xs space-y-3">
                      <div className="font-bold text-[#1d2327] flex flex-wrap items-center justify-between text-xs pb-2 border-b border-[#dcdcde] gap-2">
                        <span className="flex items-center gap-1.5 text-emerald-800">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span>RBS Online Cost Breakdown</span>
                        </span>
                        <span className="text-xs text-emerald-800 font-extrabold bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xs font-mono">
                          Total: ₹{totalInr.toFixed(2)} INR
                        </span>
                      </div>

                      {/* Domestic & International costs (in INR ₹) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-[#1d2327] mb-1 text-[11px]">
                            Domestic Cost (INR ₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              value={shipmentForm.domestic_cost === 0 ? '' : shipmentForm.domestic_cost}
                              onChange={(e) => setShipmentForm({ ...shipmentForm, domestic_cost: e.target.value === '' ? 0 : (e.target.value as any) })}
                              className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1.5 font-bold font-mono text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-[#1d2327] mb-1 text-[11px]">
                            International Cost (INR ₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              value={shipmentForm.international_cost === 0 ? '' : shipmentForm.international_cost}
                              onChange={(e) => setShipmentForm({ ...shipmentForm, international_cost: e.target.value === '' ? 0 : (e.target.value as any) })}
                              className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1.5 font-bold font-mono text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* USD Components: Dump Cost ($), Label Cost ($) & Exchange Rate (₹) */}
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xs space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-[#1d2327] mb-1 text-[11px] flex items-center justify-between">
                              <span>Dump Cost ($ USD)</span>
                              <span className="text-[10px] font-bold text-emerald-800 font-mono">
                                = ₹{dumpInr.toFixed(2)} INR
                              </span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">$</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={shipmentForm.dump_cost === 0 ? '' : shipmentForm.dump_cost}
                                onChange={(e) => setShipmentForm({ ...shipmentForm, dump_cost: e.target.value === '' ? 0 : (e.target.value as any) })}
                                className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1.5 font-bold font-mono text-emerald-900 outline-none focus:border-[#2271b1] rounded-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-[#1d2327] mb-1 text-[11px] flex items-center justify-between">
                              <span>Label Cost ($ USD)</span>
                              <span className="text-[10px] font-bold text-emerald-800 font-mono">
                                = ₹{labelInr.toFixed(2)} INR
                              </span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">$</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={shipmentForm.label_cost_usd === 0 ? '' : shipmentForm.label_cost_usd}
                                onChange={(e) => setShipmentForm({ ...shipmentForm, label_cost_usd: e.target.value === '' ? 0 : (e.target.value as any) })}
                                className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1.5 font-bold font-mono text-emerald-900 outline-none focus:border-[#2271b1] rounded-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* USD to INR Exchange Rate */}
                        <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
                          <label className="block font-bold text-[#1d2327] text-[11px]">
                            <span>USD to INR Rate: </span>
                            <span className="text-[10px] text-slate-500 font-normal">(Default: ₹99.0 / $1 USD)</span>
                          </label>
                          <div className="relative w-36">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="99.0"
                              value={shipmentForm.exchange_rate}
                              onChange={(e) => setShipmentForm({ ...shipmentForm, exchange_rate: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) })}
                              className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1 font-mono font-bold text-xs text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Package Specifications: Weight & Dimensions */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xs space-y-3">
                  <div className="font-bold text-[#1d2327] text-xs flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-blue-200/60">
                    <span className="flex items-center gap-1.5 text-blue-900">
                      <Box className="w-3.5 h-3.5 text-[#2271b1]" />
                      <span>Package Specifications & Unit Conversions</span>
                    </span>
                    <span className="text-[10px] text-[#2271b1] font-bold bg-white border border-blue-300 px-2 py-0.5 rounded-xs font-mono">
                      Vol. Wt: {(((parseFloat(String(shipmentForm.length)) || 0) * (parseFloat(String(shipmentForm.width)) || 0) * (parseFloat(String(shipmentForm.height)) || 0)) / 5000).toFixed(3)} kg ({((((parseFloat(String(shipmentForm.length)) || 0) * (parseFloat(String(shipmentForm.width)) || 0) * (parseFloat(String(shipmentForm.height)) || 0)) / 5000) * 35.274).toFixed(2)} oz)
                    </span>
                  </div>

                  {/* Weight Input (kg) & Live OZ conversion */}
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-[#2271b1]" />
                        <span>Actual Weight (kg)</span>
                      </span>
                      <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 border border-blue-300 rounded-xs font-mono">
                        = {((parseFloat(String(shipmentForm.weight)) || 0) * 35.274).toFixed(2)} OZ
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 0.50"
                      value={shipmentForm.weight === 0 ? '' : shipmentForm.weight}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, weight: e.target.value === '' ? 0 : (e.target.value as any) })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                    />
                  </div>

                  {/* Dimensions (Length, Width, Height) in cm & live Inch conversions */}
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                      <span>Dimensions (Length × Width × Height in cm)</span>
                      <span className="text-[10px] text-[#50575e] font-mono">
                        Formula: (L × W × H) / 5000 = Vol. kg
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-white p-2 border border-blue-200 rounded-xs">
                        <div className="text-[10px] font-bold text-[#50575e] mb-1">Length (cm)</div>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Length"
                          value={shipmentForm.length === 0 ? '' : shipmentForm.length}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, length: e.target.value === '' ? 0 : (e.target.value as any) })}
                          className="w-full bg-[#f6f7f7] border border-[#8c8f94] p-1.5 font-mono font-bold text-xs outline-none focus:border-[#2271b1] rounded-xs"
                        />
                        <div className="text-[10px] font-bold text-blue-700 mt-1 font-mono text-center bg-blue-50 py-0.5 rounded-xs">
                          {((parseFloat(String(shipmentForm.length)) || 0) / 2.54).toFixed(2)} in
                        </div>
                      </div>

                      <div className="bg-white p-2 border border-blue-200 rounded-xs">
                        <div className="text-[10px] font-bold text-[#50575e] mb-1">Width (cm)</div>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Width"
                          value={shipmentForm.width === 0 ? '' : shipmentForm.width}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, width: e.target.value === '' ? 0 : (e.target.value as any) })}
                          className="w-full bg-[#f6f7f7] border border-[#8c8f94] p-1.5 font-mono font-bold text-xs outline-none focus:border-[#2271b1] rounded-xs"
                        />
                        <div className="text-[10px] font-bold text-blue-700 mt-1 font-mono text-center bg-blue-50 py-0.5 rounded-xs">
                          {((parseFloat(String(shipmentForm.width)) || 0) / 2.54).toFixed(2)} in
                        </div>
                      </div>

                      <div className="bg-white p-2 border border-blue-200 rounded-xs">
                        <div className="text-[10px] font-bold text-[#50575e] mb-1">Height (cm)</div>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Height"
                          value={shipmentForm.height === 0 ? '' : shipmentForm.height}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, height: e.target.value === '' ? 0 : (e.target.value as any) })}
                          className="w-full bg-[#f6f7f7] border border-[#8c8f94] p-1.5 font-mono font-bold text-xs outline-none focus:border-[#2271b1] rounded-xs"
                        />
                        <div className="text-[10px] font-bold text-blue-700 mt-1 font-mono text-center bg-blue-50 py-0.5 rounded-xs">
                          {((parseFloat(String(shipmentForm.height)) || 0) / 2.54).toFixed(2)} in
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 py-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-1.5 bg-white hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold rounded-xs shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Confirm Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WP Meta-Box Edit Shipment Modal */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl rounded-sm font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#1d2327] text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-[#2c3338]">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#72aee6]" />
                <span>Edit Shipment Details (AWB #{editingShipment.awb_number || editingShipment.tracking_id})</span>
              </h3>
              <button onClick={() => setEditingShipment(null)} className="text-slate-400 hover:text-white font-bold text-lg leading-none">×</button>
            </div>

            <form onSubmit={handleUpdateShipmentDetails} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Row 1: Carrier Partner & AWB Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-[#2271b1]" />
                      <span>Carrier Partner *</span>
                    </label>
                    <select
                      value={shipmentForm.shipment_partner}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, shipment_partner: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                    >
                      <option value="RBS Online">RBS Online</option>
                      <option value="Shiprocket">Shiprocket</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-[#2271b1]" />
                      <span>AWB Number *</span>
                    </label>
                    <input
                      type="text"
                      value={shipmentForm.awb_number}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, awb_number: e.target.value, tracking_id: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#2271b1] outline-none focus:border-[#2271b1] rounded-xs"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Forwarding Number & (Shipping Cost if Shiprocket) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#2271b1]" />
                      <span>Forwarding Number</span>
                    </label>
                    <input
                      type="text"
                      value={shipmentForm.forwarding_number}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, forwarding_number: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                    />
                  </div>

                  {shipmentForm.shipment_partner === 'Shiprocket' && (
                    <div>
                      <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Shipping Cost (INR ₹) *</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={shipmentForm.shipment_cost === 0 ? '' : shipmentForm.shipment_cost}
                        onChange={(e) => setShipmentForm({ ...shipmentForm, shipment_cost: e.target.value === '' ? 0 : (e.target.value as any) })}
                        className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-emerald-800 outline-none focus:border-[#2271b1] rounded-xs"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* RBS Online Specific Costs: Domestic (₹), International (₹) + Dump ($ -> ₹) + Label ($ -> ₹) */}
                {shipmentForm.shipment_partner === 'RBS Online' && (() => {
                  const domInr = parseFloat(String(shipmentForm.domestic_cost)) || 0;
                  const intlInr = parseFloat(String(shipmentForm.international_cost)) || 0;
                  const dumpUsd = parseFloat(String(shipmentForm.dump_cost)) || 0;
                  const labelUsd = parseFloat(String(shipmentForm.label_cost_usd)) || 0;
                  const rate = parseFloat(String(shipmentForm.exchange_rate)) || 99.0;
                  const dumpInr = dumpUsd * rate;
                  const labelInr = labelUsd * rate;
                  const totalInr = domInr + intlInr + dumpInr + labelInr;

                  return (
                    <div className="p-3.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-xs space-y-3">
                      <div className="font-bold text-[#1d2327] flex flex-wrap items-center justify-between text-xs pb-2 border-b border-[#dcdcde] gap-2">
                        <span className="flex items-center gap-1.5 text-emerald-800">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span>RBS Online Cost Breakdown</span>
                        </span>
                        <span className="text-xs text-emerald-800 font-extrabold bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xs font-mono">
                          Total: ₹{totalInr.toFixed(2)} INR
                        </span>
                      </div>

                      {/* Domestic & International costs (in INR ₹) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-[#1d2327] mb-1 text-[11px]">
                            Domestic Cost (INR ₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              step="any"
                              value={shipmentForm.domestic_cost === 0 ? '' : shipmentForm.domestic_cost}
                              onChange={(e) => setShipmentForm({ ...shipmentForm, domestic_cost: e.target.value === '' ? 0 : (e.target.value as any) })}
                              className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1.5 font-bold font-mono text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-[#1d2327] mb-1 text-[11px]">
                            International Cost (INR ₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              step="any"
                              value={shipmentForm.international_cost === 0 ? '' : shipmentForm.international_cost}
                              onChange={(e) => setShipmentForm({ ...shipmentForm, international_cost: e.target.value === '' ? 0 : (e.target.value as any) })}
                              className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1.5 font-bold font-mono text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* USD Components: Dump Cost ($), Label Cost ($) & Exchange Rate (₹) */}
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xs space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-[#1d2327] mb-1 text-[11px] flex items-center justify-between">
                              <span>Dump Cost ($ USD)</span>
                              <span className="text-[10px] font-bold text-emerald-800 font-mono">
                                = ₹{dumpInr.toFixed(2)} INR
                              </span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">$</span>
                              <input
                                type="number"
                                step="any"
                                value={shipmentForm.dump_cost === 0 ? '' : shipmentForm.dump_cost}
                                onChange={(e) => setShipmentForm({ ...shipmentForm, dump_cost: e.target.value === '' ? 0 : (e.target.value as any) })}
                                className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1.5 font-bold font-mono text-emerald-900 outline-none focus:border-[#2271b1] rounded-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-[#1d2327] mb-1 text-[11px] flex items-center justify-between">
                              <span>Label Cost ($ USD)</span>
                              <span className="text-[10px] font-bold text-emerald-800 font-mono">
                                = ₹{labelInr.toFixed(2)} INR
                              </span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">$</span>
                              <input
                                type="number"
                                step="any"
                                value={shipmentForm.label_cost_usd === 0 ? '' : shipmentForm.label_cost_usd}
                                onChange={(e) => setShipmentForm({ ...shipmentForm, label_cost_usd: e.target.value === '' ? 0 : (e.target.value as any) })}
                                className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1.5 font-bold font-mono text-emerald-900 outline-none focus:border-[#2271b1] rounded-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* USD to INR Exchange Rate */}
                        <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
                          <label className="block font-bold text-[#1d2327] text-[11px]">
                            <span>USD to INR Rate: </span>
                            <span className="text-[10px] text-slate-500 font-normal">(Default: ₹99.0 / $1 USD)</span>
                          </label>
                          <div className="relative w-36">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              step="any"
                              value={shipmentForm.exchange_rate}
                              onChange={(e) => setShipmentForm({ ...shipmentForm, exchange_rate: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) })}
                              className="w-full bg-white border border-[#8c8f94] pl-6 pr-2 py-1 font-mono font-bold text-xs text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Package Specifications: Weight & Dimensions */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xs space-y-3">
                  <div className="font-bold text-[#1d2327] text-xs flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-blue-200/60">
                    <span className="flex items-center gap-1.5 text-blue-900">
                      <Box className="w-3.5 h-3.5 text-[#2271b1]" />
                      <span>Package Specifications & Unit Conversions</span>
                    </span>
                    <span className="text-[10px] text-[#2271b1] font-bold bg-white border border-blue-300 px-2 py-0.5 rounded-xs font-mono">
                      Vol. Wt: {(((parseFloat(String(shipmentForm.length)) || 0) * (parseFloat(String(shipmentForm.width)) || 0) * (parseFloat(String(shipmentForm.height)) || 0)) / 5000).toFixed(3)} kg ({((((parseFloat(String(shipmentForm.length)) || 0) * (parseFloat(String(shipmentForm.width)) || 0) * (parseFloat(String(shipmentForm.height)) || 0)) / 5000) * 35.274).toFixed(2)} oz)
                    </span>
                  </div>

                  {/* Weight Input (kg) & Live OZ conversion */}
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-[#2271b1]" />
                        <span>Actual Weight (kg)</span>
                      </span>
                      <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 border border-blue-300 rounded-xs font-mono">
                        = {((parseFloat(String(shipmentForm.weight)) || 0) * 35.274).toFixed(2)} OZ
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 0.50"
                      value={shipmentForm.weight === 0 ? '' : shipmentForm.weight}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, weight: e.target.value === '' ? 0 : (e.target.value as any) })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                    />
                  </div>

                  {/* Dimensions (Length, Width, Height) in cm & live Inch conversions */}
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                      <span>Dimensions (Length × Width × Height in cm)</span>
                      <span className="text-[10px] text-[#50575e] font-mono">
                        Formula: (L × W × H) / 5000 = Vol. kg
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-white p-2 border border-blue-200 rounded-xs">
                        <div className="text-[10px] font-bold text-[#50575e] mb-1">Length (cm)</div>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Length"
                          value={shipmentForm.length === 0 ? '' : shipmentForm.length}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, length: e.target.value === '' ? 0 : (e.target.value as any) })}
                          className="w-full bg-[#f6f7f7] border border-[#8c8f94] p-1.5 font-mono font-bold text-xs outline-none focus:border-[#2271b1] rounded-xs"
                        />
                        <div className="text-[10px] font-bold text-blue-700 mt-1 font-mono text-center bg-blue-50 py-0.5 rounded-xs">
                          {((parseFloat(String(shipmentForm.length)) || 0) / 2.54).toFixed(2)} in
                        </div>
                      </div>

                      <div className="bg-white p-2 border border-blue-200 rounded-xs">
                        <div className="text-[10px] font-bold text-[#50575e] mb-1">Width (cm)</div>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Width"
                          value={shipmentForm.width === 0 ? '' : shipmentForm.width}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, width: e.target.value === '' ? 0 : (e.target.value as any) })}
                          className="w-full bg-[#f6f7f7] border border-[#8c8f94] p-1.5 font-mono font-bold text-xs outline-none focus:border-[#2271b1] rounded-xs"
                        />
                        <div className="text-[10px] font-bold text-blue-700 mt-1 font-mono text-center bg-blue-50 py-0.5 rounded-xs">
                          {((parseFloat(String(shipmentForm.width)) || 0) / 2.54).toFixed(2)} in
                        </div>
                      </div>

                      <div className="bg-white p-2 border border-blue-200 rounded-xs">
                        <div className="text-[10px] font-bold text-[#50575e] mb-1">Height (cm)</div>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Height"
                          value={shipmentForm.height === 0 ? '' : shipmentForm.height}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, height: e.target.value === '' ? 0 : (e.target.value as any) })}
                          className="w-full bg-[#f6f7f7] border border-[#8c8f94] p-1.5 font-mono font-bold text-xs outline-none focus:border-[#2271b1] rounded-xs"
                        />
                        <div className="text-[10px] font-bold text-blue-700 mt-1 font-mono text-center bg-blue-50 py-0.5 rounded-xs">
                          {((parseFloat(String(shipmentForm.height)) || 0) / 2.54).toFixed(2)} in
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 py-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="px-4 py-1.5 bg-white hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold rounded-xs shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Shipment Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
