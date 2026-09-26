'use client';

import React, { useEffect, useState } from 'react';
import { purchasesApi, ordersApi, inventoryApi, authApi, getImageUrl } from '@/lib/api';
import { ShoppingBag, CheckCircle, Clock, PackageCheck, Edit2, Trash2, ShieldAlert, Plus, Layers, DollarSign, Truck, FileText, UserCheck, Calendar, StickyNote, CreditCard, Tag, ExternalLink, RotateCcw, ChevronLeft, ChevronRight, Search, X, Landmark, Barcode, Receipt, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import ResizableTable from '@/components/ResizableTable';
import { hasPermission, getAllowedCompanies } from '@/lib/permissions';

export default function PurchasesPage() {

  const [activeTab, setActiveTab] = useState<'pending' | 'purchases'>('pending');

  const [orders, setOrders] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    order_id: 0,
    order_number: '',
    order_date: '',
    product_name: '',
    sku: '',
    gst_type: 'GST',
    bank: '',
    po_number: '',
    purchase_value: 0,
    other_cost: 0,
    extra_cost: 0,
    delivery_code: '',
    estimated_shipment_date: new Date().toISOString().split('T')[0],
    account_name: '',
    purchase_partner_name: '',
    payment_status: 'Paid',
    notes: '',
    company: 'ADBH',
    qty: 1,
    direct_to_shipment: true,
    is_in_stock: false,
  });

  // Multi-product items state for per-item purchase management
  interface PurchaseItem {
    id: string;
    product_name: string;
    product_url?: string;
    product_image?: string;
    qty: number;
    price_usd: number;
    is_in_stock: boolean;
    company: string;
    purchase_value: number | '';
    purchase_partner_name: string;
    sku: string;
    delivery_code: string;
    estimated_shipment_date: string;
    notes: string;
  }
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [isMultiProduct, setIsMultiProduct] = useState(false);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination states for tabs
  const [currentPagePending, setCurrentPagePending] = useState<number>(1);
  const [currentPagePurchases, setCurrentPagePurchases] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPagePending(1);
    setCurrentPagePurchases(1);
  }, [startDate, endDate, searchQuery, pageSize]);

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

  const getDuePurchaseDate = (lastDeliveryDateStr?: string | null, shippingDateStr?: string | null) => {
    const refDateStr = lastDeliveryDateStr || shippingDateStr;
    if (!refDateStr) return null;
    try {
      const deliveryDate = new Date(refDateStr);
      if (isNaN(deliveryDate.getTime())) return null;

      // Purchase Due Date is strictly 5 days before Last Delivery Date
      const dueDate = new Date(deliveryDate);
      dueDate.setDate(dueDate.getDate() - 5);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueDay = new Date(dueDate);
      dueDay.setHours(0, 0, 0, 0);

      const diffTime = dueDay.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Do NOT show if purchase deadline is still far in the future (> 5 days before delivery)
      if (diffDays > 0) {
        return null;
      }

      const dayStr = String(dueDate.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = monthNames[dueDate.getMonth()];
      const yearStr = dueDate.getFullYear();
      const formatted = `${dayStr} ${monthStr} ${yearStr}`;

      return {
        dateStr: dueDate.toISOString().split('T')[0],
        formatted,
        daysLeft: diffDays,
        isOverdue: diffDays < 0,
        isToday: diffDays === 0,
      };
    } catch {
      return null;
    }
  };

  // Filter orders waiting for purchase action (Step 1 - Pending Purchase Entry):
  const purOrderIds = new Set(purchases.map(p => String(p.order_id)));
  const pendingOrders = orders
    .filter(o => isAllowedCompany(o.company))
    .filter(o => !purOrderIds.has(String(o.id)));
  const userPurchases = purchases
    .filter(p => isAllowedCompany(p.company));

  // Date Filtering Helper
  const isDateInRange = (dateStr: string | null | undefined) => {
    if (!dateStr) return true;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (itemDate < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (itemDate > e) return false;
    }
    return true;
  };

  const matchesSearch = (item: any, fields: string[]) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return fields.some(f => {
      const val = item[f];
      return val && String(val).toLowerCase().includes(q);
    });
  };

  // Date and Search Filtered Datasets
  const dateFilteredPendingOrders = pendingOrders
    .filter(o => isDateInRange(o.order_process_date || o.order_date || o.created_at))
    .filter(o => matchesSearch(o, ['order_number', 'product_name', 'buyer_name', 'company', 'account_name', 'oi', 'shipment_id']));

  const dateFilteredPurchases = userPurchases
    .filter(p => isDateInRange(p.order_date || p.created_at))
    .filter(p => matchesSearch(p, ['order_number', 'product_name', 'delivery_code', 'company', 'purchase_partner_name', 'account_name', 'notes']));

  // Paginated Datasets
  const paginatedPendingOrders = dateFilteredPendingOrders.slice((currentPagePending - 1) * pageSize, currentPagePending * pageSize);
  const paginatedPurchases = dateFilteredPurchases.slice((currentPagePurchases - 1) * pageSize, currentPagePurchases * pageSize);

  const openPurchaseModal = (order: any, isInStock: boolean = false) => {
    setSelectedOrder(order);
    const matchedInv = inventoryList.find((item: any) =>
      (order.product_id && item.id === order.product_id) ||
      (item.product_name && order.product_name && item.product_name.toLowerCase() === order.product_name.toLowerCase())
    );

    // Parse product_items to check for multi-product orders
    let parsedItems: any[] = [];
    try {
      if (order.product_items) {
        const parsed = typeof order.product_items === 'string' ? JSON.parse(order.product_items) : order.product_items;
        if (Array.isArray(parsed) && parsed.length > 1) {
          parsedItems = parsed;
        }
      }
    } catch (e) {}

    if (parsedItems.length > 1) {
      // Multi-product order: create per-item entries
      setIsMultiProduct(true);
      const existingPurs = purchases.filter((p: any) => p.order_id === order.id);
      const items: PurchaseItem[] = parsedItems.map((p: any, idx: number) => {
        const itemInv = inventoryList.find((inv: any) =>
          (p.product_id && inv.id === p.product_id) ||
          (inv.product_name && p.product_name && inv.product_name.toLowerCase() === p.product_name.toLowerCase())
        );
        const inStockQty = itemInv?.stock_quantity || 0;

        const matchedPur = existingPurs.find((ep: any) =>
          ep.product_name && p.product_name &&
          (ep.product_name.toLowerCase() === p.product_name.toLowerCase() ||
           ep.product_name.toLowerCase().includes(p.product_name.toLowerCase().substring(0, 15)) ||
           p.product_name.toLowerCase().includes(ep.product_name.toLowerCase().substring(0, 15)))
        ) || existingPurs[idx];

        const itemStatus = (p.order_status || '').trim();
        const isStatusInStock = itemStatus.toLowerCase() === 'in stock' || itemStatus.toLowerCase() === 'instock';

        let isItemStock = false;
        if (matchedPur) {
          isItemStock = Boolean(
            matchedPur.is_in_stock ||
            matchedPur.purchase_partner_name === 'In Stock' ||
            matchedPur.bank === 'In Stock' ||
            matchedPur.notes?.includes('In-Stock')
          );
        } else if (itemStatus) {
          isItemStock = isStatusInStock;
        } else {
          const ordStatus = (order.order_status || '').trim().toLowerCase();
          isItemStock = isInStock || ordStatus === 'in stock' || ordStatus === 'instock' || inStockQty >= (p.qty || 1);
        }

        const itemCompany = matchedPur?.company || (
          !isStatusInStock && itemStatus
            ? itemStatus
            : (order.company || 'ADBH')
        );

        return {
          id: `item_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          product_name: p.product_name || '',
          product_url: p.product_url || '',
          product_image: p.product_image || '',
          qty: p.qty || 1,
          price_usd: p.price_usd || 0,
          is_in_stock: isItemStock,
          company: itemCompany,
          purchase_value: matchedPur ? (matchedPur.purchase_value !== undefined ? matchedPur.purchase_value : '') : (p.purchase_cost_inr || ''),
          purchase_partner_name: matchedPur?.purchase_partner_name || (isItemStock ? 'In-Stock Inventory' : (order.seller_account || order.account_name || 'Aryastore Partner')),
          sku: matchedPur?.sku || itemInv?.sku || '',
          delivery_code: matchedPur?.delivery_code || order.oi || order.shipment_id || '',
          estimated_shipment_date: matchedPur?.estimated_shipment_date || new Date().toISOString().split('T')[0],
          notes: matchedPur?.notes || (isItemStock ? 'In-Stock Order' : ''),
        };
      });
      setPurchaseItems(items);
    } else {
      // Single product order: use standard form
      setIsMultiProduct(false);
      setPurchaseItems([]);
    }

    setPurchaseForm({
      order_id: order.id,
      order_number: order.order_number || `#ORD-${order.id}`,
      order_date: order.order_process_date || order.order_date || new Date().toISOString().split('T')[0],
      product_name: order.product_name || '',
      sku: matchedInv?.sku || '',
      gst_type: 'GST',
      bank: '',
      po_number: '',
      purchase_value: 0,
      other_cost: order.other_cost || 0,
      extra_cost: order.extra_cost || 0,
      delivery_code: order.oi || order.shipment_id || '',
      estimated_shipment_date: new Date().toISOString().split('T')[0],
      account_name: order.account_name || '',
      purchase_partner_name: isInStock ? (order.seller_account || order.account_name || 'In-Stock Inventory') : (order.seller_account || order.account_name || 'Aryastore Partner'),
      payment_status: 'Paid',
      notes: isInStock ? 'In-Stock Purchase Entry' : '',
      company: order.company || 'ADBH',
      qty: order.qty || 1,
      direct_to_shipment: true,
      is_in_stock: isInStock,
    });
    setShowPurchaseModal(true);
  };

  const handleMarkInStock = (order: any) => {
    openPurchaseModal(order, true);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      if (isMultiProduct && purchaseItems.length > 0) {
        // Multi-product: create one purchase entry per item
        let totalPurchaseCostAll = 0;
        let allInStock = true;
        let anyInStock = false;

        for (const item of purchaseItems) {
          const pVal = parseFloat(String(item.purchase_value)) || 0;
          const isStock = Boolean(item.is_in_stock);
          if (isStock) anyInStock = true;
          else allInStock = false;

          if (!isStock && !item.purchase_partner_name?.trim()) {
            alert(`Please enter Vendor/Supplier Name for "${item.product_name}"`);
            return;
          }
          if (!isStock && !item.estimated_shipment_date) {
            alert(`Please enter Arrived Delivery Date for "${item.product_name}"`);
            return;
          }
          totalPurchaseCostAll += pVal;
        }

        // Clean up old purchases for this order
        const existingPurs = purchases.filter((p: any) => p.order_id === selectedOrder.id);
        for (const ep of existingPurs) {
          try {
            await purchasesApi.delete(ep.id);
          } catch (e) {
            console.error('Failed to clean old purchase', e);
          }
        }

        for (const item of purchaseItems) {
          const pVal = parseFloat(String(item.purchase_value)) || 0;
          const isStock = Boolean(item.is_in_stock);
          const purStatus = isStock ? 'Received' : 'Pending';

          await purchasesApi.create({
            order_id: purchaseForm.order_id,
            order_date: purchaseForm.order_date || new Date().toISOString().split('T')[0],
            product_name: item.product_name || 'Item',
            sku: item.sku || null,
            gst_type: purchaseForm.gst_type || 'GST',
            bank: isStock ? 'In Stock' : (purchaseForm.bank || null),
            po_number: purchaseForm.po_number || null,
            purchase_value: pVal,
            other_cost: 0,
            extra_cost: 0,
            delivery_code: item.delivery_code || selectedOrder.oi || null,
            estimated_shipment_date: item.estimated_shipment_date || new Date().toISOString().split('T')[0],
            account_name: purchaseForm.account_name || selectedOrder.account_name || null,
            purchase_partner_name: item.purchase_partner_name?.trim() || (isStock ? 'In Stock' : 'Self / Vendor'),
            payment_status: purchaseForm.payment_status || 'Paid',
            status: purStatus,
            notes: item.notes || (isStock ? 'In-Stock Order' : null),
            company: item.company || purchaseForm.company || selectedOrder.company || 'ADBH',
            qty: parseInt(String(item.qty)) || 1,
          });
        }

        // Update product_items with individual order_status
        let updatedProductItems: any[] = [];
        try {
          if (selectedOrder.product_items) {
            const raw = typeof selectedOrder.product_items === 'string' ? JSON.parse(selectedOrder.product_items) : selectedOrder.product_items;
            if (Array.isArray(raw)) {
              updatedProductItems = raw.map((rawItem: any, idx: number) => {
                const matched = purchaseItems[idx];
                if (matched) {
                  return {
                    ...rawItem,
                    order_status: matched.is_in_stock ? 'in stock' : (matched.company || 'ADBH')
                  };
                }
                return rawItem;
              });
            }
          }
        } catch (e) {}

        const ordStatus = allInStock ? 'In Stock' : (anyInStock ? 'ADBH' : 'Purchase Pending');

        await ordersApi.update(purchaseForm.order_id, {
          purchase_cost_inr: totalPurchaseCostAll,
          oi: purchaseItems.find(it => it.delivery_code)?.delivery_code || selectedOrder.oi,
          product_items: updatedProductItems.length > 0 ? JSON.stringify(updatedProductItems) : selectedOrder.product_items,
          qty: purchaseItems.reduce((sum, it) => sum + (parseInt(String(it.qty)) || 1), 0),
          arriving_date: purchaseItems.find(it => !it.is_in_stock)?.estimated_shipment_date || null,
          status: ordStatus
        });

      } else {
        // Single product: original flow
        const pVal = parseFloat(String(purchaseForm.purchase_value));
        if (isNaN(pVal) || pVal < 0) {
          alert('Please enter a valid Purchase Price / Amount (INR ₹)');
          return;
        }

        if (!purchaseForm.is_in_stock) {
          if (!purchaseForm.purchase_partner_name?.trim()) {
            alert('Please enter the Vendor / Supplier Name');
            return;
          }
          if (!purchaseForm.estimated_shipment_date) {
            alert('Please enter the Arrived Delivery Date');
            return;
          }
        }

        const totalCost = isNaN(pVal) ? 0 : pVal;

        const isStock = Boolean(purchaseForm.is_in_stock);
        const purStatus = isStock ? 'Received' : 'Pending';
        const ordStatus = isStock ? 'In Stock' : 'Purchase Pending';

        await purchasesApi.create({
          order_id: purchaseForm.order_id,
          order_date: purchaseForm.order_date || new Date().toISOString().split('T')[0],
          product_name: purchaseForm.product_name || selectedOrder.product_name || 'Item',
          sku: purchaseForm.sku || null,
          gst_type: purchaseForm.gst_type || 'GST',
          bank: purchaseForm.bank || (isStock ? 'In Stock' : null),
          po_number: purchaseForm.po_number || null,
          purchase_value: totalCost,
          other_cost: 0,
          extra_cost: 0,
          delivery_code: purchaseForm.delivery_code || selectedOrder.oi || null,
          estimated_shipment_date: purchaseForm.estimated_shipment_date || new Date().toISOString().split('T')[0],
          account_name: purchaseForm.account_name || selectedOrder.account_name || null,
          purchase_partner_name: purchaseForm.purchase_partner_name?.trim() || (isStock ? 'In Stock' : 'Self / Vendor'),
          payment_status: purchaseForm.payment_status || 'Paid',
          status: purStatus,
          notes: purchaseForm.notes || (isStock ? 'In-Stock Order' : null),
          company: purchaseForm.company || selectedOrder.company || 'ADBH',
          qty: parseInt(String(purchaseForm.qty)) || selectedOrder.qty || 1,
        });

        await ordersApi.update(purchaseForm.order_id, {
          purchase_cost_inr: totalCost,
          oi: purchaseForm.delivery_code || selectedOrder.oi,
          qty: parseInt(String(purchaseForm.qty)) || selectedOrder.qty || 1,
          arriving_date: purchaseForm.estimated_shipment_date || null,
          status: ordStatus
        });
      }

      setShowPurchaseModal(false);
      setActiveTab('purchases');
      loadAllData();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Error saving purchase entry';
      alert(msg);
    }
  };

  const handlePurchaseDone = async (pur: any) => {
    try {
      await purchasesApi.update(pur.id, { status: 'Received' });
      if (pur.order_id) {
        await ordersApi.update(pur.order_id, { status: 'Ready to Ship' });
      }
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error updating purchase status');
    }
  };

  const handleDeletePurchase = async (id: number) => {
    if (confirm('Delete this purchase record?')) {
      try {
        await purchasesApi.delete(id);
        loadAllData();
      } catch (err) {
        console.error(err);
        alert('Error deleting purchase');
      }
    }
  };

  const isAllowed = hasPermission(currentUser, 'purchases:read');

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center bg-white border border-[#c3c4c7] p-8 max-w-lg mx-auto mt-10 shadow-xs rounded-sm font-sans">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1d2327]">Access Restricted</h2>
        <p className="text-xs text-[#50575e] mt-1">
          You do not have permissions to view Purchase records.
        </p>
      </div>
    );
  }

  // Total Cost preview inside Modal
  const totalPurchaseCost = isMultiProduct && purchaseItems.length > 0
    ? purchaseItems.reduce((sum, item) => sum + (parseFloat(String(item.purchase_value)) || 0), 0)
    : (parseFloat(String(purchaseForm.purchase_value)) || 0);

  // Helper to update a specific purchase item
  const updatePurchaseItem = (itemId: string, updates: Partial<PurchaseItem>) => {
    setPurchaseItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  return (
    <div className="space-y-4 font-sans text-[#2c3338]">

      {/* WP Admin Header */}
      <div className="bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1d2327] tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#2271b1] inline-block rounded-xs" />
              Company Purchase Manager & Procurement
            </h1>
            {currentUser?.account_name && (
              <span className="bg-[#2271b1] text-white border border-[#135e96] text-xs font-bold px-2.5 py-0.5 rounded-sm">
                Account: {currentUser.account_name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#50575e] mt-1">Order Purchase Entry, Delivery Code, Partner Name, Shipping & Extra Cost Tracking</p>
        </div>
      </div>

      {/* Date Range & Search Filter Controls */}
      <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search Input Bar */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-[#50575e] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order #, product, buyer, delivery code, partner..."
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#c3c4c7] pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xs transition-all ${activeTab === 'pending'
            ? 'bg-[#2271b1] text-white shadow-xs'
            : 'bg-[#f6f7f7] text-[#2c3338] border border-[#c3c4c7] hover:bg-[#f0f0f1]'
            }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Company Orders Queue</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'pending' ? 'bg-white text-[#2271b1]' : 'bg-[#e0e0e0] text-[#1d2327]'}`}>
            {dateFilteredPendingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xs transition-all ${activeTab === 'purchases'
            ? 'bg-[#2271b1] text-white shadow-xs'
            : 'bg-[#f6f7f7] text-[#2c3338] border border-[#c3c4c7] hover:bg-[#f0f0f1]'
            }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span>Purchase Records Dataset</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'purchases' ? 'bg-white text-[#2271b1]' : 'bg-[#e0e0e0] text-[#1d2327]'}`}>
            {dateFilteredPurchases.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Company Orders Queue */}
      {activeTab === 'pending' && (
        <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-[#50575e]">Loading order queue...</span>
            </div>
          ) : dateFilteredPendingOrders.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-[#1d2327]">No orders found for this filter!</p>
            </div>
          ) : (
            <>
              <div className="w-full">
                <ResizableTable storageKey="purchases_pending_cols" className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f0f0f1] text-[#1d2327] font-bold border-b border-[#c3c4c7] whitespace-nowrap">
                      <th data-col="order_number" className="py-2.5 px-3 border-r border-[#c3c4c7]">Order #</th>
                      <th data-col="company" className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Company</th>
                      <th data-col="last_delivery_date" className="py-2.5 px-3 border-r border-[#c3c4c7]">Last Delivery Date</th>
                      <th data-col="due_purchase" className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Due Purchase (5d before)</th>
                      <th data-col="buyer_name" className="py-2.5 px-3 border-r border-[#c3c4c7]">Buyer Name</th>
                      <th data-col="product_name" className="py-2.5 px-3 border-r border-[#c3c4c7]">Product Name</th>
                      <th data-col="qty" className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Qty</th>
                      <th data-col="price_usd" className="py-2.5 px-3 border-r border-[#c3c4c7]">Price (INR ₹)</th>
                      <th data-col="purchase_cost" className="py-2.5 px-3 border-r border-[#c3c4c7]">Purchase Cost (INR ₹)</th>
                      <th data-col="delivery_code" className="py-2.5 px-3 border-r border-[#c3c4c7]">Delivery Code / OI</th>
                      <th data-col="actions" className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dcdcde]">
                    {paginatedPendingOrders.map((ord, idx) => {
                      const matchedInv = inventoryList.find((item: any) =>
                        (ord.product_id && item.id === ord.product_id) ||
                        (item.product_name && ord.product_name && item.product_name.toLowerCase() === ord.product_name.toLowerCase())
                      );
                      const inStockQty = matchedInv?.stock_quantity || 0;
                      const dueInfo = getDuePurchaseDate(ord.last_delivery_date, ord.shipping_date);

                      return (
                        <tr key={ord.id} data-row-id={ord.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f6f7f7]'} hover:bg-[#e8f3fc] transition-colors whitespace-nowrap`}>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono font-bold text-[#2271b1]">{ord.order_number}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[10px] rounded-xs">
                              {ord.company || 'ADBH'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">
                            {ord.last_delivery_date || ord.shipping_date || '—'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center">
                            {dueInfo ? (
                              <span
                                className={`px-2 py-0.5 rounded-xs text-[10px] font-bold border inline-flex items-center gap-1 whitespace-nowrap shadow-2xs ${
                                  dueInfo.isOverdue
                                    ? 'bg-red-100 text-red-900 border-red-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}
                                title={`Must purchase by ${dueInfo.formatted} (5 days before ${ord.last_delivery_date || ord.shipping_date})`}
                              >
                                <Clock className={`w-3 h-3 shrink-0 ${dueInfo.isOverdue ? 'text-red-700 animate-pulse' : 'text-amber-700 animate-pulse'}`} />
                                <span>
                                  {dueInfo.formatted}
                                  {dueInfo.isOverdue
                                    ? ` (${Math.abs(dueInfo.daysLeft)}d overdue)`
                                    : ' (Due Today!)'}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[#8c8f94] text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-semibold text-[#1d2327]">{ord.buyer_name || ord.consignee_name || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-semibold" title={ord.product_name}>
                            {(() => {
                              let multiItems: any[] = [];
                              try {
                                if (ord.product_items) {
                                  const parsed = typeof ord.product_items === 'string' ? JSON.parse(ord.product_items) : ord.product_items;
                                  if (Array.isArray(parsed) && parsed.length > 1) multiItems = parsed;
                                }
                              } catch (e) {}

                              if (multiItems.length > 1) {
                                return (
                                  <div className="flex flex-col gap-1 py-0.5 max-h-full overflow-y-auto">
                                    {multiItems.map((item: any, i: number) => {
                                      return (
                                        <div key={i} className="flex items-center gap-1.5 max-w-full">
                                          {item.product_image ? (
                                            <img
                                              src={getImageUrl(item.product_image)}
                                              alt=""
                                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                              className="w-5 h-5 rounded-xs object-cover border border-[#c3c4c7] shrink-0"
                                            />
                                          ) : (
                                            <div className="w-5 h-5 rounded-xs bg-[#f0f0f1] border border-[#c3c4c7] flex items-center justify-center text-[9px] font-bold text-[#50575e] shrink-0">
                                              P{i + 1}
                                            </div>
                                          )}
                                          <div className="min-w-0 flex-1 overflow-hidden">
                                            {item.product_url ? (
                                              <a
                                                href={item.product_url.startsWith('http') ? item.product_url : `https://${item.product_url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#2271b1] hover:underline inline-flex items-center gap-1 font-bold text-xs truncate max-w-full"
                                                title={item.product_name}
                                              >
                                                <span className="truncate">{item.product_name}</span>
                                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 text-[#2271b1]" />
                                              </a>
                                            ) : (
                                              <span className="font-semibold text-xs truncate block max-w-full" title={item.product_name}>
                                                {item.product_name}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              }

                              return (
                                <div className="flex items-center gap-2 max-w-full overflow-hidden">
                                  {ord.product_image && (
                                    <img
                                      src={getImageUrl(ord.product_image)}
                                      alt=""
                                      className="w-5 h-5 rounded-xs object-cover border border-[#c3c4c7] shrink-0"
                                    />
                                  )}
                                  {ord.product_url ? (
                                    <a
                                      href={ord.product_url.startsWith('http') ? ord.product_url : `https://${ord.product_url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#2271b1] hover:underline inline-flex items-center gap-1 min-w-0 flex-1 truncate font-bold"
                                      title={ord.product_name}
                                    >
                                      <span className="truncate">{ord.product_name}</span>
                                      <ExternalLink className="w-3 h-3 flex-shrink-0 text-[#2271b1]" />
                                    </a>
                                  ) : (
                                    <span className="truncate min-w-0 flex-1" title={ord.product_name}>{ord.product_name}</span>
                                  )}
                                  {inStockQty > 0 && (
                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[9px] rounded-xs shrink-0">
                                      📦 {inStockQty} in stock
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center font-bold">
                            <div>{ord.qty}</div>
                            {(() => {
                              try {
                                if (ord.product_items) {
                                  const parsed = typeof ord.product_items === 'string' ? JSON.parse(ord.product_items) : ord.product_items;
                                  if (Array.isArray(parsed) && parsed.length > 1) {
                                    return <div className="text-[9px] font-bold text-[#2271b1] mt-0.5">({parsed.length} prods)</div>;
                                  }
                                }
                              } catch (e) {}
                              return null;
                            })()}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-emerald-700">
                            <div>${(ord.price_usd || ord.product_price || 0).toFixed(2)}</div>
                            {(() => {
                              try {
                                if (ord.product_items) {
                                  const parsed = typeof ord.product_items === 'string' ? JSON.parse(ord.product_items) : ord.product_items;
                                  if (Array.isArray(parsed) && parsed.length > 1) {
                                    return <div className="text-[9px] font-semibold text-[#50575e] mt-0.5">Total ({parsed.length} prods)</div>;
                                  }
                                }
                              } catch (e) {}
                              return null;
                            })()}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">
                            {ord.purchase_cost_inr ? (
                              <div className="flex flex-col">
                                <span>₹{(ord.total_order_cost_inr || ord.purchase_cost_inr).toFixed(2)}</span>
                                {ord.admin_cost_share > 0 && (
                                  <span className="text-[10px] text-slate-500 font-medium font-sans">
                                    (incl. ₹{ord.admin_cost_share.toFixed(2)} admin)
                                  </span>
                                )}
                              </div>
                            ) : '—'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#2271b1] font-semibold">
                            {ord.oi || ord.shipment_id || '—'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {(() => {
                              let isMulti = false;
                              try {
                                if (ord.product_items) {
                                  const parsed = typeof ord.product_items === 'string' ? JSON.parse(ord.product_items) : ord.product_items;
                                  if (Array.isArray(parsed) && parsed.length > 1) isMulti = true;
                                }
                              } catch (e) {}

                              if (isMulti) {
                                return (
                                  <div className="flex items-center justify-end">
                                    <button
                                      onClick={() => openPurchaseModal(ord)}
                                      className="px-2.5 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-[11px] rounded-xs flex items-center gap-1.5 transition-all shadow-xs"
                                      title="Create purchase order entry for items"
                                    >
                                      <ShoppingBag className="w-3.5 h-3.5" />
                                      <span>Purchase</span>
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleMarkInStock(ord)}
                                    className="px-2.5 py-1 bg-[#00a32a] hover:bg-[#008a20] text-white font-bold text-[11px] rounded-xs flex items-center gap-1 transition-all shadow-xs"
                                    title="Item is already in stock - send directly to Shipments"
                                  >
                                    <Truck className="w-3 h-3" />
                                    <span>In Stock</span>
                                  </button>
                                  <button
                                    onClick={() => openPurchaseModal(ord)}
                                    className="px-2.5 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-[11px] rounded-xs flex items-center gap-1 transition-all shadow-xs"
                                    title="Create purchase order entry"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Purchase Entry</span>
                                  </button>
                                </div>
                              );
                            })()}
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
                  <span className="font-bold text-[#1d2327]">{dateFilteredPendingOrders.length} entries</span>
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
                      onClick={() => setCurrentPagePending(prev => Math.max(prev - 1, 1))}
                      disabled={currentPagePending === 1}
                      className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs font-bold text-[#2c3338] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f0f1] transition-all flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="px-2.5 py-1 font-bold text-[#1d2327]">
                      Page {currentPagePending} of {Math.max(1, Math.ceil(dateFilteredPendingOrders.length / pageSize))}
                    </span>
                    <button
                      onClick={() => setCurrentPagePending(prev => Math.min(prev + 1, Math.max(1, Math.ceil(dateFilteredPendingOrders.length / pageSize))))}
                      disabled={currentPagePending >= Math.max(1, Math.ceil(dateFilteredPendingOrders.length / pageSize))}
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

      {/* TAB 2: Purchase Records Dataset */}
      {activeTab === 'purchases' && (
        <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-[#50575e]">Loading purchase records...</span>
            </div>
          ) : dateFilteredPurchases.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="w-8 h-8 text-[#a7aaad] mx-auto mb-2" />
              <p className="text-xs text-[#50575e]">No purchase entries recorded for this filter.</p>
            </div>
          ) : (
            <>
              <div className="w-full">
                <ResizableTable storageKey="purchases_ledger_cols" className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f0f0f1] text-[#1d2327] font-bold border-b border-[#c3c4c7] whitespace-nowrap">
                      <th data-col="purchase_date" className="py-2.5 px-3 border-r border-[#c3c4c7]">Purchase Date</th>
                      <th data-col="company" className="py-2.5 px-3 border-r border-[#c3c4c7]">Company</th>
                      <th data-col="vendor" className="py-2.5 px-3 border-r border-[#c3c4c7]">Vendor</th>
                      <th data-col="product_name" className="py-2.5 px-3 border-r border-[#c3c4c7]">Product Name</th>
                      <th data-col="sku" className="py-2.5 px-3 border-r border-[#c3c4c7]">SKU</th>
                      <th data-col="gst_type" className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">GST Type</th>
                      <th data-col="bank" className="py-2.5 px-3 border-r border-[#c3c4c7]">Bank</th>
                      <th data-col="po_number" className="py-2.5 px-3 border-r border-[#c3c4c7]">PO Number</th>
                      <th data-col="qty" className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Qty</th>
                      <th data-col="purchase_value" className="py-2.5 px-3 border-r border-[#c3c4c7]">Purchase Value (INR ₹)</th>
                      <th data-col="delivery_code" className="py-2.5 px-3 border-r border-[#c3c4c7]">Delivery Code / Tracking</th>
                      <th data-col="est_delivery_date" className="py-2.5 px-3 border-r border-[#c3c4c7]">Est. Delivery Date</th>
                      <th data-col="payment" className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Payment</th>
                      <th data-col="status" className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Status</th>
                      <th data-col="actions" className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dcdcde]">
                    {paginatedPurchases.map((pur, idx) => {
                      return (
                        <tr key={pur.id} data-row-id={pur.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f6f7f7]'} hover:bg-[#e8f3fc] transition-colors whitespace-nowrap`}>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium">{pur.order_date || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">{pur.company || pur.account_name || 'ADBH'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-[#2271b1]">{pur.purchase_partner_name || pur.account_name || 'Aryastore Partner'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-semibold truncate" title={pur.product_name}>{pur.product_name}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[11px] text-[#2271b1] font-semibold">{pur.sku || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center">
                            <span className={`px-2 py-0.5 font-bold text-[10px] rounded-xs border ${pur.gst_type === 'Non GST' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-100 text-blue-900 border-blue-300'}`}>
                              {pur.gst_type || 'GST'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#1d2327]">{pur.bank || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[11px] font-bold text-[#1d2327]">{pur.po_number || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center font-bold">{pur.qty}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-bold text-emerald-800">₹{(pur.purchase_value || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-mono text-[#2271b1] font-bold">{pur.delivery_code || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] font-medium text-[#50575e]">{pur.estimated_shipment_date || '—'}</td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] rounded-xs">
                              {pur.payment_status || 'Paid'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-[#e0e0e0] text-center">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-xs border ${pur.status === 'Received' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-blue-100 text-blue-900 border-blue-300'
                              }`}>
                              {pur.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {pur.status !== 'Received' ? (
                                <button
                                  onClick={() => handlePurchaseDone(pur)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-xs shadow-xs"
                                >
                                  Mark Received
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700">✓ Received</span>
                              )}
                              <button
                                onClick={() => {
                                  const parentOrd = orders.find(o => o.id === pur.order_id);
                                  if (parentOrd) openPurchaseModal(parentOrd);
                                }}
                                className="p-1 text-[#2271b1] hover:text-[#135e96] hover:bg-[#f0f0f1] rounded-xs transition-colors"
                                title="Edit purchase / order"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePurchase(pur.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-xs transition-colors"
                                title="Delete purchase"
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
                  <span className="font-bold text-[#1d2327]">{dateFilteredPurchases.length} entries</span>
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
                      onClick={() => setCurrentPagePurchases(prev => Math.max(prev - 1, 1))}
                      disabled={currentPagePurchases === 1}
                      className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs font-bold text-[#2c3338] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f0f1] transition-all flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="px-2.5 py-1 font-bold text-[#1d2327]">
                      Page {currentPagePurchases} of {Math.max(1, Math.ceil(dateFilteredPurchases.length / pageSize))}
                    </span>
                    <button
                      onClick={() => setCurrentPagePurchases(prev => Math.min(prev + 1, Math.max(1, Math.ceil(dateFilteredPurchases.length / pageSize))))}
                      disabled={currentPagePurchases >= Math.max(1, Math.ceil(dateFilteredPurchases.length / pageSize))}
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

      {/* PURCHASE / IN-STOCK ENTRY MODAL (All Fields Optional) */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white border border-[#c3c4c7] w-full ${isMultiProduct ? 'max-w-4xl' : 'max-w-2xl'} max-h-[90vh] flex flex-col shadow-2xl rounded-sm font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
            {/* Modal Header */}
            <div className={`px-5 py-3.5 flex items-center justify-between border-b shrink-0 ${purchaseForm.is_in_stock && !isMultiProduct ? 'bg-[#008a20] text-white border-emerald-800' : isMultiProduct ? 'bg-[#6366f1] text-white border-indigo-700' : 'bg-[#1d2327] text-white border-[#2c3338]'
              }`}>
              <div className="flex items-center gap-2">
                {isMultiProduct ? (
                  <Layers className="w-4 h-4 text-indigo-200" />
                ) : purchaseForm.is_in_stock ? (
                  <Truck className="w-4 h-4 text-emerald-200" />
                ) : (
                  <ShoppingBag className="w-4 h-4 text-[#72aee6]" />
                )}
                <h3 className="text-sm font-bold">
                  {isMultiProduct ? 'Multi-Product Purchase' : purchaseForm.is_in_stock ? 'In Stock Entry' : 'Purchase Entry'} for Order #{purchaseForm.order_number}
                </h3>
                <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider ${isMultiProduct ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-400/40' : purchaseForm.is_in_stock ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-400/40' : 'bg-blue-900/60 text-blue-200 border border-blue-400/40'
                  }`}>
                  {isMultiProduct ? `${purchaseItems.length} Products` : purchaseForm.is_in_stock ? 'In Stock Mode' : 'Purchase Mode'}
                </span>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="text-white/80 hover:text-white font-bold text-lg leading-none">×</button>
            </div>

            <form onSubmit={handleCreatePurchase} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Context Summary & Cost */}
                <div className="px-3.5 py-2 bg-[#f6f7f7] border border-[#c3c4c7] rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap text-[#50575e]">
                    <span>Company Account: <b className="text-[#1d2327]">{purchaseForm.company}</b></span>
                    <span>Order Required Qty: <b className="text-[#2271b1]">{selectedOrder?.qty || 1}</b></span>
                    {isMultiProduct && <span>Products: <b className="text-indigo-700 font-bold">{purchaseItems.length} items</b></span>}
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-xs">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase">Total Purchase Cost:</span>
                    <span className="text-xs font-extrabold text-emerald-900 font-mono">₹{totalPurchaseCost.toFixed(2)}</span>
                  </div>
                </div>

                {/* Notice Banner */}
                {!isMultiProduct && (
                  <div className={`p-2.5 rounded-xs border text-xs flex items-center gap-2 font-medium ${purchaseForm.is_in_stock
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-blue-50 border-blue-300 text-blue-900'
                    }`}>
                    {purchaseForm.is_in_stock ? (
                      <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <ShoppingBag className="w-4 h-4 text-blue-700 shrink-0" />
                    )}
                    <span>
                      {purchaseForm.is_in_stock
                        ? 'In-Stock Mode: Enter Quantity and Purchase Price (₹) to confirm in-stock fulfillment.'
                        : 'Purchase Mode: All fields marked with (*) are mandatory.'}
                    </span>
                  </div>
                )}

                {/* MULTI-PRODUCT MODE: Per-Item Purchase Controls */}
                {isMultiProduct ? (
                  <div className="space-y-3">
                    {purchaseItems.map((item, idx) => {
                      const itemInv = inventoryList.find((inv: any) =>
                        (inv.product_name && item.product_name && inv.product_name.toLowerCase() === item.product_name.toLowerCase())
                      );
                      const inStockQty = itemInv?.stock_quantity || 0;

                      return (
                        <div key={item.id} className={`border rounded-xs overflow-hidden ${item.is_in_stock ? 'border-emerald-300 bg-emerald-50/30' : 'border-[#c3c4c7] bg-white'}`}>
                          {/* Item Header */}
                          <div className={`px-4 py-2.5 flex items-center justify-between ${item.is_in_stock ? 'bg-emerald-100 border-b border-emerald-200' : 'bg-[#f0f0f1] border-b border-[#c3c4c7]'}`}>
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${item.is_in_stock ? 'bg-emerald-600 text-white' : 'bg-[#2271b1] text-white'}`}>
                                {idx + 1}
                              </span>
                              {item.product_image && (
                                <img src={getImageUrl(item.product_image)} alt="" className="w-6 h-6 rounded-xs object-cover border border-[#c3c4c7] shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-[#1d2327] text-xs truncate" title={item.product_name}>{item.product_name}</div>
                                <div className="text-[10px] text-[#50575e] flex items-center gap-2">
                                  <span>Qty: <b>{item.qty}</b></span>
                                  <span>Price: <b>₹{(item.price_usd || 0).toFixed(2)}</b></span>
                                  {inStockQty > 0 && (
                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[9px] rounded-xs">
                                      📦 {inStockQty} in stock
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* In Stock / Purchase Toggle */}
                            <button
                              type="button"
                              onClick={() => updatePurchaseItem(item.id, {
                                is_in_stock: !item.is_in_stock,
                                purchase_partner_name: !item.is_in_stock ? 'In-Stock Inventory' : (selectedOrder?.seller_account || selectedOrder?.account_name || ''),
                                notes: !item.is_in_stock ? 'In-Stock Order' : '',
                              })}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-xs text-[11px] font-bold transition-all shrink-0 ${
                                item.is_in_stock
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                  : 'bg-[#2271b1] text-white hover:bg-[#135e96] shadow-xs'
                              }`}
                            >
                              {item.is_in_stock ? (
                                <><ToggleRight className="w-3.5 h-3.5" /><span>In Stock ✓</span></>
                              ) : (
                                <><ToggleLeft className="w-3.5 h-3.5" /><span>Purchase</span></>
                              )}
                            </button>
                          </div>

                          {/* Item Form Fields */}
                          <div className="px-4 py-3 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {/* Qty */}
                              <div>
                                <label className="block font-bold text-[#1d2327] mb-0.5 text-[10px] flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-[#2271b1]" />
                                  <span>Qty</span>
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => updatePurchaseItem(item.id, { qty: parseInt(e.target.value) || 1 })}
                                  className="w-full bg-white border border-[#8c8f94] p-1.5 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs text-xs"
                                />
                              </div>

                              {/* Purchase Cost */}
                              <div>
                                <label className="block font-bold text-[#1d2327] mb-0.5 text-[10px] flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-emerald-600" />
                                  <span>{item.is_in_stock ? 'Stock Cost (INR ₹)' : 'Amount (₹)'}</span>
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={item.purchase_value === '' ? '' : item.purchase_value}
                                  onChange={(e) => updatePurchaseItem(item.id, { purchase_value: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                  className="w-full bg-white border border-[#8c8f94] p-1.5 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs text-xs font-mono"
                                />
                              </div>

                              {/* Company Selection */}
                              <div>
                                <label className="block font-bold text-[#1d2327] mb-0.5 text-[10px] flex items-center gap-1">
                                  <ShoppingBag className="w-3 h-3 text-indigo-600" />
                                  <span>Company</span>
                                </label>
                                <select
                                  value={item.company || 'ADBH'}
                                  onChange={(e) => updatePurchaseItem(item.id, { company: e.target.value })}
                                  className="w-full bg-white border border-[#8c8f94] p-1.5 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs text-xs cursor-pointer"
                                >
                                  {['ADBH', 'Canton', 'Doweta', 'in stock'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                  {companyOptions.map((c: string) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Extra fields for purchase mode */}
                            {!item.is_in_stock && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
                                <div>
                                  <label className="block font-bold text-[#1d2327] mb-0.5 text-[10px] flex items-center gap-1">
                                    <UserCheck className="w-3 h-3 text-[#2271b1]" />
                                    <span>Vendor / Supplier *</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Vendor Name"
                                    value={item.purchase_partner_name}
                                    onChange={(e) => updatePurchaseItem(item.id, { purchase_partner_name: e.target.value })}
                                    className="w-full bg-white border border-[#8c8f94] p-1.5 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-bold text-[#1d2327] mb-0.5 text-[10px] flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-amber-600" />
                                    <span>Delivery Date *</span>
                                  </label>
                                  <input
                                    type="date"
                                    value={item.estimated_shipment_date}
                                    onChange={(e) => updatePurchaseItem(item.id, { estimated_shipment_date: e.target.value })}
                                    className="w-full bg-white border border-[#8c8f94] p-1.5 font-semibold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-bold text-[#1d2327] mb-0.5 text-[10px] flex items-center gap-1">
                                    <Truck className="w-3 h-3 text-purple-600" />
                                    <span>Delivery Code</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="OI / Tracking"
                                    value={item.delivery_code}
                                    onChange={(e) => updatePurchaseItem(item.id, { delivery_code: e.target.value })}
                                    className="w-full bg-white border border-[#8c8f94] p-1.5 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs text-xs"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            <div>
                              <input
                                type="text"
                                placeholder="Item notes / remarks (optional)"
                                value={item.notes}
                                onChange={(e) => updatePurchaseItem(item.id, { notes: e.target.value })}
                                className="w-full bg-white border border-[#c3c4c7] p-1 text-[11px] outline-none focus:border-[#2271b1] rounded-xs text-[#50575e]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Multi-product shared fields */}
                    <div className="p-3 bg-[#f6f7f7] border border-[#c3c4c7] rounded-xs">
                      <div className="text-[10px] font-bold text-[#50575e] uppercase mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-[#2271b1]" />
                        Shared Fields (applies to all items)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-[#1d2327] mb-0.5 text-[10px]">PO Number</label>
                          <input
                            type="text"
                            placeholder="e.g. PO-2026-0012"
                            value={purchaseForm.po_number}
                            onChange={(e) => setPurchaseForm({ ...purchaseForm, po_number: e.target.value })}
                            className="w-full bg-white border border-[#8c8f94] p-1.5 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-[#1d2327] mb-0.5 text-[10px]">Payment Status</label>
                          <select
                            value={purchaseForm.payment_status}
                            onChange={(e) => setPurchaseForm({ ...purchaseForm, payment_status: e.target.value })}
                            className="w-full bg-white border border-[#8c8f94] p-1.5 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs text-xs cursor-pointer"
                          >
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Partial">Partial</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-[#1d2327] mb-0.5 text-[10px]">GST Type</label>
                          <select
                            value={purchaseForm.gst_type}
                            onChange={(e) => setPurchaseForm({ ...purchaseForm, gst_type: e.target.value })}
                            className="w-full bg-white border border-[#8c8f94] p-1.5 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs text-xs cursor-pointer"
                          >
                            <option value="GST">GST</option>
                            <option value="Non GST">Non GST</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Summary Bar */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-[#50575e]">
                          In Stock: <b className="text-emerald-700">{purchaseItems.filter(i => i.is_in_stock).length}</b>
                        </span>
                        <span className="text-[#50575e]">
                          Purchase: <b className="text-[#2271b1]">{purchaseItems.filter(i => !i.is_in_stock).length}</b>
                        </span>
                        <span className="text-[#50575e]">
                          Total Items: <b className="text-[#1d2327]">{purchaseItems.length}</b>
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700">
                        Total: ₹{totalPurchaseCost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : purchaseForm.is_in_stock ? (
                  /* IN-STOCK MODE: ONLY QUANTITY & PURCHASE PRICE */

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>Quantity (Qty) *</span>
                        </span>
                        <span className="text-[10px] text-[#50575e] font-normal">Order needs: {selectedOrder?.qty || 1}</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={purchaseForm.qty}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: parseInt(e.target.value) || 1 })}
                        className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Purchase Price (INR ₹) *</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 1500.00"
                        value={purchaseForm.purchase_value === 0 ? '' : purchaseForm.purchase_value}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_value: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) })}
                        className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  /* REGULAR VENDOR PURCHASE MODE: ALL FIELDS */
                  <>
                    {/* Row 1: Quantity & SKU */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-[#2271b1]" />
                            <span>Quantity (Qty) *</span>
                          </span>
                          <span className="text-[10px] text-[#50575e] font-normal">Order needs: {selectedOrder?.qty || 1}</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={purchaseForm.qty}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: parseInt(e.target.value) || 1 })}
                          className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                          required
                        />
                        {purchaseForm.qty > (selectedOrder?.qty || 1) && (
                          <div className="text-[10px] font-bold text-[#00a32a] mt-1 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xs flex items-center gap-1">
                            <span>✓ Excess of <b>{purchaseForm.qty - (selectedOrder?.qty || 1)} unit(s)</b> will be stored in Inventory for future orders!</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                          <Barcode className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>SKU Number</span>
                          <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SKU-JEANS-001"
                          value={purchaseForm.sku}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, sku: e.target.value })}
                          className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                        />
                      </div>
                    </div>



                    {/* Row 3: Purchase Amount & Purchase Partner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Purchase Amount (INR ₹) *</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 1500.00"
                          value={purchaseForm.purchase_value === 0 ? '' : purchaseForm.purchase_value}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_value: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) })}
                          className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>Vendor / Supplier Name *</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Aryastore Partner / Supplier Name"
                          value={purchaseForm.purchase_partner_name}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_partner_name: e.target.value })}
                          className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                          required
                        />
                      </div>
                    </div>

                    {/* Row 4: Arrived Delivery Date & PO Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          <span>Arrived Delivery Date *</span>
                        </label>
                        <input
                          type="date"
                          value={purchaseForm.estimated_shipment_date}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, estimated_shipment_date: e.target.value })}
                          className="w-full bg-white border border-[#8c8f94] p-2 font-semibold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>PO Number</span>
                          <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. PO-2026-0012"
                          value={purchaseForm.po_number}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, po_number: e.target.value })}
                          className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                        />
                      </div>
                    </div>

                    {/* Row 5: Delivery Code (OI) */}
                    <div>
                      <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-purple-600" />
                        <span>Delivery Code / OI / Tracking</span>
                        <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. OI-883921 / Tracking Code"
                        value={purchaseForm.delivery_code}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, delivery_code: e.target.value })}
                        className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                      />
                    </div>

                    {/* Row 6: Notes / Remarks */}
                    <div>
                      <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                        <StickyNote className="w-3.5 h-3.5 text-slate-600" />
                        <span>Purchase Notes / Remarks</span>
                        <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Expedited customs clearance / supplier notes"
                        value={purchaseForm.notes}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                        className="w-full bg-white border border-[#8c8f94] p-2 outline-none focus:border-[#2271b1] rounded-xs"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="px-5 py-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex items-center justify-between shrink-0">
                <div className="text-xs text-[#50575e]">
                  Total sum: <b className="text-emerald-700">₹{totalPurchaseCost.toFixed(2)}</b>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPurchaseModal(false)}
                    className="px-4 py-1.5 bg-white hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-semibold rounded-xs transition-colors shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-1.5 text-white font-bold rounded-xs shadow-xs flex items-center gap-1.5 transition-all ${purchaseForm.is_in_stock
                      ? 'bg-[#00a32a] hover:bg-[#008a20]'
                      : 'bg-[#2271b1] hover:bg-[#135e96]'
                      }`}
                  >
                    {purchaseForm.is_in_stock ? (
                      <>
                        <span>Save</span>
                      </>
                    ) : (
                      <>
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
