'use client';

import React, { useEffect, useState } from 'react';
import { shipmentsApi, ordersApi, authApi, purchasesApi, companiesApi, accountsApi, partnersMgmtApi, inventoryApi, getImageUrl } from '@/lib/api';
import { Truck, CheckCircle2, Clock, MapPin, PackageCheck, Edit2, Trash2, ShieldAlert, Plus, Layers, Calendar, RotateCcw, ChevronLeft, ChevronRight, Search, X, Scale, Box, DollarSign, FileText, Barcode, Calculator, Check, ExternalLink, Phone, Building2, Download, Filter, Tag, Settings2 } from 'lucide-react';
import ResizableTable from '@/components/ResizableTable';
import ColumnVisibilityDropdown, { ColumnDefinition, ColumnPreset } from '@/components/ColumnVisibilityDropdown';
import { hasPermission, getAllowedCompanies } from '@/lib/permissions';

const READY_TABLE_COLUMNS: ColumnDefinition[] = [
  { key: 'order_process_date', label: 'Process Date' },
  { key: 'shipping_date', label: 'Shipping Date' },
  { key: 'last_delivery_date', label: 'Last Delivery Date' },
  { key: 'arriving_date', label: 'Arrive Date' },
  { key: 'order_number', label: 'Order ID' },
  { key: 'po_number', label: 'PO' },
  { key: 'shipment_id', label: 'Shipment No' },
  { key: 'company', label: 'Company' },
  { key: 'seller_account', label: 'Partner / Seller' },
  { key: 'product_name', label: 'Product Name' },
  { key: 'qty', label: 'Qty' },
  { key: 'consignee_name', label: 'Consignee Name' },
  { key: 'shipment_address_1', label: 'Address Line 1' },
  { key: 'shipment_address_2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip_code', label: 'Zip Code' },
  { key: 'mobile_number', label: 'Contact Number' },
  { key: 'country', label: 'Country' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', locked: true },
];

const READY_COLUMN_PRESETS: ColumnPreset[] = [
  {
    id: 'default',
    label: 'Default View',
    columnKeys: [
      'order_process_date',
      'last_delivery_date',
      'order_number',
      'po_number',
      'company',
      'product_name',
      'qty',
      'consignee_name',
      'city',
      'state',
      'status',
      'actions',
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics View',
    columnKeys: [
      'order_process_date',
      'shipping_date',
      'last_delivery_date',
      'arriving_date',
      'order_number',
      'shipment_id',
      'product_name',
      'consignee_name',
      'shipment_address_1',
      'city',
      'state',
      'zip_code',
      'mobile_number',
      'status',
      'actions',
    ],
  },
];

const DEFAULT_VISIBLE_READY_KEYS = READY_COLUMN_PRESETS[0].columnKeys;

const DISPATCHED_TABLE_COLUMNS: ColumnDefinition[] = [
  { key: 'carrier_partner', label: 'Carrier Partner' },
  { key: 'awb_tracking', label: 'AWB / Tracking' },
  { key: 'forwarding_number', label: 'Forwarding #' },
  { key: 'shipping_date', label: 'Shipping Date' },
  { key: 'last_delivery_date', label: 'Last Delivery Date' },
  { key: 'arriving_date', label: 'Arrive Date' },
  { key: 'order_number', label: 'Order ID' },
  { key: 'po_number', label: 'PO' },
  { key: 'shipment_id', label: 'Shipment No' },
  { key: 'product_name', label: 'Product Name' },
  { key: 'qty', label: 'Qty' },
  { key: 'consignee_name', label: 'Consignee Name' },
  { key: 'shipment_address_1', label: 'Address Line 1' },
  { key: 'shipment_address_2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip_code', label: 'Zip Code' },
  { key: 'mobile_number', label: 'Contact Number' },
  { key: 'country', label: 'Country' },
  { key: 'weight', label: 'Weight (kg/oz)' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'vol_wt', label: 'Vol. Wt' },
  { key: 'cost_breakdown', label: 'Cost Breakdown' },
  { key: 'total_cost', label: 'Total Cost (₹)' },
  { key: 'forwarding_id', label: 'Forwarding ID' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', locked: true },
];

const DISPATCHED_COLUMN_PRESETS: ColumnPreset[] = [
  {
    id: 'default',
    label: 'Default View',
    columnKeys: [
      'carrier_partner',
      'awb_tracking',
      'order_number',
      'product_name',
      'qty',
      'consignee_name',
      'city',
      'weight',
      'total_cost',
      'forwarding_id',
      'status',
      'actions',
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics View',
    columnKeys: [
      'carrier_partner',
      'awb_tracking',
      'shipping_date',
      'last_delivery_date',
      'order_number',
      'product_name',
      'consignee_name',
      'shipment_address_1',
      'city',
      'state',
      'zip_code',
      'mobile_number',
      'weight',
      'dimensions',
      'vol_wt',
      'forwarding_id',
      'status',
      'actions',
    ],
  },
  {
    id: 'costs',
    label: 'Cost View',
    columnKeys: [
      'carrier_partner',
      'awb_tracking',
      'order_number',
      'po_number',
      'product_name',
      'qty',
      'weight',
      'cost_breakdown',
      'total_cost',
      'forwarding_id',
      'status',
      'actions',
    ],
  },
];

const DEFAULT_VISIBLE_DISPATCHED_KEYS = DISPATCHED_COLUMN_PRESETS[0].columnKeys;

export default function ShipmentsPage() {
  const [activeTab, setActiveTab] = useState<'ready' | 'dispatched'>('ready');

  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [allOrdersList, setAllOrdersList] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Column Visibility States with local storage persistence
  const [visibleColumnsReady, setVisibleColumnsReady] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('crm_shipments_ready_column_visibility');
        if (saved) return JSON.parse(saved);
      } catch (e) { }
    }
    const initial: Record<string, boolean> = {};
    DEFAULT_VISIBLE_READY_KEYS.forEach(k => { initial[k] = true; });
    return initial;
  });

  const [visibleColumnsDispatched, setVisibleColumnsDispatched] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('crm_shipments_dispatched_column_visibility');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.forwarding_id === undefined) {
            parsed.forwarding_id = true;
          }
          return parsed;
        }
      } catch (e) { }
    }
    const initial: Record<string, boolean> = {};
    DEFAULT_VISIBLE_DISPATCHED_KEYS.forEach(k => { initial[k] = true; });
    return initial;
  });

  // Filter States
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('All');
  const [selectedReadyStatus, setSelectedReadyStatus] = useState<string>('All');
  const [selectedDispatchedStatus, setSelectedDispatchedStatus] = useState<string>('All');
  const [selectedSellerAccount, setSelectedSellerAccount] = useState<string>('All');
  const [selectedLabelType, setSelectedLabelType] = useState<string>('All');
  const [dateFieldType, setDateFieldType] = useState<string>('process_date');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showEditPurchaseModal, setShowEditPurchaseModal] = useState(false);
  const [selectedOrderForPurchaseEdit, setSelectedOrderForPurchaseEdit] = useState<any>(null);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [savingPurchaseEdit, setSavingPurchaseEdit] = useState(false);
  const [revertingPurchase, setRevertingPurchase] = useState(false);
  const [purchaseEditForm, setPurchaseEditForm] = useState({
    order_id: 0,
    purchase_id: null as number | null,
    is_in_stock: false,
    purchase_value: 0,
    purchase_partner_name: '',
    po_number: '',
    delivery_code: '',
    estimated_shipment_date: '',
    notes: '',
    qty: 1,
    product_name: '',
  });

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
    label_free: false,
    exchange_rate: 99.0,
    label_cost_inr: 0,
    shipment_cost: 0,
  });

  // Pagination states for tabs
  const [currentPageReady, setCurrentPageReady] = useState<number>(1);
  const [currentPageDispatched, setCurrentPageDispatched] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [receivingOrderId, setReceivingOrderId] = useState<number | null>(null);

  const loadAllData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const [ordRes, shipRes, purRes, compRes, accRes, partRes, invRes, meRes] = await Promise.all([
        ordersApi.list().catch(() => ({ data: [] })),
        shipmentsApi.list().catch(() => ({ data: [] })),
        purchasesApi.list().catch(() => ({ data: [] })),
        companiesApi.list().catch(() => ({ data: [] })),
        accountsApi.list().catch(() => ({ data: [] })),
        partnersMgmtApi.list().catch(() => ({ data: [] })),
        inventoryApi.list().catch(() => ({ data: [] })),
        authApi.getMe().catch(() => ({ data: null }))
      ]);

      const allOrders = ordRes.data || [];
      const shipList = shipRes.data || [];
      const purList = purRes.data || [];
      setPurchases(purList);
      setAllOrdersList(allOrders);
      setCompaniesList(compRes.data || []);
      setAccountsList(accRes.data || []);
      setPartnersList(partRes.data || []);
      setInventoryList(invRes.data || []);

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
          shipment_partner: o.delivery_service || 'RBS Online',
          product_name: o.product_name,
          product_image: o.product_image,
          weight: 1.0,
          dimensions: '10 x 5 x 8 cm',
          shipment_cost: o.shipment_cost || 0,
          status: o.status,
          created_at: o.order_process_date || o.order_date || o.created_at,
          shipment_date: o.order_process_date || o.order_date || o.created_at,
          shipping_date: o.shipping_date,
          last_delivery_date: o.last_delivery_date,
          arriving_date: o.arriving_date,
          buyer_name: o.buyer_name,
          consignee_name: o.consignee_name,
          company: o.company,
          seller_account: o.seller_account || o.account_name,
          label_free: o.label_free,
          label_cost_usd: o.label_cost_usd || 0,
          label_tracking_id: o.label_tracking_id,
          mobile_number: o.mobile_number,
          shipment_address_1: o.shipment_address_1,
          shipment_address_2: o.shipment_address_2,
          city: o.city,
          state: o.state,
          zip_code: o.zip_code,
          country: o.country || 'USA',
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
  }, [
    startDate,
    endDate,
    searchQuery,
    pageSize,
    selectedCompany,
    selectedCarrier,
    selectedReadyStatus,
    selectedDispatchedStatus,
    selectedSellerAccount,
    selectedLabelType,
    dateFieldType,
    activeTab
  ]);

  // Helper for Date Range checking
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const d = dateStr.split('T')[0];
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  // Quick Date Preset Setter
  const setQuickDate = (preset: 'today' | 'yesterday' | '7days' | 'month' | 'all') => {
    const now = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    if (preset === 'today') {
      const todayStr = formatDate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }
    if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDate(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
      return;
    }
    if (preset === '7days') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      setStartDate(formatDate(past7));
      setEndDate(formatDate(now));
      return;
    }
    if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(lastDay));
      return;
    }
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

  // Available Companies for filter dropdown
  const availableCompanies = Array.from(new Set([
    ...companiesList.map((c: any) => c.company_name).filter(Boolean),
    ...readyOrders.map((o: any) => o.company).filter(Boolean),
    ...shipments.map((s: any) => s.company).filter(Boolean),
    ...companyOptions
  ])).filter(c => isAllowedCompany(c));

  // Available Carriers for filter dropdown
  const availableCarriers = Array.from(new Set([
    'RBS Online',
    'Shiprocket',
    ...shipments.map((s: any) => s.shipment_partner).filter(Boolean),
    ...readyOrders.map((o: any) => o.delivery_service).filter(Boolean)
  ]));

  // Available Seller Accounts for filter dropdown
  const availableSellerAccounts = Array.from(new Set([
    ...allOrdersList
      .filter(o => isAllowedCompany(o.company) && (selectedCompany === 'All' || o.company?.toLowerCase() === selectedCompany.toLowerCase()))
      .map(o => o.seller_account || o.account_name)
      .filter(Boolean),
    ...accountsList
      .filter((a: any) => isAllowedCompany(a.company) && (selectedCompany === 'All' || a.company?.toLowerCase() === selectedCompany.toLowerCase()))
      .map((a: any) => a.account_name)
      .filter(Boolean)
  ]));

  // Reset All Filters
  const resetAllFilters = () => {
    setSelectedCompany('All');
    setSelectedCarrier('All');
    setSelectedReadyStatus('All');
    setSelectedDispatchedStatus('All');
    setSelectedSellerAccount('All');
    setSelectedLabelType('All');
    setDateFieldType('process_date');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const hasActiveFilters = Boolean(
    selectedCompany !== 'All' ||
    selectedCarrier !== 'All' ||
    (activeTab === 'ready' ? selectedReadyStatus !== 'All' : selectedDispatchedStatus !== 'All') ||
    selectedSellerAccount !== 'All' ||
    selectedLabelType !== 'All' ||
    startDate ||
    endDate ||
    searchQuery
  );

  // Date and Search Filtered Datasets
  const dateFilteredReadyOrders = readyOrders
    .filter(o => isAllowedCompany(o.company))
    .filter(o => {
      if (selectedCompany !== 'All' && (o.company || '').toLowerCase() !== selectedCompany.toLowerCase()) {
        return false;
      }
      return true;
    })
    .filter(o => {
      if (selectedCarrier !== 'All' && (o.delivery_service || '').toLowerCase() !== selectedCarrier.toLowerCase()) {
        return false;
      }
      return true;
    })
    .filter(o => {
      if (selectedSellerAccount !== 'All') {
        const pur = purchases.find((p: any) => p.order_id === o.id);
        const seller = (o.seller_account || o.account_name || pur?.purchase_partner_name || '').toLowerCase();
        if (seller !== selectedSellerAccount.toLowerCase()) return false;
      }
      return true;
    })
    .filter(o => {
      if (selectedLabelType === 'free') {
        return Boolean(o.label_free);
      }
      if (selectedLabelType === 'paid') {
        return !o.label_free && Number(o.label_cost_usd) > 0;
      }
      return true;
    })
    .filter(o => {
      const pur = purchases.find((p: any) => p.order_id === o.id);
      const isInStock =
        (o.order_status || '').toLowerCase() === 'in stock' ||
        o.status === 'In Stock' ||
        Boolean(pur && (pur.notes?.includes('In-Stock') || pur.purchase_partner_name === 'In Stock' || pur.bank === 'In Stock'));

      const isPurchaseReceived = Boolean(pur && (pur.status === 'Received' || pur.status === 'Completed'));
      const isPurchasePending = !isInStock && !isPurchaseReceived && (o.status === 'Purchase Pending' || o.status === 'Pending' || (pur && pur.status !== 'Received'));
      const isReadyToShip = isPurchaseReceived && !isInStock;

      if (selectedReadyStatus === 'In Stock') return isInStock;
      if (selectedReadyStatus === 'Purchase Pending') return isPurchasePending;
      if (selectedReadyStatus === 'Ready to Ship') return isReadyToShip || (!isInStock && !isPurchasePending);
      return true;
    })
    .filter(o => {
      const pur = purchases.find((p: any) => p.order_id === o.id);
      let targetDate = o.order_process_date || o.order_date || o.created_at;
      if (dateFieldType === 'shipping_date') targetDate = o.shipping_date;
      else if (dateFieldType === 'last_delivery_date') targetDate = o.last_delivery_date;
      else if (dateFieldType === 'arriving_date') targetDate = o.arriving_date || pur?.estimated_shipment_date;
      return isDateInRange(targetDate);
    })
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
    .filter(s => {
      const matchingOrder = allOrdersList.find((o: any) => o.id === s.order_id);
      const comp = s.company || matchingOrder?.company || '';
      if (selectedCompany !== 'All' && comp.toLowerCase() !== selectedCompany.toLowerCase()) {
        return false;
      }
      return true;
    })
    .filter(s => {
      if (selectedCarrier !== 'All' && (s.shipment_partner || '').toLowerCase() !== selectedCarrier.toLowerCase()) {
        return false;
      }
      return true;
    })
    .filter(s => {
      if (selectedSellerAccount !== 'All') {
        const pur = purchases.find((p: any) => p.order_id === s.order_id);
        const matchingOrder = allOrdersList.find((o: any) => o.id === s.order_id);
        const seller = (matchingOrder?.seller_account || matchingOrder?.account_name || s.seller_account || pur?.purchase_partner_name || '').toLowerCase();
        if (seller !== selectedSellerAccount.toLowerCase()) return false;
      }
      return true;
    })
    .filter(s => {
      const matchingOrder = allOrdersList.find((o: any) => o.id === s.order_id);
      const isFree = Boolean(s.label_free || matchingOrder?.label_free);
      const labelCost = Number(s.label_cost_usd || matchingOrder?.label_cost_usd || 0);
      if (selectedLabelType === 'free') {
        return isFree;
      }
      if (selectedLabelType === 'paid') {
        return !isFree && labelCost > 0;
      }
      return true;
    })
    .filter(s => {
      if (selectedDispatchedStatus !== 'All') {
        const st = s.status || 'In Transit';
        if (st.toLowerCase() !== selectedDispatchedStatus.toLowerCase()) return false;
      }
      return true;
    })
    .filter(s => {
      const pur = purchases.find((p: any) => p.order_id === s.order_id);
      const matchingOrder = allOrdersList.find((o: any) => o.id === s.order_id);
      let targetDate = s.created_at || s.shipment_date || matchingOrder?.order_process_date || matchingOrder?.order_date;
      if (dateFieldType === 'shipping_date') targetDate = matchingOrder?.shipping_date || s.shipping_date;
      else if (dateFieldType === 'last_delivery_date') targetDate = matchingOrder?.last_delivery_date || s.last_delivery_date;
      else if (dateFieldType === 'arriving_date') targetDate = matchingOrder?.arriving_date || pur?.estimated_shipment_date || s.arriving_date;
      return isDateInRange(targetDate);
    })
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
    const isFree = Boolean(order.label_free);
    const labelCostUsd = isFree ? 0 : (order.label_cost_usd || 0);
    const exRate = 99.0;
    const labelCostInr = isFree ? 0 : parseFloat((labelCostUsd * exRate).toFixed(2));
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
      label_free: isFree,
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
      const isFree = Boolean(shipmentForm.label_free);
      const labelUsd = isFree ? 0 : (parseFloat(String(shipmentForm.label_cost_usd)) || 0);
      const exRate = parseFloat(String(shipmentForm.exchange_rate)) || 99.0;
      const dumpInr = parseFloat((dumpUsd * exRate).toFixed(2));
      const labelInr = isFree ? 0 : parseFloat((labelUsd * exRate).toFixed(2));

      const sCost = shipmentForm.shipment_partner === 'RBS Online'
        ? parseFloat((dCost + iCost + dumpInr + labelInr).toFixed(2))
        : (parseFloat(String(shipmentForm.shipment_cost)) || 0);

      const len = parseFloat(String(shipmentForm.length)) || 0;
      const wid = parseFloat(String(shipmentForm.width)) || 0;
      const hgt = parseFloat(String(shipmentForm.height)) || 0;
      const volWt = parseFloat((((len * wid * hgt) / 5000) || 0).toFixed(3));
      const dimStr = `${len} × ${wid} × ${hgt} cm`;
      const awbVal = shipmentForm.awb_number || shipmentForm.tracking_id || `AWB-${targetOrderId}`;

      const shipPayload = {
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
        label_free: isFree,
        exchange_rate: exRate,
        label_cost_inr: labelInr,
        shipment_cost: sCost,
      };

      const res = await shipmentsApi.create(shipPayload);

      // Automatically update order status to 'Shipped' and sync label_free
      await ordersApi.update(targetOrderId, {
        status: 'Shipped',
        delivery_service: shipmentForm.shipment_partner,
        shipment_id: awbVal,
        shipment_cost: sCost,
        label_free: isFree,
        label_cost_usd: labelUsd,
      });

      // Optimistic update: add new shipment to list
      const newShipment = res.data || { ...shipPayload, id: Date.now(), status: 'Shipped', created_at: new Date().toISOString() };
      setShipments(prev => [...prev, newShipment]);

      // Remove from ready orders since it's now shipped
      setReadyOrders(prev => prev.filter(o => o.id !== targetOrderId));

      // Update the order in allOrdersList
      setAllOrdersList(prev => prev.map(o =>
        o.id === targetOrderId
          ? { ...o, status: 'Shipped', delivery_service: shipmentForm.shipment_partner, shipment_id: awbVal, shipment_cost: sCost, label_free: isFree, label_cost_usd: labelUsd }
          : o
      ));

      setShowDispatchModal(false);
      setActiveTab('dispatched');
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
      if (matchingPur && (newStatus === 'Ready to Ship' || newStatus === 'In Stock')) {
        await purchasesApi.update(matchingPur.id, { status: 'Received' });
        setPurchases(prev => prev.map(p => p.id === matchingPur.id ? { ...p, status: 'Received' } : p));
      }

      // Optimistic update: update status in local state
      setReadyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setAllOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
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
    } catch (err) {
      console.error(err);
      alert('Error marking purchase as received');
      // On error, reload to restore correct state
      loadAllData(false);
    } finally {
      setReceivingOrderId(null);
    }
  };

  const openEditPurchaseModal = (ord: any) => {
    setSelectedOrderForPurchaseEdit(ord);
    const pur = purchases.find((p: any) => p.order_id === ord.id);
    const isInStock =
      (ord.order_status || '').toLowerCase() === 'in stock' ||
      ord.status === 'In Stock' ||
      Boolean(pur && (pur.notes?.includes('In-Stock') || pur.purchase_partner_name === 'In Stock' || pur.bank === 'In Stock'));

    setPurchaseEditForm({
      order_id: ord.id,
      purchase_id: pur?.id || null,
      is_in_stock: isInStock,
      purchase_value: pur?.purchase_value ?? (ord.purchase_cost_inr || 0),
      purchase_partner_name: (pur?.purchase_partner_name && pur.purchase_partner_name !== 'In Stock')
        ? pur.purchase_partner_name
        : (isInStock ? 'In Stock' : (ord.seller_account || ord.account_name || 'Vendor')),
      po_number: pur?.po_number || '',
      delivery_code: pur?.delivery_code || ord.oi || ord.shipment_id || '',
      estimated_shipment_date: pur?.estimated_shipment_date || ord.arriving_date || new Date().toISOString().split('T')[0],
      notes: (pur?.notes && !pur.notes.includes('In-Stock')) ? pur.notes : '',
      qty: pur?.qty || ord.qty || 1,
      product_name: ord.product_name || pur?.product_name || 'Product',
    });
    setShowEditPurchaseModal(true);
  };

  const handleRevertPurchase = async () => {
    if (!selectedOrderForPurchaseEdit) return;
    const ordId = selectedOrderForPurchaseEdit.id;
    const purId = purchaseEditForm.purchase_id;

    const confirmRevert = window.confirm(
      `Are you sure you want to REVERT this purchase?\n\n` +
      `• Order ${selectedOrderForPurchaseEdit.order_number || ordId} will be removed from "Ready to Ship".\n` +
      `• Order status will be reset to "Pending".\n` +
      `• Purchase cost will be reset to ₹0.\n` +
      `• It will reappear in the Orders queue as Pending Purchase.`
    );
    if (!confirmRevert) return;

    try {
      setRevertingPurchase(true);
      const nowIso = new Date().toISOString();

      // Optimistic update
      setReadyOrders(prev => prev.filter(o => o.id !== ordId));
      if (purId) {
        setPurchases(prev => prev.filter(p => p.id !== purId));
      }
      setAllOrdersList(prev => {
        const target = prev.find(o => o.id === ordId);
        const rest = prev.filter(o => o.id !== ordId);
        if (target) {
          const updated = {
            ...target,
            purchase_cost_inr: 0,
            status: 'Pending',
            order_status: 'Pending',
            created_at: nowIso,
          };
          return [updated, ...rest];
        }
        return prev;
      });

      // API calls
      if (purId) {
        await purchasesApi.delete(purId);
      }
      await ordersApi.update(ordId, {
        purchase_cost_inr: 0,
        status: 'Pending',
        order_status: 'Pending',
        created_at: nowIso,
      });

      setShowEditPurchaseModal(false);
    } catch (err) {
      console.error('Failed to revert purchase', err);
      alert('Error reverting purchase. Reloading data...');
      loadAllData(false);
    } finally {
      setRevertingPurchase(false);
    }
  };

  const handleSavePurchaseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForPurchaseEdit) return;
    const ordId = selectedOrderForPurchaseEdit.id;
    const purId = purchaseEditForm.purchase_id;
    const isStock = purchaseEditForm.is_in_stock;
    const pVal = parseFloat(String(purchaseEditForm.purchase_value)) || 0;
    const newQty = parseInt(String(purchaseEditForm.qty)) || selectedOrderForPurchaseEdit.qty || 1;

    try {
      setSavingPurchaseEdit(true);

      const targetStatus = isStock ? 'In Stock' : 'Ready to Ship';
      const targetOrderStatus = isStock ? 'In Stock' : (selectedOrderForPurchaseEdit.company || 'ADBH');

      const partnerName = isStock
        ? 'In Stock'
        : (purchaseEditForm.purchase_partner_name?.trim() === 'In Stock' || !purchaseEditForm.purchase_partner_name?.trim()
            ? (selectedOrderForPurchaseEdit.seller_account || selectedOrderForPurchaseEdit.account_name || 'Vendor')
            : purchaseEditForm.purchase_partner_name.trim());

      const notesVal = isStock
        ? (purchaseEditForm.notes || 'In-Stock Order')
        : (purchaseEditForm.notes?.replace(/in-stock/gi, '').trim() || null);

      const purStatus = isStock ? 'Received' : 'Purchased';

      // Optimistic updates
      setReadyOrders(prev => prev.map(o => {
        if (o.id === ordId) {
          return {
            ...o,
            purchase_cost_inr: pVal,
            qty: newQty,
            oi: purchaseEditForm.delivery_code || o.oi,
            arriving_date: purchaseEditForm.estimated_shipment_date || o.arriving_date,
            status: targetStatus,
            order_status: targetOrderStatus,
          };
        }
        return o;
      }));

      setAllOrdersList(prev => prev.map(o => {
        if (o.id === ordId) {
          return {
            ...o,
            purchase_cost_inr: pVal,
            qty: newQty,
            oi: purchaseEditForm.delivery_code || o.oi,
            arriving_date: purchaseEditForm.estimated_shipment_date || o.arriving_date,
            status: targetStatus,
            order_status: targetOrderStatus,
          };
        }
        return o;
      }));

      if (purId) {
        await purchasesApi.update(purId, {
          purchase_value: pVal,
          qty: newQty,
          purchase_partner_name: partnerName,
          po_number: purchaseEditForm.po_number || null,
          delivery_code: purchaseEditForm.delivery_code || null,
          estimated_shipment_date: purchaseEditForm.estimated_shipment_date || null,
          notes: notesVal,
          status: purStatus,
        });
        setPurchases(prev => prev.map(p => p.id === purId ? {
          ...p,
          purchase_value: pVal,
          qty: newQty,
          purchase_partner_name: partnerName,
          po_number: purchaseEditForm.po_number || null,
          delivery_code: purchaseEditForm.delivery_code || null,
          estimated_shipment_date: purchaseEditForm.estimated_shipment_date || null,
          notes: notesVal,
          status: purStatus,
        } : p));
      } else {
        const createdPur = await purchasesApi.create({
          order_id: ordId,
          order_date: new Date().toISOString().split('T')[0],
          product_name: selectedOrderForPurchaseEdit.product_name,
          purchase_value: pVal,
          other_cost: 0,
          extra_cost: 0,
          purchase_partner_name: partnerName,
          po_number: purchaseEditForm.po_number || null,
          delivery_code: purchaseEditForm.delivery_code || null,
          estimated_shipment_date: purchaseEditForm.estimated_shipment_date || null,
          notes: notesVal,
          status: purStatus,
          company: selectedOrderForPurchaseEdit.company || 'ADBH',
          qty: newQty,
        });
        if (createdPur?.data) {
          setPurchases(prev => [createdPur.data, ...prev]);
        }
      }

      await ordersApi.update(ordId, {
        purchase_cost_inr: pVal,
        qty: newQty,
        oi: purchaseEditForm.delivery_code || undefined,
        arriving_date: purchaseEditForm.estimated_shipment_date || undefined,
        status: targetStatus,
        order_status: targetOrderStatus,
      });

      setShowEditPurchaseModal(false);
    } catch (err) {
      console.error('Failed to save purchase edit', err);
      alert('Error updating purchase details. Reloading...');
      loadAllData(false);
    } finally {
      setSavingPurchaseEdit(false);
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

    const matchingOrder = allOrdersList.find((o: any) => o.id === ship.order_id);
    const isFree = Boolean(ship.label_free || matchingOrder?.label_free);
    const labelCostUsd = isFree ? 0 : (ship.label_cost_usd || 0);

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
      label_cost_usd: labelCostUsd,
      label_free: isFree,
      exchange_rate: ship.exchange_rate || 99.0,
      label_cost_inr: isFree ? 0 : (ship.label_cost_inr || 0),
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
      const isFree = Boolean(shipmentForm.label_free);
      const labelUsd = isFree ? 0 : (parseFloat(String(shipmentForm.label_cost_usd)) || 0);
      const exRate = parseFloat(String(shipmentForm.exchange_rate)) || 99.0;
      const dumpInr = parseFloat((dumpUsd * exRate).toFixed(2));
      const labelInr = isFree ? 0 : parseFloat((labelUsd * exRate).toFixed(2));

      const sCost = shipmentForm.shipment_partner === 'RBS Online'
        ? parseFloat((dCost + iCost + dumpInr + labelInr).toFixed(2))
        : (parseFloat(String(shipmentForm.shipment_cost)) || 0);

      const len = parseFloat(String(shipmentForm.length)) || 0;
      const wid = parseFloat(String(shipmentForm.width)) || 0;
      const hgt = parseFloat(String(shipmentForm.height)) || 0;
      const volWt = parseFloat((((len * wid * hgt) / 5000) || 0).toFixed(3));
      const dimStr = `${len} × ${wid} × ${hgt} cm`;
      const awbVal = shipmentForm.awb_number || shipmentForm.tracking_id;

      const updatePayload = {
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
        label_free: isFree,
        exchange_rate: exRate,
        label_cost_inr: labelInr,
        shipment_cost: sCost,
      };

      await shipmentsApi.update(editingShipment.id, updatePayload);

      if (editingShipment.order_id) {
        await ordersApi.update(editingShipment.order_id, {
          label_free: isFree,
          label_cost_usd: labelUsd,
          shipment_cost: sCost,
        }).catch(() => { });

        // Optimistic update: sync order in allOrdersList
        setAllOrdersList(prev => prev.map(o =>
          o.id === editingShipment.order_id
            ? { ...o, label_free: isFree, label_cost_usd: labelUsd, shipment_cost: sCost }
            : o
        ));
      }

      // Optimistic update: update shipment in local state
      setShipments(prev => prev.map(s =>
        s.id === editingShipment.id ? { ...s, ...updatePayload } : s
      ));

      setEditingShipment(null);
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
        // Optimistic update: update the auto-generated shipment entry
        setShipments(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
        setAllOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      } else {
        await shipmentsApi.update(Number(id), { status: newStatus });
        // Optimistic update: update shipment status locally
        setShipments(prev => prev.map(s => s.id === Number(id) ? { ...s, status: newStatus } : s));
      }
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
          // Optimistic update: remove from shipments, move back to ready
          setShipments(prev => prev.filter(s => s.id !== id));
          setAllOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Ready to Ship' } : o));
          const orderToRestore = allOrdersList.find(o => o.id === orderId);
          if (orderToRestore) {
            setReadyOrders(prev => [...prev, { ...orderToRestore, status: 'Ready to Ship' }]);
          }
        } else {
          const deletedShipment = shipments.find(s => s.id === Number(id));
          await shipmentsApi.delete(Number(id));
          // Optimistic update: remove from shipments list
          setShipments(prev => prev.filter(s => s.id !== Number(id)));
          // If the order should go back to ready state
          if (deletedShipment?.order_id) {
            const orderToRestore = allOrdersList.find(o => o.id === deletedShipment.order_id);
            if (orderToRestore) {
              setReadyOrders(prev => [...prev, { ...orderToRestore, status: 'Ready to Ship' }]);
              setAllOrdersList(prev => prev.map(o => o.id === deletedShipment.order_id ? { ...o, status: 'Ready to Ship' } : o));
            }
          }
        }
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

      {/* Comprehensive Filter Toolbar */}
      <div className="bg-white border border-[#c3c4c7] p-3.5 shadow-xs rounded-sm space-y-3">
        {/* Row 1: Status Filter Pills based on active tab + Quick Clear Button */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#50575e] uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-[#2271b1]" />
              <span>Status:</span>
            </span>

            {activeTab === 'ready' ? (
              <>
                <button
                  onClick={() => setSelectedReadyStatus('All')}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border ${selectedReadyStatus === 'All'
                    ? 'bg-[#2271b1] text-white border-[#135e96] shadow-xs'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  All Ready ({readyOrders.filter(o => isAllowedCompany(o.company)).length})
                </button>

                <button
                  onClick={() => setSelectedReadyStatus(selectedReadyStatus === 'Ready to Ship' ? 'All' : 'Ready to Ship')}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedReadyStatus === 'Ready to Ship'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready to Ship</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedReadyStatus === 'Ready to Ship' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'}`}>
                    {readyOrders.filter(o => {
                      if (!isAllowedCompany(o.company)) return false;
                      const pur = purchases.find((p: any) => p.order_id === o.id);
                      const isInStock = (o.order_status || '').toLowerCase() === 'in stock' || o.status === 'In Stock' || Boolean(pur && (pur.notes?.includes('In-Stock') || pur.purchase_partner_name === 'In Stock' || pur.bank === 'In Stock'));
                      const isPurchaseReceived = Boolean(pur && (pur.status === 'Received' || pur.status === 'Completed'));
                      const isPurchasePending = !isInStock && !isPurchaseReceived && (o.status === 'Purchase Pending' || o.status === 'Pending' || (pur && pur.status !== 'Received'));
                      return isPurchaseReceived || (!isInStock && !isPurchasePending);
                    }).length}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedReadyStatus(selectedReadyStatus === 'Purchase Pending' ? 'All' : 'Purchase Pending')}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedReadyStatus === 'Purchase Pending'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Purchase Pending</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedReadyStatus === 'Purchase Pending' ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-800'}`}>
                    {readyOrders.filter(o => {
                      if (!isAllowedCompany(o.company)) return false;
                      const pur = purchases.find((p: any) => p.order_id === o.id);
                      const isInStock = (o.order_status || '').toLowerCase() === 'in stock' || o.status === 'In Stock' || Boolean(pur && (pur.notes?.includes('In-Stock') || pur.purchase_partner_name === 'In Stock' || pur.bank === 'In Stock'));
                      const isPurchaseReceived = Boolean(pur && (pur.status === 'Received' || pur.status === 'Completed'));
                      return !isInStock && !isPurchaseReceived && (o.status === 'Purchase Pending' || o.status === 'Pending' || (pur && pur.status !== 'Received'));
                    }).length}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedReadyStatus(selectedReadyStatus === 'In Stock' ? 'All' : 'In Stock')}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedReadyStatus === 'In Stock'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>In Stock</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedReadyStatus === 'In Stock' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'}`}>
                    {readyOrders.filter(o => {
                      if (!isAllowedCompany(o.company)) return false;
                      const pur = purchases.find((p: any) => p.order_id === o.id);
                      return (o.order_status || '').toLowerCase() === 'in stock' || o.status === 'In Stock' || Boolean(pur && (pur.notes?.includes('In-Stock') || pur.purchase_partner_name === 'In Stock' || pur.bank === 'In Stock'));
                    }).length}
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectedDispatchedStatus('All')}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border ${selectedDispatchedStatus === 'All'
                    ? 'bg-[#2271b1] text-white border-[#135e96] shadow-xs'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  All Dispatched ({shipments.filter(s => isAllowedCompany(s.company)).length})
                </button>

                <button
                  onClick={() => setSelectedDispatchedStatus(selectedDispatchedStatus === 'In Transit' ? 'All' : 'In Transit')}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedDispatchedStatus === 'In Transit'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>In Transit</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedDispatchedStatus === 'In Transit' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'}`}>
                    {shipments.filter(s => isAllowedCompany(s.company) && (s.status || 'In Transit').toLowerCase() === 'in transit').length}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedDispatchedStatus(selectedDispatchedStatus === 'Shipped' ? 'All' : 'Shipped')}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedDispatchedStatus === 'Shipped'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>Shipped</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedDispatchedStatus === 'Shipped' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'}`}>
                    {shipments.filter(s => isAllowedCompany(s.company) && s.status?.toLowerCase() === 'shipped').length}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedDispatchedStatus(selectedDispatchedStatus === 'Delivered' ? 'All' : 'Delivered')}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedDispatchedStatus === 'Delivered'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Delivered</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedDispatchedStatus === 'Delivered' ? 'bg-white text-purple-700' : 'bg-purple-100 text-purple-800'}`}>
                    {shipments.filter(s => isAllowedCompany(s.company) && s.status?.toLowerCase() === 'delivered').length}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#f0f0f1] text-[#d63638] font-bold border border-[#c3c4c7] rounded-xs transition-all shadow-xs text-xs ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Row 2: Secondary Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-2 border-t border-[#e0e0e0]">
          {/* 1. Company Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#2271b1]" />
              <span>Company</span>
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs font-bold text-[#1d2327] outline-none focus:border-[#2271b1] cursor-pointer"
            >
              <option value="All">All Companies ({availableCompanies.length})</option>
              {availableCompanies.map(comp => {
                const count = activeTab === 'ready'
                  ? readyOrders.filter(o => o.company?.toLowerCase() === comp.toLowerCase()).length
                  : shipments.filter(s => {
                    const match = allOrdersList.find((o: any) => o.id === s.order_id);
                    return (s.company || match?.company)?.toLowerCase() === comp.toLowerCase();
                  }).length;
                return (
                  <option key={comp} value={comp}>
                    {comp} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Carrier / Partner Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5 flex items-center gap-1">
              <Truck className="w-3 h-3 text-[#2271b1]" />
              <span>Carrier / Partner</span>
            </label>
            <select
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs font-bold text-[#1d2327] outline-none focus:border-[#2271b1] cursor-pointer"
            >
              <option value="All">All Carriers ({availableCarriers.length})</option>
              {availableCarriers.map(carrier => {
                const count = activeTab === 'ready'
                  ? readyOrders.filter(o => (o.delivery_service || '').toLowerCase() === carrier.toLowerCase()).length
                  : shipments.filter(s => (s.shipment_partner || '').toLowerCase() === carrier.toLowerCase()).length;
                return (
                  <option key={carrier} value={carrier}>
                    {carrier} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Seller Account Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5">Seller Account</label>
            <select
              value={selectedSellerAccount}
              onChange={(e) => setSelectedSellerAccount(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs font-bold text-[#1d2327] outline-none focus:border-[#2271b1] cursor-pointer"
            >
              <option value="All">All Accounts ({availableSellerAccounts.length})</option>
              {availableSellerAccounts.map(acc => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Label Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#2271b1]" />
              <span>Label Status</span>
            </label>
            <select
              value={selectedLabelType}
              onChange={(e) => setSelectedLabelType(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs font-bold text-[#1d2327] outline-none focus:border-[#2271b1] cursor-pointer"
            >
              <option value="All">All Labels</option>
              <option value="free">✓ Free Label Only</option>
              <option value="paid">💵 Paid Label Only</option>
            </select>
          </div>

          {/* 5. Date Field Type */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#2271b1]" />
              <span>Filter Date By</span>
            </label>
            <select
              value={dateFieldType}
              onChange={(e) => setDateFieldType(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs font-bold text-[#1d2327] outline-none focus:border-[#2271b1] cursor-pointer"
            >
              <option value="process_date">Order Process Date</option>
              <option value="shipping_date">Shipping Date</option>
              <option value="last_delivery_date">Last Delivery Date</option>
              <option value="arriving_date">Arriving Date</option>
            </select>
          </div>

          {/* 6. Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#8c8f94] rounded-xs text-xs font-medium outline-none focus:border-[#2271b1]"
            />
          </div>

          {/* 7. End Date */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#8c8f94] rounded-xs text-xs font-medium outline-none focus:border-[#2271b1]"
            />
          </div>
        </div>

        {/* Row 3: Quick Date Preset Pills & Live Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#e0e0e0]">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[10px] font-bold text-[#50575e] uppercase tracking-wider mr-1">Presets:</span>
            <button
              onClick={() => setQuickDate('today')}
              className="px-2 py-0.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs text-[11px] transition-all"
            >
              Today
            </button>
            <button
              onClick={() => setQuickDate('yesterday')}
              className="px-2 py-0.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs text-[11px] transition-all"
            >
              Yesterday
            </button>
            <button
              onClick={() => setQuickDate('7days')}
              className="px-2 py-0.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs text-[11px] transition-all"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setQuickDate('month')}
              className="px-2 py-0.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs text-[11px] transition-all"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickDate('all')}
              className="px-2 py-0.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs text-[11px] transition-all"
            >
              All Time
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#50575e] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search order #, AWB, forwarding #, carrier, product, buyer..."
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
        </div>

        {/* Row 4: Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#f0f0f1] text-[11px]">
            <span className="font-bold text-[#50575e]">Active Filters:</span>
            {selectedCompany !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xs font-medium">
                Company: <b>{selectedCompany}</b>
                <button onClick={() => setSelectedCompany('All')} className="hover:text-blue-950 font-bold ml-0.5">×</button>
              </span>
            )}
            {selectedCarrier !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-900 border border-orange-200 rounded-xs font-medium">
                Carrier: <b>{selectedCarrier}</b>
                <button onClick={() => setSelectedCarrier('All')} className="hover:text-orange-950 font-bold ml-0.5">×</button>
              </span>
            )}
            {activeTab === 'ready' && selectedReadyStatus !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xs font-medium">
                Status: <b>{selectedReadyStatus}</b>
                <button onClick={() => setSelectedReadyStatus('All')} className="hover:text-indigo-950 font-bold ml-0.5">×</button>
              </span>
            )}
            {activeTab === 'dispatched' && selectedDispatchedStatus !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-xs font-medium">
                Status: <b>{selectedDispatchedStatus}</b>
                <button onClick={() => setSelectedDispatchedStatus('All')} className="hover:text-purple-950 font-bold ml-0.5">×</button>
              </span>
            )}
            {selectedSellerAccount !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-900 border border-slate-300 rounded-xs font-medium">
                Account: <b>{selectedSellerAccount}</b>
                <button onClick={() => setSelectedSellerAccount('All')} className="hover:text-slate-950 font-bold ml-0.5">×</button>
              </span>
            )}
            {selectedLabelType !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xs font-medium">
                Label: <b>{selectedLabelType === 'free' ? 'Free Label' : 'Paid Label'}</b>
                <button onClick={() => setSelectedLabelType('All')} className="hover:text-emerald-950 font-bold ml-0.5">×</button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xs font-medium">
                Date: <b>{startDate || 'Start'} to {endDate || 'End'}</b>
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-amber-950 font-bold ml-0.5">×</button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-900 border border-slate-300 rounded-xs font-medium">
                Search: <b>&quot;{searchQuery}&quot;</b>
                <button onClick={() => setSearchQuery('')} className="hover:text-slate-950 font-bold ml-0.5">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* WP Admin Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c3c4c7] pb-2">
        <div className="flex items-center gap-2">
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

        {/* Column Visibility Manager */}
        <div>
          {activeTab === 'ready' ? (
            <ColumnVisibilityDropdown
              columns={READY_TABLE_COLUMNS}
              visibleColumns={visibleColumnsReady}
              onChange={setVisibleColumnsReady}
              presets={READY_COLUMN_PRESETS}
              storageKey="crm_shipments_ready_column_visibility"
            />
          ) : (
            <ColumnVisibilityDropdown
              columns={DISPATCHED_TABLE_COLUMNS}
              visibleColumns={visibleColumnsDispatched}
              onChange={setVisibleColumnsDispatched}
              presets={DISPATCHED_COLUMN_PRESETS}
              storageKey="crm_shipments_dispatched_column_visibility"
            />
          )}
        </div>
      </div>

      {/* TAB 1: Orders Ready to Ship */}
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
                      {visibleColumnsReady['order_process_date'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Process Date</th>}
                      {visibleColumnsReady['shipping_date'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipping Date</th>}
                      {visibleColumnsReady['last_delivery_date'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Last Delivery Date</th>}
                      {visibleColumnsReady['arriving_date'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Arrive Date</th>}
                      {visibleColumnsReady['order_number'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Order ID</th>}
                      {visibleColumnsReady['po_number'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">PO</th>}
                      {visibleColumnsReady['shipment_id'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipment No</th>}
                      {visibleColumnsReady['company'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Company</th>}
                      {visibleColumnsReady['seller_account'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Partner / Seller</th>}
                      {visibleColumnsReady['product_name'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[200px]">Product Name</th>}
                      {visibleColumnsReady['qty'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Qty</th>}
                      {visibleColumnsReady['consignee_name'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Consignee Name</th>}
                      {visibleColumnsReady['shipment_address_1'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[160px]">Address Line 1</th>}
                      {visibleColumnsReady['shipment_address_2'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[140px]">Address Line 2</th>}
                      {visibleColumnsReady['city'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">City</th>}
                      {visibleColumnsReady['state'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">State</th>}
                      {visibleColumnsReady['zip_code'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Zip Code</th>}
                      {visibleColumnsReady['mobile_number'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Contact Number</th>}
                      {visibleColumnsReady['country'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Country</th>}
                      {visibleColumnsReady['status'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Status</th>}
                      {visibleColumnsReady['actions'] !== false && <th className="py-2.5 px-3 text-right">Actions</th>}
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
                          {visibleColumnsReady['order_process_date'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#50575e]">{ord.order_process_date || ord.order_date || '—'}</td>}
                          {visibleColumnsReady['shipping_date'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">{ord.shipping_date || '—'}</td>}
                          {visibleColumnsReady['last_delivery_date'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">{ord.last_delivery_date || '—'}</td>}
                          {visibleColumnsReady['arriving_date'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">{ord.arriving_date || pur?.estimated_shipment_date || '—'}</td>}
                          {visibleColumnsReady['order_number'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-bold text-[#2271b1]">{ord.order_number}</td>}
                          {visibleColumnsReady['po_number'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[11px] font-bold text-[#1d2327]">{pur?.po_number || '—'}</td>}
                          {visibleColumnsReady['shipment_id'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-semibold text-[#2271b1]">{ord.shipment_id || ord.oi || '—'}</td>}
                          {visibleColumnsReady['company'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">{ord.company || 'ADBH'}</td>}
                          {visibleColumnsReady['seller_account'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#2271b1]">{ord.seller_account || ord.account_name || pur?.purchase_partner_name || '—'}</td>}
                          {visibleColumnsReady['product_name'] !== false && (
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
                          )}
                          {visibleColumnsReady['qty'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center font-bold text-[#1d2327]">{ord.qty || 1}</td>}
                          {visibleColumnsReady['consignee_name'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">{ord.consignee_name || ord.buyer_name || '—'}</td>}
                          {visibleColumnsReady['shipment_address_1'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#50575e] max-w-[160px] truncate" title={ord.shipment_address_1}>{ord.shipment_address_1 || '—'}</td>}
                          {visibleColumnsReady['shipment_address_2'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#50575e] max-w-[140px] truncate" title={ord.shipment_address_2}>{ord.shipment_address_2 || '—'}</td>}
                          {visibleColumnsReady['city'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#1d2327] font-medium">{ord.city || '—'}</td>}
                          {visibleColumnsReady['state'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#1d2327] font-medium">{ord.state || '—'}</td>}
                          {visibleColumnsReady['zip_code'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#1d2327]">{ord.zip_code || '—'}</td>}
                          {visibleColumnsReady['mobile_number'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#1d2327]">
                              {ord.mobile_number ? (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5 text-[#2271b1]" />
                                  <span>{ord.mobile_number}</span>
                                </span>
                              ) : '—'}
                            </td>
                          )}
                          {visibleColumnsReady['country'] !== false && <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">{ord.country || 'USA'}</td>}

                          {/* STATUS Column */}
                          {visibleColumnsReady['status'] !== false && (
                            <td className="py-2 px-3 border-r border-[#e0e0e0] text-center">
                              <div className="inline-flex items-center justify-center gap-1.5">
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
                                <button
                                  type="button"
                                  onClick={() => openEditPurchaseModal(ord)}
                                  className="px-1.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-[#c3c4c7] font-semibold text-[10px] rounded-xs shadow-2xs inline-flex items-center gap-1 transition-all"
                                  title="Edit purchase / in-stock status"
                                >
                                  <Edit2 className="w-2.5 h-2.5 text-slate-500" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </td>
                          )}

                          {/* ACTIONS Column */}
                          {visibleColumnsReady['actions'] !== false && (
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
                          )}
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
                      {visibleColumnsDispatched['carrier_partner'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Carrier Partner</th>}
                      {visibleColumnsDispatched['awb_tracking'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">AWB / Tracking</th>}
                      {visibleColumnsDispatched['forwarding_number'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Forwarding #</th>}
                      {visibleColumnsDispatched['shipping_date'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipping Date</th>}
                      {visibleColumnsDispatched['last_delivery_date'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Last Delivery Date</th>}
                      {visibleColumnsDispatched['arriving_date'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Arrive Date</th>}
                      {visibleColumnsDispatched['order_number'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Order ID</th>}
                      {visibleColumnsDispatched['po_number'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">PO</th>}
                      {visibleColumnsDispatched['shipment_id'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipment No</th>}
                      {visibleColumnsDispatched['product_name'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[200px]">Product Name</th>}
                      {visibleColumnsDispatched['qty'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Qty</th>}
                      {visibleColumnsDispatched['consignee_name'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Consignee Name</th>}
                      {visibleColumnsDispatched['shipment_address_1'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[160px]">Address Line 1</th>}
                      {visibleColumnsDispatched['shipment_address_2'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[140px]">Address Line 2</th>}
                      {visibleColumnsDispatched['city'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">City</th>}
                      {visibleColumnsDispatched['state'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">State</th>}
                      {visibleColumnsDispatched['zip_code'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Zip Code</th>}
                      {visibleColumnsDispatched['mobile_number'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Contact Number</th>}
                      {visibleColumnsDispatched['country'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Country</th>}
                      {visibleColumnsDispatched['weight'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Weight (kg / oz)</th>}
                      {visibleColumnsDispatched['dimensions'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Dimensions (cm)</th>}
                      {visibleColumnsDispatched['vol_wt'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Vol. Wt (kg)</th>}
                      {visibleColumnsDispatched['cost_breakdown'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Cost Breakdown</th>}
                      {visibleColumnsDispatched['total_cost'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Total Cost (₹)</th>}
                      {visibleColumnsDispatched['forwarding_id'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7] whitespace-nowrap">Forwarding ID</th>}
                      {visibleColumnsDispatched['status'] !== false && <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Status</th>}
                      {visibleColumnsDispatched['actions'] !== false && <th className="py-2.5 px-3 text-right">Actions</th>}
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
                          {visibleColumnsDispatched['carrier_partner'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">
                              <span className={`px-2 py-0.5 rounded-xs border font-bold text-[10px] ${isRbs ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-orange-100 text-orange-900 border-orange-300'}`}>
                                {ship.shipment_partner}
                              </span>
                            </td>
                          )}
                          {visibleColumnsDispatched['awb_tracking'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-bold text-[#2271b1]">
                              {ship.awb_number || ship.tracking_id}
                            </td>
                          )}
                          {visibleColumnsDispatched['forwarding_number'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#50575e] font-semibold">
                              {ship.forwarding_number || '—'}
                            </td>
                          )}
                          {visibleColumnsDispatched['shipping_date'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">
                              {shippingDate}
                            </td>
                          )}
                          {visibleColumnsDispatched['last_delivery_date'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">
                              {lastDeliveryDate}
                            </td>
                          )}
                          {visibleColumnsDispatched['arriving_date'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">
                              {arriveDate}
                            </td>
                          )}
                          {visibleColumnsDispatched['order_number'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-bold text-[#2271b1]">
                              {orderId}
                            </td>
                          )}
                          {visibleColumnsDispatched['po_number'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[11px] font-bold text-[#1d2327]">
                              {pur?.po_number || '—'}
                            </td>
                          )}
                          {visibleColumnsDispatched['shipment_id'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-semibold text-[#2271b1]">
                              {shipmentId}
                            </td>
                          )}
                          {visibleColumnsDispatched['product_name'] !== false && (
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
                          )}
                          {visibleColumnsDispatched['qty'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center font-bold text-[#1d2327]">
                              {qty}
                            </td>
                          )}
                          {visibleColumnsDispatched['consignee_name'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">
                              {consignee}
                            </td>
                          )}
                          {visibleColumnsDispatched['shipment_address_1'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#50575e] max-w-[160px] truncate" title={addr1}>
                              {addr1}
                            </td>
                          )}
                          {visibleColumnsDispatched['shipment_address_2'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#50575e] max-w-[140px] truncate" title={addr2}>
                              {addr2}
                            </td>
                          )}
                          {visibleColumnsDispatched['city'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#1d2327] font-medium">
                              {city}
                            </td>
                          )}
                          {visibleColumnsDispatched['state'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-[#1d2327] font-medium">
                              {state}
                            </td>
                          )}
                          {visibleColumnsDispatched['zip_code'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#1d2327]">
                              {zipCode}
                            </td>
                          )}
                          {visibleColumnsDispatched['mobile_number'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#1d2327]">
                              {mobile !== '—' ? (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5 text-[#2271b1]" />
                                  <span>{mobile}</span>
                                </span>
                              ) : '—'}
                            </td>
                          )}
                          {visibleColumnsDispatched['country'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">
                              {country}
                            </td>
                          )}
                          {visibleColumnsDispatched['weight'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono">
                              <span className="font-bold text-[#1d2327]">{ship.weight} kg</span>
                              <span className="text-[10px] text-blue-700 font-semibold block">({shipOz} oz)</span>
                            </td>
                          )}
                          {visibleColumnsDispatched['dimensions'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#50575e]">
                              {ship.dimensions || (ship.length && ship.width && ship.height ? `${ship.length} × ${ship.width} × ${ship.height} cm` : '—')}
                            </td>
                          )}
                          {visibleColumnsDispatched['vol_wt'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#2271b1] font-semibold">
                              {volWtVal !== '—' ? `${volWtVal} kg` : '—'}
                            </td>
                          )}
                          {visibleColumnsDispatched['cost_breakdown'] !== false && (
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
                                  {(ship.label_free || matchingOrder?.label_free) ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                                      <span>Label:</span>
                                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-2xs text-[9px] uppercase font-mono tracking-wider">Free Label</span>
                                    </span>
                                  ) : ship.label_cost_usd > 0 ? (
                                    <span className="text-emerald-800 font-semibold">
                                      Label: ${ship.label_cost_usd.toFixed(2)} <span className="text-slate-600 font-normal">(₹{(ship.label_cost_inr || (ship.label_cost_usd * (ship.exchange_rate || 99.0))).toFixed(2)})</span>
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span>Shipping: <b>₹{(ship.shipment_cost || 0).toFixed(2)}</b></span>
                              )}
                            </td>
                          )}
                          {visibleColumnsDispatched['total_cost'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-emerald-700">
                              ₹{(ship.shipment_cost || 0).toFixed(2)}
                            </td>
                          )}
                          {visibleColumnsDispatched['forwarding_id'] !== false && (
                            <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono">
                              {(() => {
                                const fwd = ship.forwarding_number || matchingOrder?.label_tracking_id;
                                const trk = ship.awb_number || ship.tracking_id;
                                if (fwd && trk && fwd !== trk) {
                                  return (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-[#1d2327] text-xs" title="Forwarding ID">{fwd}</span>
                                      <span className="text-[10px] text-[#2271b1] font-semibold" title="AWB / Tracking Number">{trk}</span>
                                    </div>
                                  );
                                }
                                const val = fwd || trk;
                                return val ? (
                                  <span className="font-bold text-[#1d2327] text-xs">{val}</span>
                                ) : (
                                  <span className="text-[#8c8f94]">—</span>
                                );
                              })()}
                            </td>
                          )}
                          {visibleColumnsDispatched['status'] !== false && (
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
                                <option value="Shipped" className="bg-white text-blue-900 font-bold">Shipped</option>
                                <option value="Delivered" className="bg-white text-purple-900 font-bold">Delivered</option>
                              </select>
                            </td>
                          )}
                          {visibleColumnsDispatched['actions'] !== false && (
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
                          )}
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

                {/* If order has label PDF, show download link and free badge */}
                {shipmentForm.shipment_partner !== 'Shiprocket' && selectedOrder?.label_pdf_url && (
                  <div className="flex items-center justify-between p-2.5 rounded-xs border bg-indigo-50 border-indigo-200">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-700 shrink-0">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>Attached Label PDF:</span>
                      </div>
                      {selectedOrder.label_free ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] rounded-xs uppercase tracking-wider">
                          Free Label
                        </span>
                      ) : selectedOrder.label_cost_usd > 0 ? (
                        <span className="text-[11px] font-mono font-bold text-indigo-900">
                          (${selectedOrder.label_cost_usd.toFixed(2)})
                        </span>
                      ) : null}
                    </div>
                    <a
                      href={`/backend-api/orders/${selectedOrder.id}/download-label?download=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`${selectedOrder.label_tracking_id || selectedOrder.order_number || 'label'} - ${selectedOrder.product_name}.pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xs transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Label PDF</span>
                    </a>
                  </div>
                )}

                {/* RBS Online Specific Costs: Domestic (₹), International (₹) + Dump ($ -> ₹) + Label ($ -> ₹) */}
                {shipmentForm.shipment_partner === 'RBS Online' && (() => {
                  const domInr = parseFloat(String(shipmentForm.domestic_cost)) || 0;
                  const intlInr = parseFloat(String(shipmentForm.international_cost)) || 0;
                  const dumpUsd = parseFloat(String(shipmentForm.dump_cost)) || 0;
                  const labelUsd = shipmentForm.label_free ? 0 : (parseFloat(String(shipmentForm.label_cost_usd)) || 0);
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
                              {!shipmentForm.label_free && (
                                <span className="text-[10px] font-bold text-emerald-800 font-mono">
                                  = ₹{labelInr.toFixed(2)} INR
                                </span>
                              )}
                            </label>
                            {shipmentForm.label_free ? (
                              <div className="w-full bg-emerald-50/90 border border-emerald-300 px-3 py-1.5 font-bold font-mono text-emerald-800 text-xs rounded-xs flex items-center justify-between">
                                <span>Free Label</span>
                                <span className="text-[9px] font-extrabold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-xs uppercase tracking-wider">Free Label</span>
                              </div>
                            ) : (
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
                            )}
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

      {/* WP Meta-Box Edit Purchase & Stock Modal */}
      {showEditPurchaseModal && selectedOrderForPurchaseEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl rounded-sm font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#1d2327] text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-[#2c3338]">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#72aee6]" />
                <span>
                  Edit Purchase & Stock Status (Order #{selectedOrderForPurchaseEdit.order_number || selectedOrderForPurchaseEdit.id})
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditPurchaseModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSavePurchaseEdit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Item Details Summary Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-[200px]">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Product Name</div>
                    <div className="text-xs font-bold text-slate-900 truncate max-w-md" title={selectedOrderForPurchaseEdit.product_name}>
                      {selectedOrderForPurchaseEdit.product_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Company</span>
                      <span className="font-semibold text-slate-900">{selectedOrderForPurchaseEdit.company || 'ADBH'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Qty</span>
                      <span className="font-bold text-slate-900">{purchaseEditForm.qty} unit(s)</span>
                    </div>
                  </div>
                </div>

                {/* Purchase Mode Switcher */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
                    Vendor Name:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPurchaseEditForm(prev => ({
                        ...prev,
                        is_in_stock: false,
                        purchase_partner_name: (prev.purchase_partner_name === 'In Stock' || !prev.purchase_partner_name)
                          ? (selectedOrderForPurchaseEdit?.seller_account || selectedOrderForPurchaseEdit?.account_name || '')
                          : prev.purchase_partner_name,
                        notes: prev.notes?.toLowerCase().includes('in-stock') ? '' : prev.notes
                      }))}
                      className={`p-3 text-left border rounded-xs transition-all flex items-start gap-2.5 ${!purchaseEditForm.is_in_stock
                        ? 'border-[#2271b1] bg-blue-50/60 ring-1 ring-[#2271b1]'
                        : 'border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                    >
                      <div className={`p-1.5 rounded-full ${!purchaseEditForm.is_in_stock ? 'bg-[#2271b1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">Purchase</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurchaseEditForm(prev => ({
                        ...prev,
                        is_in_stock: true,
                        purchase_partner_name: 'In Stock',
                        notes: prev.notes || 'In-Stock Order'
                      }))}
                      className={`p-3 text-left border rounded-xs transition-all flex items-start gap-2.5 ${purchaseEditForm.is_in_stock
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                        : 'border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                    >
                      <div className={`p-1.5 rounded-full ${purchaseEditForm.is_in_stock ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <PackageCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">In-Stock</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Form Fields: In-Stock Mode */}
                {purchaseEditForm.is_in_stock ? (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xs space-y-3">
                    {/* <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>In-Stock Fulfillment Active</span>
                    </div> */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Quantity (Qty) <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={purchaseEditForm.qty || 1}
                          onChange={(e) => setPurchaseEditForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                          placeholder="1"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#c3c4c7] rounded-xs text-xs font-bold text-slate-900 outline-none focus:border-[#2271b1]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Purchase Price (INR ₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={purchaseEditForm.purchase_value === 0 ? '' : purchaseEditForm.purchase_value}
                            onChange={(e) => setPurchaseEditForm(prev => ({ ...prev, purchase_value: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-[#c3c4c7] rounded-xs text-xs font-bold text-slate-900 outline-none focus:border-[#2271b1]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Form Fields: Vendor Purchase Mode */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Purchase Value / Cost (INR ₹) <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={purchaseEditForm.purchase_value || ''}
                            onChange={(e) => setPurchaseEditForm(prev => ({ ...prev, purchase_value: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="w-full pl-7 pr-2.5 py-1.5 border border-[#c3c4c7] rounded-xs text-xs font-bold text-slate-900 outline-none focus:border-[#2271b1]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Vendor / Supplier Name <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={purchaseEditForm.purchase_partner_name}
                          onChange={(e) => setPurchaseEditForm(prev => ({ ...prev, purchase_partner_name: e.target.value }))}
                          placeholder="Supplier Name or Partner"
                          className="w-full px-2.5 py-1.5 border border-[#c3c4c7] rounded-xs text-xs outline-none focus:border-[#2271b1]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">PO Number</label>
                        <input
                          type="text"
                          value={purchaseEditForm.po_number}
                          onChange={(e) => setPurchaseEditForm(prev => ({ ...prev, po_number: e.target.value }))}
                          placeholder="e.g. PO1234"
                          className="w-full px-2.5 py-1.5 border border-[#c3c4c7] rounded-xs text-xs font-mono outline-none focus:border-[#2271b1]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Delivery / Tracking Code</label>
                        <input
                          type="text"
                          value={purchaseEditForm.delivery_code}
                          onChange={(e) => setPurchaseEditForm(prev => ({ ...prev, delivery_code: e.target.value }))}
                          placeholder="Carrier code or OI"
                          className="w-full px-2.5 py-1.5 border border-[#c3c4c7] rounded-xs text-xs font-mono outline-none focus:border-[#2271b1]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Arrived / Delivery Date</label>
                        <input
                          type="date"
                          value={purchaseEditForm.estimated_shipment_date}
                          onChange={(e) => setPurchaseEditForm(prev => ({ ...prev, estimated_shipment_date: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-[#c3c4c7] rounded-xs text-xs outline-none focus:border-[#2271b1]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={purchaseEditForm.notes}
                        onChange={(e) => setPurchaseEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional purchase notes..."
                        className="w-full px-2.5 py-1.5 border border-[#c3c4c7] rounded-xs text-xs outline-none focus:border-[#2271b1]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="px-5 py-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRevertPurchase}
                  disabled={revertingPurchase}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-xs flex items-center gap-1.5 text-xs transition-colors shadow-2xs disabled:opacity-50"
                  title="Remove from Shipment and send back to Orders queue as Pending Purchase"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>{revertingPurchase ? 'Reverting...' : 'Revert to Not Purchased'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditPurchaseModal(false)}
                    className="px-4 py-1.5 bg-white hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs transition-colors shadow-xs text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPurchaseEdit}
                    className="px-5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold rounded-xs shadow-xs transition-colors flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingPurchaseEdit ? 'Saving...' : 'Save Purchase Changes'}</span>
                  </button>
                </div>
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

                {/* If order has label PDF, show download link and free badge */}
                {shipmentForm.shipment_partner !== 'Shiprocket' && (() => {
                  const editOrder = allOrdersList.find((o: any) => o.id === shipmentForm.order_id);
                  if (!editOrder?.label_pdf_url) return null;
                  return (
                    <div className="flex items-center justify-between p-2.5 rounded-xs border bg-indigo-50 border-indigo-200">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-700 shrink-0">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>Attached Label PDF:</span>
                        </div>
                        {editOrder.label_free ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] rounded-xs uppercase tracking-wider">
                            Free Label
                          </span>
                        ) : editOrder.label_cost_usd > 0 ? (
                          <span className="text-[11px] font-mono font-bold text-indigo-900">
                            (${editOrder.label_cost_usd.toFixed(2)})
                          </span>
                        ) : null}
                      </div>
                      <a
                        href={`/backend-api/orders/${editOrder.id}/download-label?download=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={`${editOrder.label_tracking_id || editOrder.order_number || 'label'} - ${editOrder.product_name}.pdf`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xs transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Label PDF</span>
                      </a>
                    </div>
                  );
                })()}

                {/* RBS Online Specific Costs: Domestic (₹), International (₹) + Dump ($ -> ₹) + Label ($ -> ₹) */}
                {shipmentForm.shipment_partner === 'RBS Online' && (() => {
                  const domInr = parseFloat(String(shipmentForm.domestic_cost)) || 0;
                  const intlInr = parseFloat(String(shipmentForm.international_cost)) || 0;
                  const dumpUsd = parseFloat(String(shipmentForm.dump_cost)) || 0;
                  const labelUsd = shipmentForm.label_free ? 0 : (parseFloat(String(shipmentForm.label_cost_usd)) || 0);
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
                              {!shipmentForm.label_free && (
                                <span className="text-[10px] font-bold text-emerald-800 font-mono">
                                  = ₹{labelInr.toFixed(2)} INR
                                </span>
                              )}
                            </label>
                            {shipmentForm.label_free ? (
                              <div className="w-full bg-emerald-50/90 border border-emerald-300 px-3 py-1.5 font-bold font-mono text-emerald-800 text-xs rounded-xs flex items-center justify-between">
                                <span>Free Label</span>
                                <span className="text-[9px] font-extrabold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-xs uppercase tracking-wider">Free Label</span>
                              </div>
                            ) : (
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
                            )}
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
