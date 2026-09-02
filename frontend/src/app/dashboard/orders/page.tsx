'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ordersApi, authApi, accountsApi, uploadApi, inventoryApi, purchasesApi, companiesApi, partnersMgmtApi, getImageUrl } from '@/lib/api';
import ResizableTable from '@/components/ResizableTable';
import {
  ShoppingCart,
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  Filter,
  Search,
  Check,
  RefreshCw,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Upload,
  Link as LinkIcon,
  ExternalLink,
  Calendar,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  PackageCheck,
  Truck,
  ShoppingBag,
  Barcode,
  Receipt,
  Landmark,
  DollarSign,
  UserCheck,
  FileText,
  StickyNote,
  Tag
} from 'lucide-react';
import { hasPermission, getAllowedCompanies } from '@/lib/permissions';

const ORDER_STATUS_OPTIONS = ['in stock', 'ADBH', 'Canton', 'Doweta'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [purchasesList, setPurchasesList] = useState<any[]>([]);
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [selectedSellerAccount, setSelectedSellerAccount] = useState<string>('All');
  const [selectedPurchaseStatus, setSelectedPurchaseStatus] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [dateFieldType, setDateFieldType] = useState<string>('order_process_date');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Alerts for CSV Upload
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);

  // Hidden File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelFileInputRef = useRef<HTMLInputElement>(null);

  // Label Upload Modal State
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<any>(null);
  const [labelUploading, setLabelUploading] = useState(false);
  const [labelExtractedId, setLabelExtractedId] = useState<string | null>(null);
  const [labelCostInput, setLabelCostInput] = useState<number>(0);
  const [labelFreeInput, setLabelFreeInput] = useState<boolean>(false);
  const [labelUploadError, setLabelUploadError] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  // Purchase Modal for In Stock & Purchase Entry
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedOrderForPurchase, setSelectedOrderForPurchase] = useState<any>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    order_id: 0,
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
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

  // Searchable Seller Dropdown State
  const [sellerSearch, setSellerSearch] = useState('');
  const [showSellerDropdown, setShowSellerDropdown] = useState(false);
  const sellerDropdownRef = useRef<HTMLDivElement>(null);

  // Searchable Product Dropdown State
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Drag & Drop Product Image State
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // URL Image Extraction State
  const [fetchingUrlImage, setFetchingUrlImage] = useState(false);
  const [urlFetchStatus, setUrlFetchStatus] = useState<string | null>(null);
  const urlFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDirectImageUrl = (url: string) => {
    if (!url) return false;
    const trimmed = url.trim();
    if (trimmed.startsWith('data:image/')) return true;
    return /\.(jpeg|jpg|png|webp|gif|svg|avif|bmp)(\?.*)?$/i.test(trimmed) || trimmed.includes('media-amazon.com/images');
  };

  const fetchImageFromUrl = async (rawUrl: string, autoUpdateTitle = true) => {
    if (!rawUrl || !rawUrl.trim()) return;
    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('data:')) {
      targetUrl = `https://${targetUrl}`;
    }

    if (isDirectImageUrl(targetUrl)) {
      setOrderForm(prev => ({
        ...prev,
        product_image: targetUrl
      }));
      setUrlFetchStatus('Direct image loaded');
      setTimeout(() => setUrlFetchStatus(null), 3000);
      return;
    }

    try {
      setFetchingUrlImage(true);
      setUrlFetchStatus('Extracting product image...');
      const res = await ordersApi.extractUrlImage(targetUrl);
      if (res.data?.success && res.data?.image_url) {
        setOrderForm(prev => ({
          ...prev,
          product_image: res.data.image_url,
          product_name: (autoUpdateTitle && !prev.product_name && res.data.title) ? res.data.title : prev.product_name
        }));
        setUrlFetchStatus('Image auto-loaded from URL');
        setTimeout(() => setUrlFetchStatus(null), 3500);
      } else {
        setUrlFetchStatus(res.data?.message || 'No image found at this URL');
        setTimeout(() => setUrlFetchStatus(null), 4000);
      }
    } catch (err: any) {
      console.warn('Error fetching image from URL:', err);
      setUrlFetchStatus('Could not extract image from URL');
      setTimeout(() => setUrlFetchStatus(null), 4000);
    } finally {
      setFetchingUrlImage(false);
    }
  };

  const handleProductUrlChange = (val: string) => {
    setOrderForm(prev => ({ ...prev, product_url: val }));

    if (urlFetchTimeoutRef.current) {
      clearTimeout(urlFetchTimeoutRef.current);
    }

    if (!val || !val.trim()) {
      return;
    }

    const trimmed = val.trim();
    if (isDirectImageUrl(trimmed)) {
      setOrderForm(prev => ({ ...prev, product_url: val, product_image: trimmed }));
      setUrlFetchStatus('Image auto-loaded');
      setTimeout(() => setUrlFetchStatus(null), 3000);
      return;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('.')) {
      urlFetchTimeoutRef.current = setTimeout(() => {
        fetchImageFromUrl(trimmed);
      }, 700);
    }
  };

  // Single Order Form State
  const [orderForm, setOrderForm] = useState({
    order_process_date: new Date().toISOString().split('T')[0],
    shipping_date: '',
    last_delivery_date: '',
    arriving_date: '',
    company: 'ADBH',
    shipment_id: '',
    order_number: '',
    seller_account: '',
    product_name: '',
    product_url: '',
    product_image: '',
    qty: 1,
    price_usd: 0,
    order_status: 'ADBH',
    consignee_name: '',
    shipment_address_1: '',
    shipment_address_2: '',
    city: '',
    state: '',
    zip_code: '',
    mobile_number: '',
    country: 'USA',
    status: 'ADBH'
  });

  const getNextSequentialShipmentId = (ordersList: any[]): string => {
    let maxNum = 0;
    let prefix = 'INBTL';
    let digitsLen = 3;

    ordersList.forEach(o => {
      if (o.shipment_id) {
        const match = o.shipment_id.match(/^([A-Za-z\-_]+)(\d+)$/);
        if (match) {
          prefix = match[1];
          digitsLen = Math.max(digitsLen, match[2].length);
          const num = parseInt(match[2], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(digitsLen, '0')}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const ordRes = await ordersApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      const accRes = await accountsApi.list().catch(() => ({ data: [] }));
      const compRes = await companiesApi.list().catch(() => ({ data: [] }));
      const partRes = await partnersMgmtApi.list().catch(() => ({ data: [] }));
      const invRes = await inventoryApi.list().catch(() => ({ data: [] }));
      const purRes = await purchasesApi.list().catch(() => ({ data: [] }));
      setOrders(ordRes.data || []);
      setDbAccounts(accRes.data || []);
      setCompaniesList(compRes.data || []);
      setPartnersList(partRes.data || []);
      setInventoryList(invRes.data || []);
      setPurchasesList(purRes.data || []);
      const user = meRes?.data || null;
      setCurrentUser(user);

      if (user && user.account_name && !user.is_admin) {
        setSelectedCompany(user.account_name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sellerDropdownRef.current && !sellerDropdownRef.current.contains(e.target as Node)) {
        setShowSellerDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatActionDateTime = (dtStr?: string, fallbackDate?: string) => {
    const raw = dtStr || fallbackDate;
    if (!raw) return '';
    try {
      const d = new Date(raw.endsWith('Z') || raw.includes('+') ? raw : `${raw}Z`);
      const validDate = isNaN(d.getTime()) ? new Date(raw) : d;
      if (isNaN(validDate.getTime())) return raw;

      const day = validDate.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[validDate.getMonth()];
      const year = validDate.getFullYear();
      let hours = validDate.getHours();
      const minutes = validDate.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

      return `${day} ${month} ${year}, ${strTime}`;
    } catch {
      return raw;
    }
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

  // Allowed companies and partners list
  const companyOptions = getAllowedCompanies(currentUser);

  const isAllowedCompany = (comp?: string) => {
    if (!comp) return true;
    if (currentUser?.is_admin || currentUser?.role_name === 'Super Admin') return true;
    const target = comp.trim().toLowerCase();
    return companyOptions.some(c => {
      const allowed = c.trim().toLowerCase();
      return target === allowed || target.includes(allowed) || allowed.includes(target);
    }) ||
    companiesList.some((c: any) => c.company_name?.toLowerCase() === comp.toLowerCase()) ||
    partnersList.some((p: any) => p.partner_name?.toLowerCase() === comp.toLowerCase());
  };

  const companyItems = Array.from(new Set([
    ...companiesList.map((c: any) => c.company_name).filter(Boolean),
    ...orders.map((o: any) => o.company).filter(Boolean),
    ...companyOptions
  ]));
  const partnerItems = Array.from(new Set(
    partnersList.map((p: any) => p.partner_name).filter(Boolean)
  ));

  const sellerAccountOptions = Array.from(new Set(
    orders
      .filter(o => isAllowedCompany(o.company))
      .map(o => o.seller_account)
      .filter(Boolean)
  ));

  // Due purchase count
  const duePurchaseCount = orders.filter(o => {
    if (!isAllowedCompany(o.company)) return false;
    const matchingPur = purchasesList.find((p: any) => p.order_id === o.id);
    const isStockDone = Boolean(
      matchingPur && (
        matchingPur.is_in_stock ||
        matchingPur.notes?.includes('In-Stock') ||
        matchingPur.purchase_partner_name === 'In Stock' ||
        matchingPur.bank === 'In Stock'
      )
    );
    const isPurchaseDone = Boolean(matchingPur && !isStockDone);
    if (isStockDone || isPurchaseDone) return false;
    const dueInfo = getDuePurchaseDate(o.last_delivery_date, o.shipping_date);
    return dueInfo !== null;
  }).length;

  // Filter logic
  useEffect(() => {
    let result = orders.filter(o => isAllowedCompany(o.company));

    if (currentUser && currentUser.account_name && !currentUser.is_admin) {
      result = result.filter(o => o.company?.toLowerCase() === currentUser.account_name.toLowerCase());
    } else if (selectedCompany !== 'All') {
      result = result.filter(o => o.company?.toLowerCase() === selectedCompany.toLowerCase());
    }

    if (selectedSellerAccount !== 'All') {
      result = result.filter(o => (o.seller_account || '').toLowerCase() === selectedSellerAccount.toLowerCase());
    }

    if (selectedStatus === 'Due Purchase') {
      result = result.filter(o => {
        const matchingPur = purchasesList.find((p: any) => p.order_id === o.id);
        const isStockDone = Boolean(
          matchingPur && (
            matchingPur.is_in_stock ||
            matchingPur.notes?.includes('In-Stock') ||
            matchingPur.purchase_partner_name === 'In Stock' ||
            matchingPur.bank === 'In Stock'
          )
        );
        const isPurchaseDone = Boolean(matchingPur && !isStockDone);
        if (isStockDone || isPurchaseDone) return false;
        return getDuePurchaseDate(o.last_delivery_date, o.shipping_date) !== null;
      });
    } else if (selectedStatus !== 'All') {
      result = result.filter(o => {
        const s = o.order_status || 'ADBH';
        return s.toLowerCase() === selectedStatus.toLowerCase();
      });
    }

    if (selectedPurchaseStatus !== 'All') {
      result = result.filter(o => {
        const matchingPur = purchasesList.find((p: any) => p.order_id === o.id);
        const isStockDone = Boolean(
          matchingPur && (
            matchingPur.is_in_stock ||
            matchingPur.notes?.includes('In-Stock') ||
            matchingPur.purchase_partner_name === 'In Stock' ||
            matchingPur.bank === 'In Stock'
          )
        );
        const isPurchaseDone = Boolean(matchingPur && !isStockDone);

        if (selectedPurchaseStatus === 'due') {
          if (isStockDone || isPurchaseDone) return false;
          return getDuePurchaseDate(o.last_delivery_date, o.shipping_date) !== null;
        }
        if (selectedPurchaseStatus === 'in_stock') return isStockDone;
        if (selectedPurchaseStatus === 'purchased') return isPurchaseDone;
        if (selectedPurchaseStatus === 'pending') return !isStockDone && !isPurchaseDone;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o =>
        o.order_number?.toLowerCase().includes(q) ||
        o.shipment_id?.toLowerCase().includes(q) ||
        o.consignee_name?.toLowerCase().includes(q) ||
        o.buyer_name?.toLowerCase().includes(q) ||
        o.product_name?.toLowerCase().includes(q) ||
        o.seller_account?.toLowerCase().includes(q) ||
        o.city?.toLowerCase().includes(q) ||
        o.state?.toLowerCase().includes(q) ||
        o.zip_code?.toLowerCase().includes(q) ||
        o.oi?.toLowerCase().includes(q) ||
        o.mobile_number?.toLowerCase().includes(q)
      );
    }

    const getDateValue = (o: any) => {
      if (dateFieldType === 'shipping_date') return o.shipping_date;
      if (dateFieldType === 'last_delivery_date') return o.last_delivery_date;
      if (dateFieldType === 'arriving_date') {
        const matchingPur = purchasesList.find((p: any) => p.order_id === o.id);
        return o.arriving_date || matchingPur?.estimated_shipment_date;
      }
      return o.order_process_date || o.order_date;
    };

    if (startDate) {
      result = result.filter(o => {
        const d = getDateValue(o);
        return d && d >= startDate;
      });
    }

    if (endDate) {
      result = result.filter(o => {
        const d = getDateValue(o);
        return d && d <= endDate;
      });
    }

    setFilteredOrders(result);
    setCurrentPage(1);
  }, [
    orders,
    purchasesList,
    selectedCompany,
    selectedSellerAccount,
    selectedPurchaseStatus,
    selectedStatus,
    dateFieldType,
    searchQuery,
    startDate,
    endDate,
    currentUser,
    companiesList,
    partnersList
  ]);

  // Helper to strictly get accounts connected to selected Company or Partner
  const getAccountsForEntity = (selectedEntity: string): string[] => {
    if (!selectedEntity || !selectedEntity.trim()) {
      return [];
    }

    const clean = selectedEntity.trim().toLowerCase();

    // Check matching company in companiesList
    const matchedCompany = companiesList.find((c: any) =>
      c.company_name?.toLowerCase() === clean ||
      c.company_name?.toLowerCase().includes(clean) ||
      clean.includes(c.company_name?.toLowerCase() || '')
    );

    // Check matching partner in partnersList
    const matchedPartner = partnersList.find((p: any) =>
      p.partner_name?.toLowerCase() === clean ||
      p.partner_name?.toLowerCase().includes(clean) ||
      clean.includes(p.partner_name?.toLowerCase() || '')
    );

    let matched: any[] = [];

    if (matchedCompany) {
      matched = dbAccounts.filter((acc: any) => {
        // Direct foreign key match to this company
        if (acc.company_id && acc.company_id === matchedCompany.id) return true;
        // Strictly Company category matching this company's name
        if (acc.category?.toLowerCase() === 'company') {
          if (acc.company_id && acc.company_id !== matchedCompany.id) return false;
          if (acc.partner_id) return false;
          if (acc.purchase_company && (
            acc.purchase_company.toLowerCase() === clean ||
            acc.purchase_company.toLowerCase() === matchedCompany.company_name?.toLowerCase() ||
            matchedCompany.company_name?.toLowerCase().includes(acc.purchase_company.toLowerCase()) ||
            acc.purchase_company.toLowerCase().includes(matchedCompany.company_name?.toLowerCase())
          )) return true;
        }
        return false;
      });
    } else if (matchedPartner) {
      matched = dbAccounts.filter((acc: any) => {
        // Direct foreign key match to this partner
        if (acc.partner_id && acc.partner_id === matchedPartner.id) return true;
        // Strictly Partner category matching this partner
        if (acc.category?.toLowerCase() === 'partner') {
          if (acc.partner_id && acc.partner_id !== matchedPartner.id) return false;
          if (acc.company_id) return false;
          if (acc.purchase_company && acc.purchase_company.toLowerCase() === clean) return true;
          if (acc.account_name?.toLowerCase() === clean || clean.includes(acc.account_name?.toLowerCase())) return true;
        }
        return false;
      });
    } else {
      // Fallback for custom company name without company_id (e.g. Globle, canton)
      matched = dbAccounts.filter((acc: any) => {
        if (!acc.company_id && !acc.partner_id) {
          if (acc.purchase_company && acc.purchase_company.toLowerCase() === clean) return true;
          if (acc.account_name && acc.account_name.toLowerCase() === clean) return true;
        }
        return false;
      });
    }

    return Array.from(new Set(matched.map((a: any) => a.account_name).filter(Boolean)));
  };

  // Unified Seller Account list strictly filtered by selected Company / Partner
  const availableSellerAccounts = getAccountsForEntity(orderForm.company);

  const filteredSellerAccounts = availableSellerAccounts.filter((acc: string) =>
    acc.toLowerCase().includes((sellerSearch || orderForm.seller_account || '').toLowerCase())
  );

  // Drag & Drop Image Handler
  const processUploadedImageFile = async (file: File) => {
    try {
      setUploadingImage(true);
      let imgUrl = '';
      try {
        const uploadRes = await uploadApi.uploadFile(file);
        imgUrl = uploadRes.data?.file_url || '';
      } catch {
        imgUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      if (imgUrl) {
        setOrderForm(prev => ({ ...prev, product_image: imgUrl }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processUploadedImageFile(file);
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedImageFile(file);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      // Only update order_status — never touch status (which is the purchase workflow status)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
      await ordersApi.update(orderId, { order_status: newStatus });
    } catch (err) {
      console.error('Failed to update status', err);
      loadData();
    }
  };

  const toggleP = async (order: any) => {
    const newP = !order.p;
    try {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, p: newP } : o));
      await ordersApi.update(order.id, { p: newP });
    } catch (err) {
      console.error('Failed to update P flag', err);
      loadData();
    }
  };

  const openPurchaseModal = (order: any, isInStock: boolean = false) => {
    setSelectedOrderForPurchase(order);
    const matchedInv = inventoryList.find((item: any) =>
      (order.product_id && item.id === order.product_id) ||
      (item.product_name && order.product_name && item.product_name.toLowerCase() === order.product_name.toLowerCase())
    );
    const existingPur = purchasesList.find((p: any) => p.order_id === order.id);
    const isStock = isInStock !== undefined ? isInStock : Boolean(existingPur?.is_in_stock || existingPur?.notes?.includes('In-Stock') || existingPur?.purchase_partner_name === 'In Stock');

    setPurchaseForm({
      order_id: order.id,
      order_number: order.order_number || `#ORD-${order.id}`,
      order_date: existingPur?.order_date || order.order_process_date || order.order_date || new Date().toISOString().split('T')[0],
      product_name: existingPur?.product_name || order.product_name || '',
      sku: existingPur?.sku || matchedInv?.sku || '',
      gst_type: existingPur?.gst_type || 'GST',
      bank: existingPur?.bank || '',
      po_number: existingPur?.po_number || '',
      purchase_value: existingPur?.purchase_value || order.purchase_cost_inr || 0,
      other_cost: existingPur?.other_cost || 0,
      extra_cost: existingPur?.extra_cost || 0,
      delivery_code: existingPur?.delivery_code || order.oi || order.shipment_id || '',
      estimated_shipment_date: existingPur?.estimated_shipment_date || new Date().toISOString().split('T')[0],
      account_name: existingPur?.account_name || order.account_name || '',
      purchase_partner_name: existingPur?.purchase_partner_name || (isStock ? (order.seller_account || order.account_name || 'In-Stock Inventory') : (order.seller_account || order.account_name || 'Aryastore Partner')),
      payment_status: existingPur?.payment_status || 'Paid',
      notes: existingPur?.notes || (isStock ? 'In-Stock Purchase Entry' : ''),
      company: existingPur?.company || order.company || 'ADBH',
      qty: existingPur?.qty || order.qty || 1,
      direct_to_shipment: true,
      is_in_stock: isStock,
    });
    setShowPurchaseModal(true);
  };

  const handleMarkInStock = (order: any) => {
    openPurchaseModal(order, true);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForPurchase) return;

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
      if (!purchaseForm.bank?.trim()) {
        alert('Please enter the Bank / Payment Mode');
        return;
      }
      if (!purchaseForm.estimated_shipment_date) {
        alert('Please enter the Arrived Delivery Date');
        return;
      }
    }

    try {
      const totalCost = isNaN(pVal) ? 0 : pVal;
      const isStock = Boolean(purchaseForm.is_in_stock);
      const purStatus = isStock ? 'Received' : 'Pending';
      const ordStatus = isStock ? 'In Stock' : 'Purchase Pending';

      await purchasesApi.create({
        order_id: purchaseForm.order_id,
        order_date: purchaseForm.order_date || new Date().toISOString().split('T')[0],
        product_name: purchaseForm.product_name || selectedOrderForPurchase.product_name || 'Item',
        sku: purchaseForm.sku || null,
        gst_type: purchaseForm.gst_type || 'GST',
        bank: purchaseForm.bank || (isStock ? 'In Stock' : null),
        po_number: purchaseForm.po_number || null,
        purchase_value: totalCost,
        other_cost: 0,
        extra_cost: 0,
        delivery_code: purchaseForm.delivery_code || selectedOrderForPurchase.oi || null,
        estimated_shipment_date: purchaseForm.estimated_shipment_date || new Date().toISOString().split('T')[0],
        account_name: purchaseForm.account_name || selectedOrderForPurchase.account_name || null,
        purchase_partner_name: purchaseForm.purchase_partner_name?.trim() || (isStock ? 'In Stock' : 'Self / Vendor'),
        payment_status: purchaseForm.payment_status || 'Paid',
        status: purStatus,
        notes: purchaseForm.notes || (isStock ? 'In-Stock Order' : null),
        company: purchaseForm.company || selectedOrderForPurchase.company || 'ADBH',
        qty: parseInt(String(purchaseForm.qty)) || selectedOrderForPurchase.qty || 1,
      });

      await ordersApi.update(purchaseForm.order_id, {
        purchase_cost_inr: totalCost,
        oi: purchaseForm.delivery_code || selectedOrderForPurchase.oi,
        qty: parseInt(String(purchaseForm.qty)) || selectedOrderForPurchase.qty || 1,
        arriving_date: purchaseForm.estimated_shipment_date || null,
        status: ordStatus
      });

      setShowPurchaseModal(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Error saving purchase entry';
      alert(msg);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      await ordersApi.delete(orderId);
    } catch (err) {
      console.error('Failed to delete order', err);
      loadData();
    }
  };

  const openAddModalHandler = () => {
    const nextShipmentId = getNextSequentialShipmentId(orders);
    if (urlFetchTimeoutRef.current) clearTimeout(urlFetchTimeoutRef.current);
    setFetchingUrlImage(false);
    setUrlFetchStatus(null);
    const defaultCompany = companyItems[0] || (partnerItems[0] || 'ADBH');
    const initialAccounts = getAccountsForEntity(defaultCompany);
    const defaultSellerAccount = initialAccounts.length === 1 ? initialAccounts[0] : '';
    setOrderForm({
      order_process_date: new Date().toISOString().split('T')[0],
      shipping_date: '',
      last_delivery_date: '',
      arriving_date: '',
      company: defaultCompany,
      shipment_id: nextShipmentId,
      order_number: '',
      seller_account: defaultSellerAccount,
      product_name: '',
      product_url: '',
      product_image: '',
      qty: 1,
      price_usd: 0,
      order_status: 'ADBH',
      consignee_name: '',
      shipment_address_1: '',
      shipment_address_2: '',
      city: '',
      state: '',
      zip_code: '',
      mobile_number: '',
      country: '',
      status: 'ADBH'
    });
    setSellerSearch(defaultSellerAccount);
    setShowAddModal(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...orderForm,
        status: orderForm.status || 'Pending',
        order_status: orderForm.order_status || 'ADBH',
        price_usd: parseFloat(orderForm.price_usd as any) || 0,
        qty: parseInt(orderForm.qty as any) || 1,
        order_process_date: orderForm.order_process_date || null,
        shipping_date: orderForm.shipping_date || null,
        last_delivery_date: orderForm.last_delivery_date || null,
        arriving_date: orderForm.arriving_date || null,
      };
      await ordersApi.create(payload);
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to create order', err);
      const msg = err.response?.data?.detail || 'Error creating order. Please check inputs.';
      alert(msg);
    }
  };

  const openEditModal = (ord: any) => {
    setEditingOrder(ord);
    if (urlFetchTimeoutRef.current) clearTimeout(urlFetchTimeoutRef.current);
    setFetchingUrlImage(false);
    setUrlFetchStatus(null);
    setOrderForm({
      order_process_date: ord.order_process_date || ord.order_date || new Date().toISOString().split('T')[0],
      shipping_date: ord.shipping_date || '',
      last_delivery_date: ord.last_delivery_date || '',
      arriving_date: ord.arriving_date || '',
      company: ord.company || '',
      shipment_id: ord.shipment_id || '',
      order_number: ord.order_number || '',
      seller_account: ord.seller_account || '',
      product_name: ord.product_name || '',
      product_url: ord.product_url || '',
      product_image: ord.product_image || '',
      qty: ord.qty || 1,
      price_usd: ord.price_usd || ord.product_price || 0,
      order_status: ord.order_status || 'ADBH',
      consignee_name: ord.consignee_name || ord.buyer_name || '',
      shipment_address_1: ord.shipment_address_1 || '',
      shipment_address_2: ord.shipment_address_2 || '',
      city: ord.city || '',
      state: ord.state || '',
      zip_code: ord.zip_code || '',
      mobile_number: ord.mobile_number || '',
      country: ord.country || '',
      status: ord.status || 'Pending'
    });
    setSellerSearch(ord.seller_account);
    setShowEditModal(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      const payload = {
        ...orderForm,
        status: editingOrder.status || 'Pending',
        order_status: orderForm.order_status || 'ADBH',
        price_usd: parseFloat(orderForm.price_usd as any) || 0,
        qty: parseInt(orderForm.qty as any) || 1,
        order_process_date: orderForm.order_process_date || null,
        shipping_date: orderForm.shipping_date || null,
        last_delivery_date: orderForm.last_delivery_date || null,
        arriving_date: orderForm.arriving_date || null,
      };
      await ordersApi.update(editingOrder.id, payload);
      setShowEditModal(false);
      setEditingOrder(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to update order', err);
      const msg = err.response?.data?.detail || 'Error updating order.';
      alert(msg);
    }
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCsv(true);
    setCsvError(null);
    setCsvSuccess(null);

    try {
      const res = await ordersApi.uploadCsv(file);
      setCsvSuccess(res.data?.message || 'CSV imported successfully!');
      loadData();
    } catch (err: any) {
      setCsvError(err.response?.data?.detail || 'Failed to parse CSV file.');
    } finally {
      setUploadingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openLabelModal = (order: any) => {
    setSelectedOrderForLabel(order);
    setLabelCostInput(order.label_cost_usd || 0);
    setLabelFreeInput(order.label_free || false);
    setLabelExtractedId(order.label_tracking_id || null);
    setLabelUploadError(null);
    setShowLabelModal(true);
  };

  const handleLabelFileUpload = async (file: File) => {
    if (!selectedOrderForLabel) return;
    setLabelUploading(true);
    setLabelUploadError(null);
    try {
      const res = await ordersApi.uploadLabelPdf(
        selectedOrderForLabel.id,
        file,
        labelFreeInput ? 0 : labelCostInput,
        labelFreeInput
      );
      const data = res.data;
      setLabelExtractedId(data.tracking_id_extracted || null);
      // Update order in local state
      setOrders(prev => prev.map(o => o.id === selectedOrderForLabel.id ? {
        ...o,
        label_pdf_url: data.label_pdf_url,
        label_cost_usd: labelFreeInput ? 0 : labelCostInput,
        label_free: labelFreeInput,
        label_tracking_id: data.tracking_id_extracted || o.label_tracking_id,
        shipment_id: data.tracking_id_extracted || o.shipment_id,
      } : o));
      if (!data.tracking_id_extracted) {
        setLabelUploadError('Label saved. No tracking ID could be extracted from this PDF.');
      }
    } catch (err: any) {
      setLabelUploadError(err.response?.data?.detail || 'Failed to upload label PDF.');
    } finally {
      setLabelUploading(false);
      if (labelFileInputRef.current) labelFileInputRef.current.value = '';
    }
  };

  const handleSaveLabelCost = async () => {
    if (!selectedOrderForLabel) return;
    try {
      await ordersApi.update(selectedOrderForLabel.id, {
        label_cost_usd: labelFreeInput ? 0 : labelCostInput,
        label_free: labelFreeInput,
      });
      setOrders(prev => prev.map(o => o.id === selectedOrderForLabel.id ? {
        ...o,
        label_cost_usd: labelFreeInput ? 0 : labelCostInput,
        label_free: labelFreeInput,
      } : o));
      setShowLabelModal(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save label cost.');
    }
  };

  const roleName = currentUser?.role_name || (currentUser?.is_admin ? 'Super Admin' : 'Employee');
  const isAllowed = currentUser?.is_admin || hasPermission(currentUser, 'orders:read');
  const canEdit = currentUser?.is_admin || hasPermission(currentUser, 'orders:write');

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center bg-white border border-[#c3c4c7] p-8 max-w-lg mx-auto mt-10 rounded-sm shadow-xs">
        <ShieldAlert className="w-12 h-12 text-[#d63638] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1d2327]">Access Restricted</h2>
        <p className="text-xs text-[#50575e] mt-1">
          Your role (<strong className="text-[#1d2327]">{roleName}</strong>) does not have permission to view or manage orders.
        </p>
      </div>
    );
  }

  // Filtered Inventory items for product search
  const matchingProductItems = inventoryList.filter((item: any) =>
    item.product_name?.toLowerCase().includes((orderForm.product_name || '').toLowerCase()) ||
    item.sku?.toLowerCase().includes((orderForm.product_name || '').toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-[#c3c4c7] shadow-xs rounded-sm">
        <div>
          <h1 className="text-xl font-bold text-[#1d2327] flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-[#2271b1] flex items-center justify-center text-white shadow-xs">
              <ShoppingCart className="w-4.5 h-4.5" />
            </div>
            Orders Directory
          </h1>
          <p className="text-xs text-[#50575e] mt-0.5">
            Full enterprise sales ledger & order tracking
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCsv}
              className="px-3.5 py-1.5 bg-white border border-[#c3c4c7] hover:bg-[#f0f0f1] text-[#2c3338] text-xs font-bold rounded-sm shadow-xs transition-all flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-[#2271b1]" />
              <span>{uploadingCsv ? 'Importing...' : 'Upload CSV'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCsvFileChange}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={openAddModalHandler}
              className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Order</span>
            </button>
          </div>
        )}
      </div>

      {/* CSV Alert Notifications */}
      {csvSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-sm text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">{csvSuccess}</span>
          </div>
          <button onClick={() => setCsvSuccess(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}
      {csvError && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-sm text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="font-bold">{csvError}</span>
          </div>
          <button onClick={() => setCsvError(null)} className="text-red-700 hover:text-red-900 font-bold">×</button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-3.5 shadow-xs rounded-sm space-y-3">
        {/* Row 1: Order Status Filter Pills */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedStatus('All')}
              className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border ${selectedStatus === 'All'
                ? 'bg-[#2271b1] text-white border-[#135e96]'
                : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                }`}
            >
              All ({orders.filter(o => isAllowedCompany(o.company)).length})
            </button>

            {/* Due Purchase Filter Pill */}
            <button
              onClick={() => setSelectedStatus(selectedStatus === 'Due Purchase' ? 'All' : 'Due Purchase')}
              className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedStatus === 'Due Purchase'
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : duePurchaseCount > 0
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                }`}
              title="Orders where purchase is due (within 5 days before delivery or overdue)"
            >
              <Clock className={`w-3.5 h-3.5 ${selectedStatus === 'Due Purchase' ? 'text-white' : duePurchaseCount > 0 ? 'text-amber-700 animate-pulse' : 'text-[#50575e]'}`} />
              <span>Due Purchase (5d)</span>
              {duePurchaseCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${selectedStatus === 'Due Purchase' ? 'bg-white text-amber-700' : 'bg-amber-600 text-white'}`}>
                  {duePurchaseCount}
                </span>
              )}
            </button>

            {ORDER_STATUS_OPTIONS.map(st => {
              const count = orders.filter(o => isAllowedCompany(o.company) && (o.order_status || 'ADBH').toLowerCase() === st.toLowerCase()).length;
              return (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(selectedStatus.toLowerCase() === st.toLowerCase() ? 'All' : st)}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all border ${selectedStatus.toLowerCase() === st.toLowerCase()
                    ? 'bg-[#2271b1] text-white border-[#135e96]'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick Clear Button */}
          {(selectedCompany !== 'All' || selectedSellerAccount !== 'All' || selectedPurchaseStatus !== 'All' || selectedStatus !== 'All' || startDate || endDate || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCompany('All');
                setSelectedSellerAccount('All');
                setSelectedPurchaseStatus('All');
                setSelectedStatus('All');
                setDateFieldType('order_process_date');
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#f0f0f1] text-[#d63638] font-bold border border-[#c3c4c7] rounded-xs transition-all shadow-xs text-xs ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Row 2: Secondary Dropdown Filters & Search Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-[#e0e0e0]">
          {/* Company / Person Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5">Company / Person</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs font-bold text-[#1d2327] outline-none focus:border-[#2271b1] cursor-pointer"
            >
              <option value="All">All Companies ({orders.filter(o => isAllowedCompany(o.company)).length})</option>
              {companyItems.map(comp => (
                <option key={comp} value={comp}>
                  {comp} ({orders.filter(o => o.company?.toLowerCase() === comp.toLowerCase()).length})
                </option>
              ))}
            </select>
          </div>

          {/* Seller Account Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5">Seller Account</label>
            <select
              value={selectedSellerAccount}
              onChange={(e) => setSelectedSellerAccount(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs font-bold text-[#1d2327] outline-none focus:border-[#2271b1] cursor-pointer"
            >
              <option value="All">All Accounts ({sellerAccountOptions.length})</option>
              {sellerAccountOptions.map(acc => (
                <option key={acc} value={acc}>
                  {acc} ({orders.filter(o => o.seller_account?.toLowerCase() === acc.toLowerCase()).length})
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Action Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5">Purchase Action</label>
            <select
              value={selectedPurchaseStatus}
              onChange={(e) => setSelectedPurchaseStatus(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs font-bold text-[#1d2327] outline-none focus:border-[#2271b1] cursor-pointer"
            >
              <option value="All">All Purchase Actions</option>
              <option value="due">⚠️ Due Purchase (≤ 5d)</option>
              <option value="in_stock">🚚 In Stock</option>
              <option value="purchased">✓ Purchased</option>
              <option value="pending">⏳ Pending Purchase</option>
            </select>
          </div>

          {/* Date Field Type */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5">Filter Date By</label>
            <select
              value={dateFieldType}
              onChange={(e) => setDateFieldType(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs font-bold text-[#1d2327] outline-none focus:border-[#2271b1] cursor-pointer"
            >
              <option value="order_process_date">Order Process Date</option>
              <option value="shipping_date">Shipping Date</option>
              <option value="last_delivery_date">Last Delivery Date</option>
              <option value="arriving_date">Arriving Date</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-0.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#8c8f94] rounded-xs text-xs font-medium outline-none focus:border-[#2271b1]"
            />
          </div>

          {/* End Date */}
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

        {/* Row 3: Search Box & Active Filter Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#e0e0e0]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#50575e] absolute left-3 top-2" />
            <input
              type="text"
              placeholder="Search Order #, Consignee, Product, Seller Account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#8c8f94] text-xs pl-9 pr-3 py-1.5 rounded-xs focus:border-[#2271b1] outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[#50575e] hover:text-[#1d2327] font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Active Results Counter & Filter Tags */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-[#50575e]">
            <span className="font-semibold text-[#1d2327]">Showing:</span>
            <span className="font-bold text-[#2271b1]">{filteredOrders.length}</span>
            <span>of {orders.filter(o => isAllowedCompany(o.company)).length} orders</span>

            {selectedCompany !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e8f3fc] text-[#2271b1] font-bold rounded-xs border border-[#72aee6] text-[11px]">
                Company: {selectedCompany}
                <button onClick={() => setSelectedCompany('All')} className="hover:text-red-600 font-bold ml-0.5">✕</button>
              </span>
            )}
            {selectedSellerAccount !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e8f3fc] text-[#2271b1] font-bold rounded-xs border border-[#72aee6] text-[11px]">
                Seller: {selectedSellerAccount}
                <button onClick={() => setSelectedSellerAccount('All')} className="hover:text-red-600 font-bold ml-0.5">✕</button>
              </span>
            )}
            {selectedPurchaseStatus !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 font-bold rounded-xs border border-amber-300 text-[11px]">
                Purchase: {selectedPurchaseStatus === 'due' ? 'Due (5d)' : selectedPurchaseStatus}
                <button onClick={() => setSelectedPurchaseStatus('All')} className="hover:text-red-600 font-bold ml-0.5">✕</button>
              </span>
            )}
            {selectedStatus !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f0f0f1] text-[#1d2327] font-bold rounded-xs border border-[#c3c4c7] text-[11px]">
                Status: {selectedStatus}
                <button onClick={() => setSelectedStatus('All')} className="hover:text-red-600 font-bold ml-0.5">✕</button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f0f0f1] text-[#1d2327] font-bold rounded-xs border border-[#c3c4c7] text-[11px]">
                Date ({dateFieldType.replace(/_/g, ' ')}): {startDate || '...'} to {endDate || '...'}
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-red-600 font-bold ml-0.5">✕</button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* WP Admin Orders Table */}
      <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-7 h-7 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-[#50575e] font-semibold">Loading orders dataset...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="w-10 h-10 text-[#a7aaad] mx-auto mb-2" />
            <p className="text-xs text-[#50575e]">No matching orders found. Click "Add Order" or "Upload CSV" to create.</p>
          </div>
        ) : (
          <>
            <div className="table-container overflow-x-auto">
              <ResizableTable className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f0f0f1] text-[#1d2327] font-bold border-b border-[#c3c4c7] whitespace-nowrap">
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center w-12">No.</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Order Process Date</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipping Date</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Last Delivery Date</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Arriving Date</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center min-w-[110px]">Company / Person</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Shipment ID</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Order ID</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Seller Account</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[200px] max-w-[240px]">Product Name</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Qty</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Price ($)</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Order Status</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center min-w-[210px]">Purchase Action</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Consignee Name</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Address Line 1</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Address Line 2</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">City</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">State</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Zip Code</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Contact Number</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Country</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center min-w-[140px]">Label</th>
                    <th className="py-2.5 px-3 text-center sticky right-0 bg-[#f0f0f1] border-l border-[#c3c4c7] shadow-[-2px_0_4px_rgba(0,0,0,0.06)] z-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dcdcde] text-[#2c3338]">
                  {filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((ord, index) => {
                    const isEven = index % 2 === 0;
                    const matchingPur = purchasesList.find((p: any) => p.order_id === ord.id);
                    const arriveDate = ord.arriving_date || matchingPur?.estimated_shipment_date || '—';
                    const companyColorMap: { [key: string]: string } = {
                      ADBH: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                      'ADBH-RBS': 'bg-emerald-100 text-emerald-900 border-emerald-300',
                      Vetai: 'bg-blue-100 text-blue-900 border-blue-300',
                      Veta: 'bg-blue-100 text-blue-900 border-blue-300',
                      Globle: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                      canton: 'bg-amber-100 text-amber-900 border-amber-300',
                    };
                    const isPartner = partnerItems.some(p => p.toLowerCase() === ord.company?.toLowerCase());
                    const companyBadgeStyle = isPartner
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : (companyColorMap[ord.company] || 'bg-slate-100 text-slate-900 border-slate-300');

                    return (
                      <tr key={ord.id} className={`group ${isEven ? 'bg-white' : 'bg-[#f6f7f7]'} hover:bg-[#e8f3fc] transition-colors whitespace-nowrap`}>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] text-center font-bold text-[#50575e]">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-medium">{ord.order_process_date || ord.order_date || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-medium text-[#50575e]">{ord.shipping_date || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-medium text-[#50575e]">{ord.last_delivery_date || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-medium text-[#50575e]">{arriveDate}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] text-center">
                          <span className={`inline-flex items-center justify-center px-2.5 py-0.5 min-w-[70px] text-[11px] font-bold rounded-xs border ${companyBadgeStyle}`}>
                            {ord.company || 'ADBH'}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-mono text-[#2271b1] font-semibold">{ord.shipment_id || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-mono font-bold text-[#1d2327]">{ord.order_number}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-medium max-w-[150px] truncate">{ord.seller_account || ''}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-semibold text-[#1d2327] max-w-[220px] truncate" title={ord.product_name}>
                          <div className="flex items-center gap-2">
                            {ord.product_image && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={getImageUrl(ord.product_image)}
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                                className="w-5 h-5 rounded-xs object-cover border border-[#c3c4c7] shrink-0"
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
                        <td className="py-2 px-3 border-r border-[#e0e0e0] text-center font-bold">{ord.qty}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-bold text-emerald-700">${(ord.price_usd || ord.product_price || 0).toFixed(2)}</td>
                        <td className="py-1.5 px-2 border-r border-[#e0e0e0] text-center">
                          {(() => {
                            const cur = (ord.order_status || 'ADBH').trim();
                            const matchedStatus = ORDER_STATUS_OPTIONS.find(opt => opt.toLowerCase() === cur.toLowerCase()) || cur;
                            const s = matchedStatus.toLowerCase();
                            const colorClass = 
                              (s === 'in stock' || s === 'instock') ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200' :
                              s === 'adbh' ? 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200' :
                              s === 'canton' ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' :
                              s === 'doweta' ? 'bg-orange-100 text-orange-900 border-orange-300 hover:bg-orange-200' :
                              'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200';

                            return (
                              <select
                                value={matchedStatus}
                                onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                                className={`px-2 py-1 font-bold text-[10px] uppercase rounded-xs border outline-none cursor-pointer transition-all ${colorClass}`}
                              >
                                {ORDER_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status} className="bg-white text-[#1d2327] font-bold">
                                    {status}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] text-center">
                          {(() => {
                            const matchingPur = purchasesList.find((p: any) => p.order_id === ord.id);
                            const isStockDone = Boolean(
                              matchingPur && (
                                matchingPur.is_in_stock ||
                                matchingPur.notes?.includes('In-Stock') ||
                                matchingPur.purchase_partner_name === 'In Stock' ||
                                matchingPur.bank === 'In Stock'
                              )
                            );
                            const isPurchaseDone = Boolean(matchingPur && !isStockDone);
                            const actionTimestamp = formatActionDateTime(matchingPur?.created_at, ord.order_process_date || ord.order_date);

                            if (isStockDone) {
                              return (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-xs bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                                      <Truck className="w-3 h-3 text-emerald-700" />
                                      <span>In Stock</span>
                                    </span>
                                    <button
                                      onClick={() => openPurchaseModal(ord, true)}
                                      className="p-1 hover:bg-[#2271b1] hover:text-white text-[#2271b1] rounded-xs transition-colors"
                                      title="Edit In-Stock Entry"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {actionTimestamp && (
                                    <span className="text-[10px] text-[#50575e] font-mono whitespace-nowrap">
                                      {actionTimestamp}
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            if (isPurchaseDone) {
                              const pVal = matchingPur?.purchase_value || ord.purchase_cost_inr || 0;
                              return (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-xs bg-blue-100 text-blue-900 border border-blue-300 shadow-xs">
                                      <CheckCircle2 className="w-3 h-3 text-blue-700" />
                                      <span>
                                        {pVal > 0 ? `Purchased` : 'Purchased'}
                                      </span>
                                    </span>
                                    <button
                                      onClick={() => openPurchaseModal(ord, false)}
                                      className="p-1 hover:bg-[#2271b1] hover:text-white text-[#2271b1] rounded-xs transition-colors"
                                      title="Edit Purchase Entry"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {actionTimestamp && (
                                    <span className="text-[10px] text-[#50575e] font-mono whitespace-nowrap">
                                      {actionTimestamp}
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            const dueInfo = getDuePurchaseDate(ord.last_delivery_date, ord.shipping_date);

                            return (
                              <div className="flex flex-col items-center justify-center gap-1.5 py-0.5">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleMarkInStock(ord)}
                                    className="px-2.5 py-1 bg-[#00a32a] hover:bg-[#008a20] text-white font-bold text-[11px] rounded-xs flex items-center gap-1 transition-all shadow-xs shrink-0"
                                    title="Item is already in stock - send directly to Shipments"
                                  >
                                    <Truck className="w-3 h-3" />
                                    <span>In Stock</span>
                                  </button>
                                  <button
                                    onClick={() => openPurchaseModal(ord)}
                                    className="px-2.5 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-[11px] rounded-xs flex items-center gap-1 transition-all shadow-xs shrink-0"
                                    title="Create purchase order entry"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Purchase Entry</span>
                                  </button>
                                </div>
                                {dueInfo && (
                                  <span
                                    className={`px-2 py-0.5 rounded-xs text-[10px] font-bold border inline-flex items-center gap-1 whitespace-nowrap shadow-2xs ${
                                      dueInfo.isOverdue
                                        ? 'bg-red-100 text-red-900 border-red-300'
                                        : 'bg-amber-100 text-amber-900 border-amber-300'
                                    }`}
                                    title={`Purchase Due Date: ${dueInfo.formatted} (5 days before delivery: ${ord.last_delivery_date || ord.shipping_date})`}
                                  >
                                    <Clock className={`w-3 h-3 shrink-0 ${dueInfo.isOverdue ? 'text-red-700 animate-pulse' : 'text-amber-700 animate-pulse'}`} />
                                    <span>
                                      Due: {dueInfo.formatted}
                                      {dueInfo.isOverdue
                                        ? ` (${Math.abs(dueInfo.daysLeft)}d overdue)`
                                        : ' (Due Today!)'}
                                    </span>
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327] max-w-[150px] truncate">{ord.consignee_name || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] max-w-[180px] truncate" title={ord.shipment_address_1}>{ord.shipment_address_1 || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] text-[#50575e] max-w-[140px] truncate">{ord.shipment_address_2 || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-medium">{ord.city || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] uppercase font-bold text-[#50575e] text-center">{ord.state || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-mono text-center">{ord.zip_code || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-mono text-[#50575e] text-center">{ord.mobile_number || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-bold uppercase text-center">{ord.country || 'USA'}</td>
                        {/* ── Label Cell ── */}
                        <td className="py-1.5 px-2 border-r border-[#e0e0e0] text-center">
                          {ord.label_pdf_url ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <a
                                href={`/backend-api/orders/${ord.id}/download-label?download=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={`${ord.label_tracking_id || ord.order_number || 'label'} - ${ord.product_name}.pdf`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-xs text-[11px] font-bold hover:bg-indigo-200 transition-colors shadow-2xs"
                                title="Download Label PDF"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Label</span>
                              </a>
                              {canEdit && (
                                <button
                                  onClick={() => openLabelModal(ord)}
                                  className="p-1 text-[#2271b1] hover:text-[#135e96] hover:bg-[#f0f0f1] rounded-xs transition-colors"
                                  title="Update label PDF & cost"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            canEdit ? (
                              <button
                                onClick={() => openLabelModal(ord)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-dashed border-[#8c8f94] hover:border-[#2271b1] hover:bg-[#e8f3fc] text-[#50575e] hover:text-[#2271b1] rounded-xs text-[11px] font-semibold transition-all"
                                title="Upload label PDF"
                              >
                                <Tag className="w-3 h-3" />
                                <span>Label</span>
                              </button>
                            ) : (
                              <span className="text-[#a7aaad] text-[11px]">—</span>
                            )
                          )}
                        </td>
                        <td className={`py-2 px-3 text-center sticky right-0 border-l border-[#c3c4c7] shadow-[-2px_0_4px_rgba(0,0,0,0.06)] z-10 ${isEven ? 'bg-white group-hover:bg-[#e8f3fc]' : 'bg-[#f6f7f7] group-hover:bg-[#e8f3fc]'
                          }`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(ord)}
                              className="p-1 hover:bg-[#2271b1] hover:text-white text-[#2271b1] rounded-xs transition-colors"
                              title="Edit Order"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(ord.id)}
                              className="p-1 hover:bg-red-600 hover:text-white text-red-600 rounded-xs transition-colors"
                              title="Delete Order"
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

            {/* Pagination Controls Footer */}
            <div className="p-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-[#50575e]">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-[#1d2327]">{filteredOrders.length} entries</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#50575e]">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-[#8c8f94] text-xs font-semibold px-2 py-0.5 rounded-sm focus:border-[#2271b1] outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-white border border-[#c3c4c7] text-[#2c3338] font-bold rounded-sm hover:bg-[#f0f0f1] disabled:opacity-40 transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <span className="font-bold text-[#1d2327]">
                    Page {currentPage} of {Math.ceil(filteredOrders.length / pageSize) || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredOrders.length / pageSize)))}
                    disabled={currentPage >= Math.ceil(filteredOrders.length / pageSize)}
                    className="px-2.5 py-1 bg-white border border-[#c3c4c7] text-[#2c3338] font-bold rounded-sm hover:bg-[#f0f0f1] disabled:opacity-40 transition-all flex items-center gap-1"
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

      {/* --- ADD / EDIT ORDER MODAL --- */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4 bg-black/50">
          <div className="modal-content bg-white border border-[#c3c4c7] w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#c3c4c7] bg-[#f6f7f7] flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-[#1d2327] flex items-center gap-2">
                <ShoppingCart className="w-4.5 h-4.5 text-[#2271b1]" />
                {showEditModal ? `Edit Order Record: ${orderForm.order_number}` : 'Add Order'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingOrder(null);
                }}
                className="text-[#50575e] hover:text-[#1d2327] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showEditModal ? handleUpdateOrder : handleCreateOrder} className="p-5 space-y-5 overflow-y-auto text-xs">

              {/* COMPANY & ORDER DETAILS */}
              <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-4 rounded-sm space-y-4">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider border-b border-[#c3c4c7] pb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#2271b1]" />
                  Company & Order Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Company / Person *</label>
                    <select
                      value={orderForm.company}
                      onChange={(e) => {
                        const newComp = e.target.value;
                        const matchingAccounts = getAccountsForEntity(newComp);
                        const isValidCurrentAcc = matchingAccounts.includes(orderForm.seller_account);
                        const newSellerAcc = isValidCurrentAcc
                          ? orderForm.seller_account
                          : (matchingAccounts.length === 1 ? matchingAccounts[0] : '');

                        setOrderForm({
                          ...orderForm,
                          company: newComp,
                          seller_account: newSellerAcc
                        });
                        setSellerSearch(newSellerAcc);
                        if (matchingAccounts.length > 0 && !isValidCurrentAcc) {
                          setShowSellerDropdown(true);
                        }
                      }}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-bold outline-none focus:border-[#2271b1]"
                      required
                    >
                      <option value="">— Select Company or Partner —</option>
                      {companyItems.length > 0 && (
                        <optgroup label="Companies">
                          {companyItems.map(c => (
                            <option key={`c-${c}`} value={c}>
                              [Company] {c}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {partnerItems.length > 0 && (
                        <optgroup label="Partners">
                          {partnerItems.map(p => (
                            <option key={`p-${p}`} value={p}>
                              [Partner] {p}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Order Process Date *</label>
                    <input
                      type="date"
                      value={orderForm.order_process_date}
                      onChange={(e) => setOrderForm({ ...orderForm, order_process_date: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-semibold outline-none focus:border-[#2271b1]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Shipping Date *</label>
                    <input
                      type="date"
                      value={orderForm.shipping_date}
                      onChange={(e) => setOrderForm({ ...orderForm, shipping_date: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-semibold outline-none focus:border-[#2271b1]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Last Delivery Date *</label>
                    <input
                      type="date"
                      value={orderForm.last_delivery_date}
                      onChange={(e) => setOrderForm({ ...orderForm, last_delivery_date: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-semibold outline-none focus:border-[#2271b1]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Order ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. 114-9593444-6125814"
                      value={orderForm.order_number}
                      onChange={(e) => setOrderForm({ ...orderForm, order_number: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#1d2327] outline-none focus:border-[#2271b1]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Shipment ID</label>
                    <input
                      type="text"
                      placeholder="e.g. INBTLAUG819"
                      value={orderForm.shipment_id}
                      onChange={(e) => setOrderForm({ ...orderForm, shipment_id: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono font-bold text-[#2271b1] outline-none focus:border-[#2271b1]"
                    />
                  </div>

                  {/* Searchable Seller Account Dropdown */}
                  <div className="relative" ref={sellerDropdownRef}>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                      <span>Seller Account *</span>
                      <span className="text-[10px] text-[#50575e] font-normal">
                        {orderForm.company ? `Filtered for ${orderForm.company}` : 'Select or Search'}
                      </span>
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder={
                          orderForm.company
                            ? `Search or Select ${orderForm.company} Account...`
                            : "Search or Select Seller Account..."
                        }
                        value={orderForm.seller_account}
                        onFocus={() => {
                          setSellerSearch(orderForm.seller_account);
                          setShowSellerDropdown(true);
                        }}
                        onChange={(e) => {
                          setSellerSearch(e.target.value);
                          setOrderForm({ ...orderForm, seller_account: e.target.value });
                          setShowSellerDropdown(true);
                        }}
                        className="w-full bg-white border border-[#8c8f94] p-2 pr-8 font-semibold text-[#1d2327] outline-none focus:border-[#2271b1]"
                        required
                      />
                      <ChevronDown
                        onClick={() => setShowSellerDropdown(prev => !prev)}
                        className="w-4 h-4 text-[#50575e] absolute right-2.5 top-2.5 cursor-pointer"
                      />
                    </div>

                    {/* Filtered Search List Dropdown */}
                    {showSellerDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#c3c4c7] rounded-sm shadow-lg max-h-48 overflow-y-auto">
                        {filteredSellerAccounts.length === 0 ? (
                          <div className="p-3 text-xs text-[#50575e] bg-[#f9f9f9]">
                            {orderForm.company ? (
                              <div>
                                <div className="font-bold text-[#1d2327] mb-0.5">No linked seller accounts found for "{orderForm.company}"</div>
                                <div className="text-[11px] text-[#646970]">You can type a custom account name or link one in the Accounts section.</div>
                              </div>
                            ) : (
                              <div className="italic">Please select a Company / Person first to view associated accounts.</div>
                            )}
                          </div>
                        ) : (
                          filteredSellerAccounts.map((acc) => (
                            <button
                              key={acc}
                              type="button"
                              onClick={() => {
                                setOrderForm({ ...orderForm, seller_account: acc });
                                setSellerSearch(acc);
                                setShowSellerDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-[#2271b1]/10 hover:text-[#2271b1] border-b border-[#e0e0e0] flex items-center justify-between ${orderForm.seller_account === acc ? 'bg-[#2271b1] text-white font-bold' : 'text-[#1d2327]'
                                }`}
                            >
                              <span>{acc}</span>
                              {orderForm.seller_account === acc && <Check className="w-3.5 h-3.5" />}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PRODUCT SPECIFICATIONS & PRICE */}
              <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-4 rounded-sm space-y-4">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider border-b border-[#c3c4c7] pb-2 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#2271b1]" />
                  Product Specifications & Price
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Searchable Product Name Input with Auto-Image and Auto-Price Sync */}
                  <div className="md:col-span-2 relative" ref={productDropdownRef}>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                      <span>Product Name *</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type to search database or enter new product..."
                        value={orderForm.product_name}
                        onFocus={() => setShowProductDropdown(true)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = inventoryList.find((item: any) =>
                            item.product_name?.toLowerCase() === val.toLowerCase()
                          );
                          setOrderForm(prev => ({
                            ...prev,
                            product_name: val,
                            ...(matched ? {
                              product_image: matched.image_url || prev.product_image,
                              price_usd: matched.price || prev.price_usd
                            } : {})
                          }));
                          setShowProductDropdown(true);
                        }}
                        className="w-full bg-white border border-[#8c8f94] p-2 font-semibold text-[#1d2327] outline-none focus:border-[#2271b1]"
                        required
                      />
                    </div>

                    {/* Filtered Search Dropdown for Existing Products - Only renders when matches exist */}
                    {showProductDropdown && matchingProductItems.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#c3c4c7] rounded-sm shadow-lg max-h-56 overflow-y-auto">
                        {matchingProductItems.map((item: any) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setOrderForm(prev => ({
                                ...prev,
                                product_name: item.product_name,
                                product_image: item.image_url || prev.product_image,
                                price_usd: item.price || prev.price_usd,
                              }));
                              setShowProductDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-[#2271b1]/10 border-b border-[#e0e0e0] flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {item.image_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={getImageUrl(item.image_url)} alt="" className="w-7 h-7 rounded-xs object-cover border border-[#c3c4c7] shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-xs bg-[#f6f7f7] border border-[#c3c4c7] flex items-center justify-center text-[#50575e] font-bold text-[10px] shrink-0">
                                  PROD
                                </div>
                              )}
                              <div className="truncate">
                                <div className="font-bold text-[#1d2327] truncate flex items-center gap-2">
                                  <span>{item.product_name}</span>
                                  {item.stock_quantity > 0 && (
                                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[9px] rounded-xs">
                                      📦 {item.stock_quantity} in stock
                                    </span>
                                  )}
                                </div>
                                {item.sku && <div className="text-[10px] text-[#50575e] font-mono">SKU: {item.sku}</div>}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <div className="font-bold text-[#00a32a] font-mono">${(item.price || 0).toFixed(2)}</div>
                              <div className="text-[9px] text-[#2271b1] font-bold">Auto-Pick Image</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <LinkIcon className="w-3.5 h-3.5 text-[#2271b1]" />
                        <span>Product URL</span>
                      </span>
                      {fetchingUrlImage && (
                        <span className="text-[10px] text-[#2271b1] font-bold flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Fetching image...
                        </span>
                      )}
                      {!fetchingUrlImage && urlFetchStatus && (
                        <span className="text-[10px] text-emerald-700 font-bold max-w-[140px] truncate" title={urlFetchStatus}>
                          {urlFetchStatus}
                        </span>
                      )}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="url"
                        placeholder="e.g. https://amazon.com/dp/... or image URL"
                        value={orderForm.product_url || ''}
                        onChange={(e) => handleProductUrlChange(e.target.value)}
                        onBlur={() => {
                          if (orderForm.product_url && !orderForm.product_image) {
                            fetchImageFromUrl(orderForm.product_url);
                          }
                        }}
                        className="w-full bg-white border border-[#8c8f94] p-2 pr-16 text-xs text-[#2271b1] font-semibold outline-none focus:border-[#2271b1]"
                      />
                      <div className="absolute right-1 flex items-center gap-1">
                        {orderForm.product_url && (
                          <a
                            href={orderForm.product_url.startsWith('http') ? orderForm.product_url : `https://${orderForm.product_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-[#50575e] hover:text-[#2271b1] hover:bg-[#f0f0f1] rounded-xs"
                            title="Open URL in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => fetchImageFromUrl(orderForm.product_url)}
                          disabled={fetchingUrlImage || !orderForm.product_url}
                          className="px-1.5 py-0.5 bg-[#f0f0f1] hover:bg-[#2271b1] hover:text-white text-[#2271b1] text-[10px] font-bold rounded-xs transition-colors flex items-center gap-1 border border-[#c3c4c7]"
                          title="Auto-fetch Product Image from URL"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${fetchingUrlImage ? 'animate-spin' : ''}`} />
                          <span>Fetch</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Qty *</label>
                    <input
                      type="number"
                      min="1"
                      value={orderForm.qty}
                      onChange={(e) => setOrderForm({ ...orderForm, qty: parseInt(e.target.value) || 1 })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-bold outline-none focus:border-[#2271b1]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Selling Price ($) *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={orderForm.price_usd === 0 ? '' : orderForm.price_usd}
                      onChange={(e) => setOrderForm({ ...orderForm, price_usd: e.target.value === '' ? '' : (e.target.value as any) })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-emerald-700 outline-none focus:border-[#2271b1]"
                      required
                    />
                  </div>

                  {/* Product Image Display Preview */}
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#2271b1]" />
                        <span>Product Image</span>
                      </span>
                      {orderForm.product_image ? (
                        <span className="text-[10px] text-[#00a32a] font-bold">Image Attached</span>
                      ) : fetchingUrlImage ? (
                        <span className="text-[10px] text-[#2271b1] font-bold animate-pulse">Loading image...</span>
                      ) : null}
                    </label>
                    <div className="h-9 bg-white border border-[#8c8f94] p-1 px-2.5 flex items-center justify-between rounded-xs">
                      {fetchingUrlImage ? (
                        <div className="flex items-center gap-2 text-xs text-[#2271b1]">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span className="font-semibold">Auto-loading image from URL...</span>
                        </div>
                      ) : orderForm.product_image ? (
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageUrl(orderForm.product_image)}
                            alt="Product Preview"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                            className="w-7 h-7 rounded-xs object-cover border border-[#c3c4c7] shrink-0"
                          />
                          <span className="text-[11px] font-semibold text-[#1d2327] truncate">
                            {orderForm.product_name || 'Product Image Preview'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#8c8f94] italic">No image auto-loaded (add URL above)</span>
                      )}
                      {orderForm.product_image && !fetchingUrlImage && (
                        <div className="flex items-center gap-1">
                          <a
                            href={getImageUrl(orderForm.product_image)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2271b1] hover:text-[#135e96] p-0.5 rounded-xs"
                            title="Open full image in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setOrderForm(prev => ({ ...prev, product_image: '' }))}
                            className="text-[#d63638] hover:text-red-800 p-0.5 rounded-xs"
                            title="Remove Image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Drag & Drop Product Image Upload Container */}
                <div className="pt-2 border-t border-[#c3c4c7]">
                  <label className="block text-[11px] font-bold text-[#50575e] mb-1">
                    Product Image Upload (PNG, JPG, WEBP)
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={handleImageDrop}
                    className={`relative border-2 border-dashed rounded-sm p-3 bg-white text-center cursor-pointer transition-all ${isDraggingImage ? 'border-[#2271b1] bg-[#2271b1]/5' : 'border-[#8c8f94] hover:border-[#2271b1]'
                      }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <Upload className="w-4 h-4 text-[#2271b1]" />
                      {uploadingImage ? (
                        <span className="font-bold text-[#2271b1]">Uploading product image...</span>
                      ) : orderForm.product_image ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#00a32a]">Image Attached & Saved</span>
                          <span className="text-[10px] text-[#50575e] font-mono truncate max-w-[240px]">
                            ({orderForm.product_image.substring(0, 35)}...)
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-[#2c3338]">Drag & drop product image file here, or click to browse</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#c3c4c7]">
                  <label className="block font-bold text-[#1d2327] mb-1">
                    Order Status *
                  </label>
                  <select
                    value={orderForm.order_status || 'ADBH'}
                    onChange={(e) => setOrderForm({ ...orderForm, order_status: e.target.value })}
                    className="w-full bg-white border border-[#8c8f94] p-2 font-bold outline-none focus:border-[#2271b1]"
                    required
                  >
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* CONSIGNEE SHIPPING ADDRESS */}
              <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-4 rounded-sm space-y-4">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider border-b border-[#c3c4c7] pb-2">
                  Consignee Shipping Address
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Consignee Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Bindu Devkota"
                      value={orderForm.consignee_name}
                      onChange={(e) => setOrderForm({ ...orderForm, consignee_name: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Contact Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 314-282-9402 ext. 31939"
                      value={orderForm.mobile_number}
                      onChange={(e) => setOrderForm({ ...orderForm, mobile_number: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono outline-none focus:border-[#2271b1]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      placeholder="e.g. 21119 BAYSHORE PALM DR"
                      value={orderForm.shipment_address_1}
                      onChange={(e) => setOrderForm({ ...orderForm, shipment_address_1: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 outline-none focus:border-[#2271b1]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Address Line 2</label>
                    <input
                      type="text"
                      placeholder="e.g. APT 5B"
                      value={orderForm.shipment_address_2}
                      onChange={(e) => setOrderForm({ ...orderForm, shipment_address_2: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 outline-none focus:border-[#2271b1]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. CYPRESS"
                      value={orderForm.city}
                      onChange={(e) => setOrderForm({ ...orderForm, city: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 outline-none focus:border-[#2271b1]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. TX"
                      value={orderForm.state}
                      onChange={(e) => setOrderForm({ ...orderForm, state: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 uppercase font-bold outline-none focus:border-[#2271b1]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Zip Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 77433"
                      value={orderForm.zip_code}
                      onChange={(e) => setOrderForm({ ...orderForm, zip_code: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-mono outline-none focus:border-[#2271b1]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1d2327] mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="e.g. USA"
                      value={orderForm.country}
                      onChange={(e) => setOrderForm({ ...orderForm, country: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] p-2 font-bold uppercase outline-none focus:border-[#2271b1]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#c3c4c7] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setEditingOrder(null);
                  }}
                  className="px-4 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-bold rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold rounded-sm shadow-xs transition-all"
                >
                  {showEditModal ? 'Save Order Changes' : 'Create Order Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PURCHASE / IN-STOCK ENTRY MODAL --- */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl rounded-sm font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className={`px-5 py-3.5 flex items-center justify-between border-b shrink-0 ${purchaseForm.is_in_stock ? 'bg-[#008a20] text-white border-emerald-800' : 'bg-[#1d2327] text-white border-[#2c3338]'
              }`}>
              <div className="flex items-center gap-2">
                {purchaseForm.is_in_stock ? (
                  <Truck className="w-4 h-4 text-emerald-200" />
                ) : (
                  <ShoppingBag className="w-4 h-4 text-[#72aee6]" />
                )}
                <h3 className="text-sm font-bold">
                  {purchaseForm.is_in_stock ? 'In Stock Entry' : 'Purchase Entry'} for Order #{purchaseForm.order_number}
                </h3>
                <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider ${purchaseForm.is_in_stock ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-400/40' : 'bg-blue-900/60 text-blue-200 border border-blue-400/40'
                  }`}>
                  {purchaseForm.is_in_stock ? 'In Stock Mode' : 'Purchase Mode'}
                </span>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="text-white/80 hover:text-white font-bold text-lg leading-none">×</button>
            </div>

            <form onSubmit={handleCreatePurchase} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Context Summary & Cost */}
                <div className="p-3 bg-[#f6f7f7] border border-[#c3c4c7] rounded-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#1d2327] text-sm">{purchaseForm.product_name}</div>
                    <div className="text-[#50575e] mt-0.5 flex items-center gap-3">
                      <span>Company Account: <b className="text-[#1d2327]">{purchaseForm.company}</b></span>
                      <span>Order Required Qty: <b className="text-[#2271b1]">{selectedOrderForPurchase?.qty || 1}</b></span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xs text-right">
                    <div className="text-[10px] text-emerald-800 font-bold uppercase">Total Purchase Cost</div>
                    <div className="text-sm font-extrabold text-emerald-900">₹{(purchaseForm.purchase_value || 0).toFixed(2)}</div>
                  </div>
                </div>

                {/* Notice Banner */}
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

                {purchaseForm.is_in_stock ? (
                  /* IN-STOCK MODE: ONLY QUANTITY & PURCHASE PRICE */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1d2327] mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>Quantity (Qty) *</span>
                        </span>
                        <span className="text-[10px] text-[#50575e] font-normal">Order needs: {selectedOrderForPurchase?.qty || 1}</span>
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
                          <span className="text-[10px] text-[#50575e] font-normal">Order needs: {selectedOrderForPurchase?.qty || 1}</span>
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

                    {/* Row 2: GST / Non GST & Bank */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5 text-blue-600" />
                          <span>GST / Non GST *</span>
                        </label>
                        <select
                          value={purchaseForm.gst_type}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, gst_type: e.target.value })}
                          className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                          required
                        >
                          <option value="GST">GST</option>
                          <option value="Non GST">Non GST</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#1d2327] mb-1 flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Bank / Payment Mode *</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC Bank, ICICI, SBI, Bank Transfer"
                          value={purchaseForm.bank}
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, bank: e.target.value })}
                          className="w-full bg-white border border-[#8c8f94] p-2 font-bold text-[#1d2327] outline-none focus:border-[#2271b1] rounded-xs"
                          required
                        >
                        </input>
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

              {/* Modal Footer */}
              <div className="p-3.5 bg-[#f6f7f7] border-t border-[#c3c4c7] flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-1.5 bg-white hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] font-bold rounded-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-1.5 font-bold rounded-xs shadow-xs text-white transition-all flex items-center gap-1.5 ${purchaseForm.is_in_stock
                    ? 'bg-[#00a32a] hover:bg-[#008a20]'
                    : 'bg-[#2271b1] hover:bg-[#135e96]'
                    }`}
                >
                  {purchaseForm.is_in_stock ? (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Confirm In Stock & Send to Shipments</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Save Purchase Entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Label Upload Modal ── */}
      {showLabelModal && selectedOrderForLabel && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4 bg-black/50">
          <div className="modal-content bg-white border border-[#c3c4c7] w-full max-w-md rounded-sm shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#c3c4c7] bg-[#f6f7f7] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1d2327] flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                Label — Order {selectedOrderForLabel.order_number}
              </h2>
              <button
                onClick={() => setShowLabelModal(false)}
                className="text-[#50575e] hover:text-[#1d2327] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Upload PDF */}
              <div>
                <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-1.5">
                  Upload Label PDF
                </label>
                <div
                  className="border-2 border-dashed border-[#c3c4c7] rounded-sm p-4 text-center hover:border-[#2271b1] transition-colors cursor-pointer"
                  onClick={() => labelFileInputRef.current?.click()}
                >
                  {labelUploading ? (
                    <div className="flex items-center justify-center gap-2 text-[#2271b1]">
                      <div className="w-4 h-4 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold">Uploading & extracting tracking ID...</span>
                    </div>
                  ) : selectedOrderForLabel.label_pdf_url ? (
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="w-6 h-6 text-indigo-500" />
                      <span className="text-[#2271b1] font-bold text-[11px]">Label uploaded ✓</span>
                      <span className="text-[#50575e] text-[10px]">Click to replace with new PDF</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#50575e]">
                      <Upload className="w-6 h-6 text-[#a7aaad]" />
                      <span className="font-semibold">Click to upload label PDF</span>
                      <span className="text-[10px]">PDF files only • Tracking ID will be auto-extracted</span>
                    </div>
                  )}
                </div>
                <input
                  ref={labelFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLabelFileUpload(file);
                  }}
                />
              </div>

              {/* Extracted Tracking ID */}
              {labelExtractedId && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-sm p-3">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase mb-1 flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5" />
                    Extracted Tracking ID (set as Shipment ID)
                  </div>
                  <div className="font-mono font-bold text-indigo-900 text-[13px] break-all">{labelExtractedId}</div>
                </div>
              )}

              {/* Error / Info */}
              {labelUploadError && (
                <div className={`p-2.5 rounded-sm border text-[11px] flex items-start gap-2 ${
                  labelUploadError.startsWith('Label saved') 
                    ? 'bg-amber-50 border-amber-300 text-amber-900' 
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{labelUploadError}</span>
                </div>
              )}

              {/* Label Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-1">
                    Label Cost (USD $)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={labelFreeInput ? '' : labelCostInput}
                    disabled={labelFreeInput}
                    onChange={(e) => setLabelCostInput(parseFloat(e.target.value) || 0)}
                    placeholder={labelFreeInput ? 'Free' : '0.00'}
                    className="w-full px-2 py-1.5 bg-white border border-[#8c8f94] rounded-xs text-xs outline-none focus:border-[#2271b1] disabled:bg-[#f0f0f1] disabled:text-[#a7aaad]"
                  />
                </div>
                <div className="flex flex-col justify-end pb-0.5">
                  <label className="block text-[10px] font-bold text-[#50575e] uppercase mb-1">
                    Free Label?
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLabelFreeInput(!labelFreeInput)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${labelFreeInput ? 'bg-emerald-500' : 'bg-[#c3c4c7]'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${labelFreeInput ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`text-xs font-bold ${labelFreeInput ? 'text-emerald-700' : 'text-[#50575e]'}`}>
                      {labelFreeInput ? 'Yes — Free' : 'No — Paid'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
                <button
                  onClick={() => setShowLabelModal(false)}
                  className="px-3.5 py-1.5 bg-white border border-[#c3c4c7] hover:bg-[#f0f0f1] text-[#2c3338] text-xs font-bold rounded-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLabelCost}
                  className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Label Info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
