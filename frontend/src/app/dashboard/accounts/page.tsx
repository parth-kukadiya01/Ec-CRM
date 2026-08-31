'use client';

import React, { useEffect, useState } from 'react';
import { accountsApi, usersApi, authApi, uploadApi, adminCostsApi, companiesApi, partnersMgmtApi, getImageUrl } from '@/lib/api';
import ResizableTable from '@/components/ResizableTable';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  ShieldAlert,
  Truck,
  FileCheck,
  X,
  Store,
  Percent,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  UserCheck,
  Briefcase,
  FileText,
  UploadCloud,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  ShoppingBag,
  ListFilter,
  CheckSquare,
  Square,
  Key,
  Globe,
  Tag,
  Lock,
  Landmark
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';

const SOURCING_AGENT_OPTIONS = ['ADBH', 'MyBharty', 'Canton', 'Doweta'];

const FAMOUS_MARKETPLACES = [
  'Amazon',
  'eBay',
  'Walmart',
  'Etsy',
  'Shopify',
  'Flipkart',
  'TikTok Shop',
  'AliExpress',
  'Target',
  'Mercari'
];

const toInputDateFormat = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return dateStr;
};

interface UploadedDocItem {
  id: string;
  document_type: string;
  document_number?: string;
  file_url: string;
  original_name?: string;
  uploaded_at?: string;
  notes?: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Company' | 'Partner'>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [firstPaymentFilter, setFirstPaymentFilter] = useState<'ALL' | 'yes' | 'no'>('ALL');
  const [balanceSort, setBalanceSort] = useState<'' | 'high-to-low' | 'low-to-high'>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Account Modal state
  const [showModal, setShowModal] = useState(false);
  const [editAcc, setEditAcc] = useState<any>(null);
  const [bankFrom, setBankFrom] = useState('');
  const [bankTo, setBankTo] = useState('');

  // Document Management Modal state for specific account
  const [docModalAccount, setDocModalAccount] = useState<any>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFormType, setDocFormType] = useState('GSTIN Certificate');
  const [docFormNumber, setDocFormNumber] = useState('');
  const [docFormNotes, setDocFormNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Document Viewer Modal state
  const [previewDocument, setPreviewDocument] = useState<any>(null);

  // Password visibility toggle in table/modal
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  // Active view tab state (Ledger vs Monthly Admin Costs)
  const [activeTab, setActiveTab] = useState<'ledger' | 'admin-costs'>('ledger');
  const [adminCosts, setAdminCosts] = useState<any[]>([]);
  const [adminCostsLoading, setAdminCostsLoading] = useState(false);
  const [adminCostForm, setAdminCostForm] = useState({ month: '', admin_cost: '' });
  const [submittingAdminCost, setSubmittingAdminCost] = useState(false);
  const [editingAdminCost, setEditingAdminCost] = useState<string | null>(null);

  // Companies & Partners lists for dropdowns
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);

  // Full Enterprise Form state matching PDF Spreadsheet
  const [formData, setFormData] = useState({
    category: 'Company',
    account_name: '',
    marketplace: '',
    account_type: 'Company',
    gst_number: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    contact_address: '',
    city: '',
    state: '',
    pincode: '',
    shipment_type: 'Express Courier',
    purchase_company: 'ADBH',
    company_id: '',
    partner_id: '',
    partner_type: 'Service',
    partner_share_percentage: 0,
    notes: '',
    user_id: '',
    shipping_enabled: true,
    default_shipping_partner: 'FedEx Express',

    // PDF Spreadsheet Fields
    born_date: '',
    user_name: '',
    balance_usd: 0.0,
    total_orders: 0,
    total_listings: 0,
    first_payment: false,
    brand_gtin: 'Generic',
    dor: '',
    bank_payoneer: '',
    winning_listing: '',
    listing_strategy: '',
    mark_status: 'Active',
    mail: '',
    mail_pass: '',
    account_pass: '',
    card_code: '',
    authenticator_code: '',
    support_file: '',
  });

  // Dynamic Document Checklist State
  const [docChecklist, setDocChecklist] = useState<{ type: string; desc: string; required: boolean }[]>([]);
  const [newDocType, setNewDocType] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocReq, setNewDocReq] = useState(true);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await accountsApi.list(search);
      const usersRes = await usersApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      setAccounts(res.data || []);
      setUsersList(usersRes.data || []);
      setCurrentUser(meRes?.data || null);
      // Fetch companies & partners for dropdowns
      const companiesRes = await companiesApi.list().catch(() => ({ data: [] }));
      const partnersRes = await partnersMgmtApi.list().catch(() => ({ data: [] }));
      setCompaniesList(companiesRes.data || []);
      setPartnersList(partnersRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminCosts = async () => {
    setAdminCostsLoading(true);
    try {
      const res = await adminCostsApi.list();
      setAdminCosts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAdminCostsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin-costs') {
      fetchAdminCosts();
    }
  }, [activeTab]);

  const handleSubmitAdminCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCostForm.month || !adminCostForm.admin_cost) {
      alert('Please fill out all fields');
      return;
    }
    setSubmittingAdminCost(true);
    try {
      await adminCostsApi.createOrUpdate({
        month: adminCostForm.month,
        admin_cost: parseFloat(adminCostForm.admin_cost),
      });
      setAdminCostForm({ month: '', admin_cost: '' });
      setEditingAdminCost(null);
      fetchAdminCosts();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Error saving admin cost');
    } finally {
      setSubmittingAdminCost(false);
    }
  };

  const handleEditAdminCost = (item: any) => {
    setEditingAdminCost(item.month);
    setAdminCostForm({
      month: item.month,
      admin_cost: String(item.admin_cost),
    });
  };

  const handleDeleteAdminCost = async (month: string) => {
    if (confirm(`Are you sure you want to delete the admin cost record for ${month}?`)) {
      try {
        await adminCostsApi.delete(month);
        fetchAdminCosts();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Error deleting admin cost');
      }
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [search]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, pageSize]);

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateModal = (preselectCategory: 'Company' | 'Partner' = 'Company') => {
    setEditAcc(null);
    setBankFrom('');
    setBankTo('');
    setFormData({
      category: preselectCategory,
      account_name: '',
      marketplace: '',
      account_type: preselectCategory === 'Company' ? 'Company' : 'Partner',
      gst_number: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      contact_address: '',
      city: '',
      state: '',
      pincode: '',
      shipment_type: 'Express Courier',
      purchase_company: 'ADBH',
      company_id: '',
      partner_id: '',
      partner_type: 'Service',
      partner_share_percentage: 0,
      notes: '',
      user_id: '',
      shipping_enabled: true,
      default_shipping_partner: 'FedEx Express',

      // PDF Spreadsheet defaults
      born_date: new Date().toISOString().split('T')[0],
      user_name: '',
      balance_usd: 0.0,
      total_orders: 0,
      total_listings: 0,
      first_payment: true,
      brand_gtin: 'Generic',
      dor: '',
      bank_payoneer: '',
      winning_listing: '',
      listing_strategy: '',
      mark_status: 'Active',
      mail: '',
      mail_pass: 'Mhb@9800',
      account_pass: '',
      card_code: '',
      authenticator_code: '',
      support_file: '',
    });
    setDocChecklist([
      { type: 'GSTIN Certificate', desc: 'GSTIN Tax Registration Certificate', required: true },
      { type: 'PAN Card', desc: 'Permanent Account Number Card', required: true },
      { type: 'Bank Cancelled Cheque', desc: 'Bank Payout Cancelled Cheque', required: true },
    ]);
    setShowModal(true);
  };

  const openEditModal = (acc: any) => {
    setEditAcc(acc);
    const linkedUser = usersList.find((u: any) => u.account_name === acc.account_name || u.account_id === acc.id);

    let initialFrom = '';
    let initialTo = '';
    if (acc.bank_payoneer) {
      const matchFromTo = acc.bank_payoneer.match(/^From\s+(.*?)\s+to\s+(.*)$/i);
      const matchArrow = acc.bank_payoneer.match(/^(.*?)\s*(?:->|→)\s*(.*)$/);
      if (matchFromTo) {
        initialFrom = matchFromTo[1];
        initialTo = matchFromTo[2];
      } else if (matchArrow) {
        initialFrom = matchArrow[1];
        initialTo = matchArrow[2];
      } else {
        initialFrom = acc.bank_payoneer;
      }
    }
    setBankFrom(initialFrom);
    setBankTo(initialTo);

    setFormData({
      category: acc.category || 'Company',
      account_name: acc.account_name || '',
      marketplace: acc.marketplace || '',
      account_type: acc.account_type || 'Company',
      gst_number: acc.gst_number || '',
      bank_name: acc.bank_name || '',
      account_number: acc.account_number || '',
      ifsc_code: acc.ifsc_code || '',
      branch_name: acc.branch_name || '',
      contact_person: acc.contact_person || '',
      contact_phone: acc.contact_phone || '',
      contact_email: acc.contact_email || '',
      contact_address: acc.contact_address || '',
      city: acc.city || '',
      state: acc.state || '',
      pincode: acc.pincode || '',
      shipment_type: acc.shipment_type || 'Express Courier',
      purchase_company: acc.purchase_company || 'ADBH',
      company_id: acc.company_id ? String(acc.company_id) : '',
      partner_id: acc.partner_id ? String(acc.partner_id) : '',
      partner_type: acc.partner_type || 'Service',
      partner_share_percentage: acc.partner_share_percentage || 0,
      notes: acc.notes || '',
      user_id: linkedUser ? String(linkedUser.id) : '',
      shipping_enabled: acc.shipping_enabled ?? true,
      default_shipping_partner: acc.default_shipping_partner || 'FedEx Express',

      // PDF Spreadsheet fields
      born_date: toInputDateFormat(acc.born_date),
      user_name: acc.user_name || '',
      balance_usd: acc.balance_usd || 0.0,
      total_orders: acc.total_orders || 0,
      total_listings: acc.total_listings || 0,
      first_payment: acc.first_payment ?? false,
      brand_gtin: acc.brand_gtin || 'Generic',
      dor: acc.dor || '',
      bank_payoneer: acc.bank_payoneer || '',
      winning_listing: acc.winning_listing || '',
      listing_strategy: acc.listing_strategy || '',
      mark_status: acc.mark_status || 'Active',
      mail: acc.mail || '',
      mail_pass: acc.mail_pass || '',
      account_pass: acc.account_pass || '',
      card_code: acc.card_code || '',
      authenticator_code: acc.authenticator_code || '',
      support_file: acc.support_file || '',
    });

    try {
      if (acc.required_documents) {
        setDocChecklist(JSON.parse(acc.required_documents));
      } else {
        setDocChecklist([
          { type: 'GSTIN Certificate', desc: 'GSTIN Tax Registration Certificate', required: true },
          { type: 'PAN Card', desc: 'Permanent Account Number Card', required: true },
          { type: 'Bank Cancelled Cheque', desc: 'Bank Payout Cancelled Cheque', required: true },
        ]);
      }
    } catch {
      setDocChecklist([]);
    }

    setShowModal(true);
  };

  const handleAddChecklistItem = () => {
    if (!newDocType.trim()) return;
    setDocChecklist([
      ...docChecklist,
      { type: newDocType.trim(), desc: newDocDesc.trim() || `${newDocType.trim()} Verification`, required: newDocReq },
    ]);
    setNewDocType('');
    setNewDocDesc('');
    setNewDocReq(true);
  };

  const handleRemoveChecklistItem = (idx: number) => {
    setDocChecklist(docChecklist.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { user_id, ...accPayload } = formData;
      let uploadedList: UploadedDocItem[] = [];
      try {
        if (editAcc?.uploaded_documents) uploadedList = JSON.parse(editAcc.uploaded_documents);
      } catch { }

      if (formData.support_file && !uploadedList.some(d => d.file_url === formData.support_file)) {
        uploadedList.unshift({
          id: 'auth-' + Date.now(),
          document_type: 'Authenticator Code',
          document_number: formData.authenticator_code || formData.card_code || undefined,
          file_url: formData.support_file,
          original_name: formData.support_file.split('/').pop() || 'Authenticator QR / Key Attachment',
          uploaded_at: new Date().toISOString(),
          notes: 'Uploaded via Account Authenticator Code',
        });
      }

      const payload = {
        ...accPayload,
        marketplace: formData.marketplace || null,
        balance_usd: Number(formData.balance_usd) || 0.0,
        total_orders: Number(formData.total_orders) || 0,
        total_listings: Number(formData.total_listings) || 0,
        partner_share_percentage: formData.partner_type === 'Partner with %' ? Number(formData.partner_share_percentage) : 0,
        required_documents: JSON.stringify(docChecklist),
        uploaded_documents: uploadedList.length > 0 ? JSON.stringify(uploadedList) : (editAcc?.uploaded_documents || null),
        company_id: formData.company_id ? Number(formData.company_id) : null,
        partner_id: formData.partner_id ? Number(formData.partner_id) : null,
      };

      let targetAccId = editAcc?.id;

      if (editAcc) {
        await accountsApi.update(editAcc.id, payload);
      } else {
        const res = await accountsApi.create(payload);
        targetAccId = res.data?.id;
      }

      if (user_id) {
        await usersApi.update(parseInt(user_id), {
          account_id: targetAccId,
          account_name: formData.account_name,
          is_partner: formData.category === 'Partner',
        });
      }

      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert('Error saving account');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await accountsApi.delete(id);
        fetchAccounts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- Document Upload & View Handlers ---
  const handleSupportFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingDoc(true);
      let fileUrl = '';
      try {
        const res = await uploadApi.uploadFile(file);
        fileUrl = res.data?.file_url || '';
      } catch {
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      setFormData(prev => ({ ...prev, support_file: fileUrl }));
    } catch (err) {
      console.error(err);
      alert('Failed to upload support file');
    } finally {
      setUploadingDoc(false);
    }
  };

  const openDocModal = (acc: any) => {
    setDocModalAccount(acc);
    setDocFormType('GSTIN Certificate');
    setDocFormNumber('');
    setDocFormNotes('');
    setSelectedFile(null);
  };

  const handleFileUploadAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docModalAccount) return;

    try {
      setUploadingDoc(true);
      let uploadedFileUrl = '';

      if (selectedFile) {
        try {
          const uploadRes = await uploadApi.uploadFile(selectedFile);
          uploadedFileUrl = uploadRes.data?.file_url || '';
        } catch (uploadErr) {
          console.warn('Multipart upload failed, falling back to Data URL', uploadErr);
          uploadedFileUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(selectedFile);
          });
        }
      }

      if (!uploadedFileUrl) {
        uploadedFileUrl = `https://vault.crm.com/docs/${docFormType.toLowerCase().replace(/ /g, '_')}_${docModalAccount.id}.pdf`;
      }

      let existingDocs: UploadedDocItem[] = [];
      try {
        if (docModalAccount.uploaded_documents) {
          existingDocs = JSON.parse(docModalAccount.uploaded_documents);
        }
      } catch { }

      const newDocObj: UploadedDocItem = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        document_type: docFormType,
        document_number: docFormNumber || docModalAccount.gst_number || '',
        file_url: uploadedFileUrl,
        original_name: selectedFile ? selectedFile.name : `${docFormType}.pdf`,
        uploaded_at: new Date().toISOString(),
        notes: docFormNotes || `Uploaded by ${currentUser?.full_name || 'Admin'}`,
      };

      const updatedDocs = [newDocObj, ...existingDocs];
      await accountsApi.update(docModalAccount.id, {
        uploaded_documents: JSON.stringify(updatedDocs),
      });

      setDocModalAccount({
        ...docModalAccount,
        uploaded_documents: JSON.stringify(updatedDocs),
      });

      setSelectedFile(null);
      setDocFormNumber('');
      setDocFormNotes('');
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert('Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteUploadedDoc = async (docId: string) => {
    if (!docModalAccount || !confirm('Remove this uploaded document?')) return;
    try {
      let existingDocs: UploadedDocItem[] = [];
      try {
        if (docModalAccount.uploaded_documents) {
          existingDocs = JSON.parse(docModalAccount.uploaded_documents);
        }
      } catch { }

      const updatedDocs = existingDocs.filter(d => d.id !== docId);
      const updates: any = {
        uploaded_documents: JSON.stringify(updatedDocs),
      };
      if (docId === 'authenticator-support-file' || docId.startsWith('auth-')) {
        updates.support_file = '';
      }
      await accountsApi.update(docModalAccount.id, updates);

      setDocModalAccount({
        ...docModalAccount,
        ...updates,
      });

      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const roleName = currentUser?.role_name || (currentUser?.is_admin ? 'Super Admin' : 'Employee');
  const isAllowed = currentUser?.is_admin || hasPermission(currentUser, 'accounts:read');
  const canEdit = currentUser?.is_admin || hasPermission(currentUser, 'accounts:write');

  const isAnyFilterActive = search !== '' || categoryFilter !== 'ALL' || entityFilter !== 'ALL' || statusFilter !== 'ALL' || firstPaymentFilter !== 'ALL' || balanceSort !== '';

  const resetAllFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setEntityFilter('ALL');
    setStatusFilter('ALL');
    setFirstPaymentFilter('ALL');
    setBalanceSort('');
    setCurrentPage(1);
  };

  const filteredAccounts = accounts.filter(acc => {
    // 1. Category Filter (Company vs Partner tabs)
    if (categoryFilter !== 'ALL') {
      if ((acc.category || 'Company').toLowerCase() !== categoryFilter.toLowerCase()) return false;
    }

    // 2. Specific Entity Filter
    if (entityFilter !== 'ALL') {
      if (entityFilter.startsWith('company:')) {
        const cid = Number(entityFilter.replace('company:', ''));
        if (Number(acc.company_id) !== cid) return false;
      } else if (entityFilter.startsWith('partner:')) {
        const pid = Number(entityFilter.replace('partner:', ''));
        if (Number(acc.partner_id) !== pid) return false;
      }
    }

    // 3. Mark Status Filter
    if (statusFilter !== 'ALL') {
      if ((acc.mark_status || 'Active').toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    // 4. First Payment Filter
    if (firstPaymentFilter === 'yes' && !acc.first_payment) return false;
    if (firstPaymentFilter === 'no' && acc.first_payment) return false;

    // 5. Text Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (acc.account_name || '').toLowerCase().includes(q);
      const matchUser = (acc.user_name || acc.contact_person || '').toLowerCase().includes(q);
      const matchEmail = (acc.mail || acc.contact_email || '').toLowerCase().includes(q);
      const matchBank = (acc.bank_payoneer || acc.bank_name || '').toLowerCase().includes(q);
      const matchBrand = (acc.brand_gtin || '').toLowerCase().includes(q);
      const matchCompany = companiesList.some(c => c.id === acc.company_id && c.company_name.toLowerCase().includes(q));
      const matchPartner = partnersList.some(p => p.id === acc.partner_id && p.partner_name.toLowerCase().includes(q));
      if (!matchName && !matchUser && !matchEmail && !matchBank && !matchBrand && !matchCompany && !matchPartner) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (balanceSort === 'high-to-low') {
      return (Number(b.balance_usd) || 0) - (Number(a.balance_usd) || 0);
    }
    if (balanceSort === 'low-to-high') {
      return (Number(a.balance_usd) || 0) - (Number(b.balance_usd) || 0);
    }
    return 0;
  });

  const companyCount = accounts.filter(acc => (acc.category || 'Company').toLowerCase() === 'company').length;
  const partnerCount = accounts.filter(acc => (acc.category || '').toLowerCase() === 'partner').length;

  // Total balance summary
  const totalBalance = filteredAccounts.reduce((acc, curr) => acc + (curr.balance_usd || 0), 0);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!loading && currentUser && !isAllowed) {
    return (
      <div className="py-16 text-center bg-white border border-[#c3c4c7] p-8 max-w-lg mx-auto mt-10 rounded-sm shadow-xs">
        <ShieldAlert className="w-12 h-12 text-[#d63638] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1d2327]">Access Restricted</h2>
        <p className="text-xs text-[#50575e] mt-1">
          Your role (<strong className="text-[#1d2327]">{roleName}</strong>) does not have permission to manage accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* WP Admin Header Bar matching Orders / Purchases / Shipments */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-[#c3c4c7] shadow-xs rounded-sm">
        <div>
          <h1 className="text-xl font-bold text-[#1d2327] flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-[#2271b1] flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            Company & Partner Accounts Directory
          </h1>
          <p className="text-xs text-[#50575e] mt-0.5">
            Enterprise Accounts Ledger (Born Date, Balance $, Total Orders, Listings, GTIN/Brand, Bank/Payoneer, Strategy, Credentials & Docs)
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreateModal('Company')}
              className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#c3c4c7] bg-white rounded-sm overflow-hidden mb-2">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-bold border-r border-[#c3c4c7] transition-all ${activeTab === 'ledger'
            ? 'bg-[#f6f7f7] text-[#1d2327] border-b-2 border-b-[#2271b1]'
            : 'text-[#2271b1] hover:bg-[#f6f7f7]'
            }`}
        >
          Ledger Accounts
        </button>
        {currentUser?.is_admin && (
          <button
            onClick={() => setActiveTab('admin-costs')}
            className={`px-4 py-2 text-xs font-bold border-r border-[#c3c4c7] transition-all ${activeTab === 'admin-costs'
              ? 'bg-[#f6f7f7] text-[#1d2327] border-b-2 border-b-[#2271b1]'
              : 'text-[#2271b1] hover:bg-[#f6f7f7]'
              }`}
          >
            Monthly Admin Costs
          </button>
        )}
      </div>

      {activeTab === 'ledger' ? (
        <>
          {/* WP Admin Filters & Summary Metric Bar */}
          <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-3 shadow-xs rounded-sm space-y-3">
            {/* Top row: Category tabs + Total Ledger metric + Search */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { setCategoryFilter('ALL'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-sm text-xs font-bold transition-all border ${categoryFilter === 'ALL'
                    ? 'bg-[#2271b1] text-white border-[#135e96]'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  All Accounts ({accounts.length})
                </button>
                <button
                  onClick={() => { setCategoryFilter('Company'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-sm text-xs font-bold transition-all border flex items-center gap-1.5 ${categoryFilter === 'Company'
                    ? 'bg-[#2271b1] text-white border-[#135e96]'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Company ({companyCount})
                </button>
                <button
                  onClick={() => { setCategoryFilter('Partner'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-sm text-xs font-bold transition-all border flex items-center gap-1.5 ${categoryFilter === 'Partner'
                    ? 'bg-[#dba617] text-white border-[#b8890e]'
                    : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                    }`}
                >
                  <HandshakeIcon className="w-3.5 h-3.5" />
                  Partner ({partnerCount})
                </button>

                <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-[#c3c4c7]">
                  <span className="text-[11px] font-bold text-[#50575e] uppercase">Total INR Ledger:</span>
                  <span className="font-mono font-extrabold text-xs text-[#00a32a] bg-white px-2 py-0.5 rounded-sm border border-[#c3c4c7]">
                    ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-xs min-w-[200px]">
                <Search className="w-4 h-4 text-[#50575e] absolute left-3 top-2" />
                <input
                  type="text"
                  placeholder="Search Name, DOG, Email, Bank, Brand..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white border border-[#8c8f94] text-xs font-semibold pl-9 pr-3 py-1 rounded-sm focus:border-[#2271b1] outline-none"
                />
              </div>
            </div>

            {/* Bottom row: Detailed Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e0e0e0]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2c3338]">
                <Filter className="w-3.5 h-3.5 text-[#2271b1]" />
                <span className="text-[11px] text-[#50575e] uppercase tracking-wider">Filters:</span>
              </div>

              {/* Company / Partner Selector */}
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-[#8c8f94] text-xs font-semibold px-2.5 py-1 rounded-sm focus:border-[#2271b1] outline-none text-[#2c3338]"
              >
                <option value="ALL">All Companies & Partners</option>
                <optgroup label="Companies (C)">
                  {companiesList.map((c) => (
                    <option key={`f-c-${c.id}`} value={`company:${c.id}`}>
                      [C] {c.company_name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Partners (P)">
                  {partnersList.map((p) => (
                    <option key={`f-p-${p.id}`} value={`partner:${p.id}`}>
                      [P] {p.partner_name}
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-[#8c8f94] text-xs font-semibold px-2.5 py-1 rounded-sm focus:border-[#2271b1] outline-none text-[#2c3338]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Status: Active</option>
                <option value="Utility">Status: Utility</option>
                <option value="MFN Block">Status: MFN Block</option>
                <option value="Vacation">Status: Vacation</option>
                <option value="Consumer">Status: Consumer</option>
                <option value="Suspended">Status: Suspended</option>
              </select>

              {/* First Payment Filter */}
              <select
                value={firstPaymentFilter}
                onChange={(e) => { setFirstPaymentFilter(e.target.value as any); setCurrentPage(1); }}
                className="bg-white border border-[#8c8f94] text-xs font-semibold px-2.5 py-1 rounded-sm focus:border-[#2271b1] outline-none text-[#2c3338]"
              >
                <option value="ALL">First Payment: All</option>
                <option value="yes">First Payment: Completed (✓)</option>
                <option value="no">First Payment: Pending (—)</option>
              </select>

              {/* Low / High Balance Sort */}
              <select
                value={balanceSort}
                onChange={(e) => { setBalanceSort(e.target.value as any); setCurrentPage(1); }}
                className="bg-white border border-[#8c8f94] text-xs font-semibold px-2.5 py-1 rounded-sm focus:border-[#2271b1] outline-none text-[#2c3338]"
              >
                <option value="">Balance: Default Order</option>
                <option value="high-to-low">Balance: High to Low (₹)</option>
                <option value="low-to-high">Balance: Low to High (₹)</option>
              </select>

              {/* Reset Filters Button */}
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-2.5 py-1 bg-white hover:bg-[#f0f0f1] text-[#d63638] border border-[#d63638]/40 hover:border-[#d63638] text-xs font-bold rounded-sm transition-all flex items-center gap-1 shadow-2xs"
                  title="Reset all active filters"
                >
                  <X className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* WP Admin Accounts Table with All 16 PDF Spreadsheet Columns */}
          <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center">
                <div className="w-7 h-7 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-[#50575e] font-semibold">Loading enterprise accounts dataset...</span>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 className="w-10 h-10 text-[#a7aaad] mx-auto mb-2" />
                <p className="text-xs text-[#50575e]">No accounts match your criteria. Click "Add Company" or "Add Partner" to create.</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <ResizableTable className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#f6f7f7] text-[#2c3338] text-[11px] font-bold uppercase tracking-wider border-b border-[#c3c4c7]">
                        <th className="py-3 px-3 min-w-[110px]">Registration Date</th>
                        <th className="py-3 px-3 min-w-[140px]">Account Name</th>
                        <th className="py-3 px-3 min-w-[140px]">Company / Partner</th>
                        <th className="py-3 px-3 min-w-[100px]">DOG Series</th>
                        <th className="py-3 px-3 min-w-[110px] text-right">Balance</th>
                        <th className="py-3 px-3 min-w-[90px] text-center">Total Order</th>
                        <th className="py-3 px-3 min-w-[110px] text-center">Total Listing</th>
                        <th className="py-3 px-3 min-w-[90px] text-center">1st Payment</th>
                        <th className="py-3 px-3 min-w-[120px]">Brand / GTIN</th>
                        <th className="py-3 px-3 min-w-[180px]">Bank / Payoneer</th>
                        <th className="py-3 px-3 min-w-[80px] text-center">Mark</th>
                        <th className="py-3 px-3 min-w-[170px]">Mail & Credentials</th>
                        <th className="py-3 px-3 min-w-[100px]">Docs</th>
                        <th className="py-3 px-3 text-right min-w-[90px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {paginatedAccounts.map((acc) => {
                        let uploadedDocs: UploadedDocItem[] = [];
                        try {
                          if (acc.uploaded_documents) uploadedDocs = JSON.parse(acc.uploaded_documents);
                        } catch { }

                        if (acc.support_file && !uploadedDocs.some(d => d.file_url === acc.support_file)) {
                          uploadedDocs.unshift({
                            id: 'auth-' + acc.id,
                            document_type: 'Authenticator Code',
                            file_url: acc.support_file,
                          });
                        }

                        const pwdKey = String(acc.id);
                        const isPwdVisible = showPasswords[pwdKey];

                        return (
                          <tr key={acc.id} className="hover:bg-[#f6f7f7] border-b border-[#e0e0e0]">
                            {/* 1. Registration Date */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-[11px] font-medium text-[#50575e]">
                              {acc.born_date || '—'}
                            </td>

                            {/* 2. Account Name */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-[#1d2327] text-xs hover:text-[#2271b1] transition-colors">
                                  {acc.account_name}
                                </span>
                                {acc.marketplace && (
                                  <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-[#e5f5fa] text-[#006ba1] border border-[#006ba1]/30">
                                    {acc.marketplace}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Company / Partner */}
                            <td className="py-2.5 px-3 text-xs">
                              {acc.company_id ? (
                                <span className="font-semibold text-[#2271b1] inline-flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-extrabold bg-[#2271b1]/10 text-[#2271b1] border border-[#2271b1]/30">C</span>
                                  {(() => {
                                    const company = companiesList.find(c => c.id === acc.company_id);
                                    return company ? company.company_name : (acc.purchase_company || '—');
                                  })()}
                                </span>
                              ) : acc.partner_id ? (
                                <span className="font-semibold text-[#8c6700] inline-flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-extrabold bg-[#dba617]/10 text-[#8c6700] border border-[#dba617]/40">P</span>
                                  {(() => {
                                    const partner = partnersList.find(p => p.id === acc.partner_id);
                                    return partner ? partner.partner_name : '—';
                                  })()}
                                </span>
                              ) : (
                                <span className="text-[#a7aaad]">—</span>
                              )}
                            </td>

                            {/* 3. User Name */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-xs font-semibold text-[#1d2327]">
                              {acc.user_name || acc.contact_person || '—'}
                            </td>

                            {/* 4. Balance (INR ₹) */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-bold text-xs text-[#2271b1]">
                              ₹{(acc.balance_usd || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* 5. Total Order */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center font-mono font-semibold text-xs text-[#1d2327]">
                              {acc.total_orders || 0}
                            </td>

                            {/* 6. Total Listing in Account */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center font-mono font-semibold text-xs text-[#1d2327]">
                              {acc.total_listings || 0}
                            </td>

                            {/* 7. First Payment Checkbox */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center">
                              {acc.first_payment ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 bg-[#00a32a]/10 text-[#00a32a] rounded border border-[#00a32a]/30 font-extrabold">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 bg-[#f6f7f7] text-[#a7aaad] rounded border border-[#c3c4c7]">
                                  —
                                </span>
                              )}
                            </td>

                            {/* 8. Generic / GTIN / Brand */}
                            <td className="py-2.5 px-3 text-xs">
                              <span className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-bold border ${acc.brand_gtin === 'Generic'
                                ? 'bg-[#f6f7f7] text-[#2c3338] border-[#c3c4c7]'
                                : 'bg-[#2271b1]/10 text-[#2271b1] border-[#2271b1]/30'
                                }`}>
                                {acc.brand_gtin || 'Generic'}
                              </span>
                            </td>

                            {/* 9. Bank & Payoneer */}
                            <td className="py-2.5 px-3 text-xs">
                              {acc.bank_payoneer || acc.bank_name ? (
                                <div className="font-semibold text-[#1d2327] max-w-[200px] truncate" title={acc.bank_payoneer || acc.bank_name}>
                                  {acc.bank_payoneer || `${acc.bank_name} (${acc.account_number || ''})`}
                                </div>
                              ) : (
                                <span className="text-[#a7aaad] text-[11px]">—</span>
                              )}
                            </td>

                            {/* 10. Mark Status */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-bold border uppercase ${(acc.mark_status || 'Active').toLowerCase() === 'active'
                                ? 'bg-[#00a32a]/10 text-[#00a32a] border-[#00a32a]/30'
                                : 'bg-[#d63638]/10 text-[#d63638] border-[#d63638]/30'
                                }`}>
                                {acc.mark_status || 'Active'}
                              </span>
                            </td>

                            {/* 11. Mail & Credentials */}
                            <td className="py-2.5 px-3 text-xs">
                              {acc.mail || acc.contact_email ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-[#1d2327] max-w-[160px] truncate" title={acc.mail || acc.contact_email}>
                                    {acc.mail || acc.contact_email}
                                  </div>
                                  {(acc.mail_pass || acc.account_pass) && (
                                    <div className="flex items-center gap-1 text-[10px] font-mono text-[#50575e]">
                                      <span>Pass:</span>
                                      <span>{isPwdVisible ? (acc.mail_pass || acc.account_pass) : '••••••••'}</span>
                                      <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility(pwdKey)}
                                        className="p-0.5 text-[#2271b1] hover:text-[#135e96] ml-1"
                                        title="Toggle Password Visibility"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#a7aaad] text-[11px]">—</span>
                              )}
                            </td>

                            {/* 15. Compliance Docs */}
                            <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                              <button
                                onClick={() => openDocModal(acc)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-bold transition-all text-[11px] border ${uploadedDocs.length > 0
                                  ? 'bg-[#00a32a]/10 hover:bg-[#00a32a]/20 text-[#00a32a] border-[#00a32a]/30'
                                  : 'bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border-[#c3c4c7]'
                                  }`}
                              >
                                <FileCheck className="w-3 h-3" />
                                <span>Docs ({uploadedDocs.length})</span>
                              </button>
                            </td>

                            {/* 16. Actions */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              {canEdit ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditModal(acc)}
                                    className="p-1 rounded-sm text-[#50575e] hover:text-[#2271b1] hover:bg-[#f0f0f1] transition-all"
                                    title="Edit Account"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(acc.id)}
                                    className="p-1 rounded-sm text-[#50575e] hover:text-[#d63638] hover:bg-[#f0f0f1] transition-all"
                                    title="Delete Account"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-[#a7aaad] italic">View Only</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </ResizableTable>
                </div>

                {/* WP Admin Standard Pagination Footer matching Orders & Purchases */}
                <div className="bg-[#f6f7f7] border-t border-[#c3c4c7] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#50575e]">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      Showing {filteredAccounts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                      {Math.min(currentPage * pageSize, filteredAccounts.length)} of {filteredAccounts.length} accounts
                    </span>
                    <div className="flex items-center gap-1">
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
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages}
                      className="px-2.5 py-1 bg-white border border-[#c3c4c7] text-[#2c3338] font-bold rounded-sm hover:bg-[#f0f0f1] disabled:opacity-40 transition-all flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Form Card */}
          <div className="bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm space-y-4 h-fit">
            <h2 className="text-sm font-bold text-[#1d2327] border-b border-[#c3c4c7] pb-2 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-[#2271b1]" />
              <span>{editingAdminCost ? 'Edit Admin Cost' : 'Add Monthly Admin Cost'}</span>
            </h2>
            <form onSubmit={handleSubmitAdminCost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2c3338] mb-1.5">Select Month *</label>
                <input
                  type="month"
                  value={adminCostForm.month}
                  onChange={(e) => setAdminCostForm({ ...adminCostForm, month: e.target.value })}
                  className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                  required
                  disabled={!!editingAdminCost}
                />
                <p className="text-[10px] text-[#50575e] mt-1">Select the month and year for this configuration.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2c3338] mb-1.5">Total Admin Cost (INR ₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-xs text-[#50575e] font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 15000"
                    value={adminCostForm.admin_cost}
                    onChange={(e) => setAdminCostForm({ ...adminCostForm, admin_cost: e.target.value })}
                    className="w-full bg-white border border-[#8c8f94] text-xs font-bold pl-7 pr-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                    required
                  />
                </div>
                <p className="text-[10px] text-[#50575e] mt-1">Enter the total administrative expenditure for the month.</p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#c3c4c7]">
                <button
                  type="submit"
                  disabled={submittingAdminCost}
                  className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-sm shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingAdminCost ? 'Saving...' : 'Save Configuration'}
                </button>
                {editingAdminCost && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAdminCost(null);
                      setAdminCostForm({ month: '', admin_cost: '' });
                    }}
                    className="px-4 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] text-xs font-bold rounded-sm transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Table Card */}
          <div className="bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-[#1d2327] border-b border-[#c3c4c7] pb-2 flex items-center justify-between">
              <span>Overhead Ledger & Cost Share Breakdown</span>
              <span className="text-[11px] text-[#50575e] font-normal font-sans">
                Cost Per Order = Total Cost ÷ Total Orders
              </span>
            </h2>
            {adminCostsLoading ? (
              <div className="py-16 text-center">
                <div className="w-7 h-7 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-[#50575e] font-semibold">Loading costs registry...</span>
              </div>
            ) : adminCosts.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#50575e]">
                No monthly admin costs configured yet. Use the form to configure your first month.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#c3c4c7] rounded-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#f6f7f7] text-[#2c3338] text-[11px] font-bold uppercase border-b border-[#c3c4c7]">
                      <th className="py-3 px-3">Month</th>
                      <th className="py-3 px-3 text-right">Total Admin Cost</th>
                      <th className="py-3 px-3 text-center">Total Orders</th>
                      <th className="py-3 px-3 text-right">Cost Per Order</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c3c4c7] text-[#2c3338]">
                    {adminCosts.map((item) => {
                      const parts = item.month.split("-");
                      const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 2);
                      const formattedMonth = dateObj.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      });
                      return (
                        <tr key={item.month} className="hover:bg-[#f6f7f7] transition-all">
                          <td className="py-2.5 px-3 font-bold text-[#1d2327]">
                            {formattedMonth}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                            ₹{item.admin_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-[#1d2327]">
                            {item.total_orders}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-[#00a32a]">
                            ₹{item.cost_per_order.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditAdminCost(item)}
                                className="p-1 rounded-sm text-[#50575e] hover:text-[#2271b1] hover:bg-[#f0f0f1] transition-all"
                                title="Edit Cost"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAdminCost(item.month)}
                                className="p-1 rounded-sm text-[#50575e] hover:text-[#d63638] hover:bg-[#f0f0f1] transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DOCUMENT UPLOAD & VIEWER DRAWER / MODAL --- */}
      {docModalAccount && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4 bg-black/50">
          <div className="modal-content bg-white border border-[#c3c4c7] w-full max-w-3xl rounded-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#c3c4c7] bg-[#f6f7f7] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-[#00a32a] flex items-center justify-center text-white shadow-xs">
                  <FileCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1d2327]">
                    Account Documents: {docModalAccount.account_name}
                  </h2>
                  <p className="text-[11px] text-[#50575e]">
                    Upload & view official compliance files (GST, PAN, Bank Cheque, Contracts, Licenses)
                  </p>
                </div>
              </div>
              <button onClick={() => setDocModalAccount(null)} className="text-[#50575e] hover:text-[#1d2327] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">

              {/* UPLOAD FORM */}
              <form onSubmit={handleFileUploadAndSave} className="p-4 rounded-sm bg-[#f6f7f7] border border-[#c3c4c7] space-y-3">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#2271b1]" />
                  Upload Business Compliance Document
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Document Category *</label>
                    <select
                      value={docFormType}
                      onChange={(e) => setDocFormType(e.target.value)}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                    >
                      <option value="GSTIN Certificate">GSTIN Certificate</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Bank Cancelled Cheque">Bank Cancelled Cheque</option>
                      <option value="Authenticator Code">Authenticator Code / 2FA QR</option>
                      <option value="Trade License">Trade License / FSSAI</option>
                      <option value="Partnership Agreement">Partnership / Service Agreement</option>
                      <option value="Certificate of Incorporation">Certificate of Incorporation</option>
                      <option value="MSME Certificate">MSME Registration</option>
                      <option value="Other Document">Other Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Document / License Number</label>
                    <input
                      type="text"
                      value={docFormNumber}
                      onChange={(e) => setDocFormNumber(e.target.value)}
                      placeholder="e.g. 24AAAAA0000A1Z5"
                      className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2c3338] mb-1">Select File (PDF, PNG, JPG, DOC) *</label>
                  <div className="relative border-2 border-dashed border-[#8c8f94] hover:border-[#2271b1] rounded-sm p-4 bg-white text-center cursor-pointer transition-all">
                    <input
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                      <UploadCloud className="w-7 h-7 text-[#2271b1] mb-0.5" />
                      {selectedFile ? (
                        <div className="text-xs font-bold text-[#1d2327] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#00a32a]" />
                          <span>{selectedFile.name}</span>
                          <span className="text-[#50575e] font-mono text-[10px]">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-[#2c3338]">Click to choose file or drag & drop</span>
                          <span className="text-[11px] text-[#50575e]">Supports PDF, PNG, JPG, WEBP, DOCX</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2c3338] mb-1">Notes / Description</label>
                  <input
                    type="text"
                    value={docFormNotes}
                    onChange={(e) => setDocFormNotes(e.target.value)}
                    placeholder="e.g. Verified by Accounts Dept."
                    className="w-full bg-white border border-[#8c8f94] text-xs px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={uploadingDoc || !selectedFile}
                    className="px-4 py-1.5 bg-[#00a32a] hover:bg-[#008a20] disabled:opacity-50 text-white rounded-sm text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    {uploadingDoc ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload & Save Document</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* UPLOADED DOCUMENTS LIST */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center justify-between border-b border-[#c3c4c7] pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#2271b1]" />
                    Uploaded Documents Archive
                  </span>
                </h3>

                {(() => {
                  let docs: UploadedDocItem[] = [];
                  try {
                    if (docModalAccount.uploaded_documents) docs = JSON.parse(docModalAccount.uploaded_documents);
                  } catch { }

                  if (docModalAccount.support_file && !docs.some(d => d.file_url === docModalAccount.support_file)) {
                    docs.unshift({
                      id: 'authenticator-support-file',
                      document_type: 'Authenticator Code',
                      document_number: docModalAccount.authenticator_code || docModalAccount.card_code || undefined,
                      file_url: docModalAccount.support_file,
                      original_name: docModalAccount.support_file.split('/').pop() || 'Authenticator QR / Key Attachment',
                      uploaded_at: docModalAccount.created_at || new Date().toISOString(),
                      notes: 'Account Security & Authenticator Attachment'
                    });
                  }

                  if (docs.length === 0) {
                    return (
                      <div className="py-6 text-center bg-[#f6f7f7] rounded-sm border border-[#c3c4c7] text-xs text-[#50575e]">
                        <AlertCircle className="w-6 h-6 text-[#a7aaad] mx-auto mb-1" />
                        No documents uploaded for this account yet. Use the upload box above.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {docs.map((d) => (
                        <div key={d.id} className="p-2.5 bg-white rounded-sm border border-[#c3c4c7] flex items-center justify-between gap-3 hover:bg-[#f6f7f7] transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-sm bg-[#f6f7f7] border border-[#c3c4c7] flex items-center justify-center text-[#2271b1] shrink-0 font-bold">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[#1d2327] text-xs truncate flex items-center gap-2">
                                <span>{d.document_type}</span>
                                {d.document_number && (
                                  <span className="font-mono text-[10px] text-[#50575e] bg-[#f6f7f7] px-1.5 py-0.5 border border-[#c3c4c7] rounded-xs">
                                    {d.document_number}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#50575e] truncate mt-0.5 flex items-center gap-3">
                                <span>{d.original_name || 'Attached file'}</span>
                                {d.uploaded_at && (
                                  <span className="font-mono text-[#787c82] text-[10px]">
                                    {new Date(d.uploaded_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewDocument({
                                title: `${docModalAccount.account_name} - ${d.document_type}`,
                                fileUrl: d.file_url,
                                documentType: d.document_type,
                                documentNumber: d.document_number,
                                uploadedAt: d.uploaded_at,
                                notes: d.notes,
                              })}
                              className="px-2.5 py-1 bg-[#2271b1]/10 hover:bg-[#2271b1]/20 text-[#2271b1] rounded-sm text-xs font-bold transition-all flex items-center gap-1"
                              title="Preview Document in App"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Doc</span>
                            </button>

                            <a
                              href={getImageUrl(d.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="p-1 text-[#50575e] hover:text-[#1d2327] hover:bg-[#f0f0f1] rounded-sm transition-all"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </a>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUploadedDoc(d.id)}
                                className="p-1 text-[#50575e] hover:text-[#d63638] hover:bg-[#f0f0f1] rounded-sm transition-all"
                                title="Delete Document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>

            <div className="px-5 py-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex justify-end shrink-0">
              <button
                onClick={() => setDocModalAccount(null)}
                className="px-4 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] text-xs font-bold rounded-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REUSABLE DOCUMENT VIEWER MODAL --- */}
      <DocumentViewerModal
        isOpen={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
      />

      {/* --- ADD/EDIT ACCOUNT MODAL WITH ALL 16 SPREADSHEET FIELDS --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4 bg-black/50">
          <div className="modal-content bg-white border border-[#c3c4c7] w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#c3c4c7] bg-[#f6f7f7] flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-[#1d2327] flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-[#2271b1]" />
                {editAcc ? `Edit Account: ${formData.account_name}` : 'Add New Account'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#50575e] hover:text-[#1d2327] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto text-xs">

              {/* 1. Basic & Registration Information */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2 border-b border-[#e0e0e0] pb-1">
                  <FileText className="w-4 h-4 text-[#2271b1]" />
                  Basic Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">
                      Account Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. Jeeke Store (sep 3)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Marketplace</label>
                    <select
                      value={formData.marketplace}
                      onChange={(e) => setFormData({ ...formData, marketplace: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-bold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                    >
                      <option value="">— Select Marketplace —</option>
                      {FAMOUS_MARKETPLACES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Registration Date</label>
                    <input
                      type="date"
                      value={formData.born_date || ''}
                      onChange={(e) => setFormData({ ...formData, born_date: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-mono font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">DOG Series</label>
                    <input
                      type="text"
                      value={formData.user_name}
                      onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. SEP1-SEP1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Company / Partner</label>
                    <select
                      value={formData.company_id ? `company:${formData.company_id}` : (formData.partner_id ? `partner:${formData.partner_id}` : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setFormData({ ...formData, company_id: '', partner_id: '' });
                        } else if (val.startsWith('company:')) {
                          const cid = val.replace('company:', '');
                          setFormData({ ...formData, company_id: cid, partner_id: '', category: 'Company' });
                        } else if (val.startsWith('partner:')) {
                          const pid = val.replace('partner:', '');
                          const selectedPartner = partnersList.find(p => String(p.id) === pid);
                          setFormData({
                            ...formData,
                            partner_id: pid,
                            company_id: '',
                            category: 'Partner',
                            partner_type: selectedPartner?.partner_type || 'Service',
                            partner_share_percentage: selectedPartner?.partner_share_percentage || 0
                          });
                        }
                      }}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                    >
                      <option value="">— Select Company or Partner —</option>
                      <optgroup label="Companies (C)">
                        {companiesList.map((c) => (
                          <option key={`c-${c.id}`} value={`company:${c.id}`}>
                            [C] {c.company_name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Partners (P)">
                        {partnersList.map((p) => (
                          <option key={`p-${p.id}`} value={`partner:${p.id}`}>
                            [P] {p.partner_name} {p.partner_share_percentage ? `(${p.partner_share_percentage}%)` : ''}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Account Status</label>
                    <select
                      value={formData.mark_status}
                      onChange={(e) => setFormData({ ...formData, mark_status: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-bold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Utility">Utility</option>
                      <option value="MFN Block">MFN Block</option>
                      <option value="Vacation">Vacation</option>
                      <option value="Consumer">Consumer</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Financial Balance & Inventory Performance */}
              <div className="p-3.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm space-y-3">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#00a32a]" />
                  Wallet Balance & Order Counts
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.balance_usd}
                      onChange={(e) => setFormData({ ...formData, balance_usd: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-mono font-bold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. 284.16"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Total Orders Count</label>
                    <input
                      type="number"
                      value={formData.total_orders}
                      onChange={(e) => setFormData({ ...formData, total_orders: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. 167"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Total Listing in Account</label>
                    <input
                      type="number"
                      value={formData.total_listings}
                      onChange={(e) => setFormData({ ...formData, total_listings: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. 34"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#2c3338] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.first_payment}
                        onChange={(e) => setFormData({ ...formData, first_payment: e.target.checked })}
                        className="w-4 h-4 text-[#00a32a] rounded-xs cursor-pointer"
                      />
                      <span>First Payment Completed</span>
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">GENERIC / GTIN / BRAND</label>
                    <input
                      type="text"
                      value={formData.brand_gtin}
                      onChange={(e) => setFormData({ ...formData, brand_gtin: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. Generic / Wemsu / Vimantara"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Bank / Payoneer Account</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-[#50575e] uppercase">From</span>
                        <input
                          type="text"
                          value={bankFrom}
                          onChange={(e) => {
                            const newFrom = e.target.value;
                            setBankFrom(newFrom);
                            const combined = newFrom && bankTo ? `From ${newFrom} to ${bankTo}` : (newFrom || bankTo);
                            setFormData({ ...formData, bank_payoneer: combined });
                          }}
                          className="w-full bg-white border border-[#8c8f94] text-xs font-semibold pl-12 pr-2 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                          placeholder="e.g. Payoneer / Wise"
                        />
                      </div>
                      <span className="text-xs font-bold text-[#50575e]">to</span>
                      <div className="flex-1 relative">
                        <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-[#50575e] uppercase">To</span>
                        <input
                          type="text"
                          value={bankTo}
                          onChange={(e) => {
                            const newTo = e.target.value;
                            setBankTo(newTo);
                            const combined = bankFrom && newTo ? `From ${bankFrom} to ${newTo}` : (bankFrom || newTo);
                            setFormData({ ...formData, bank_payoneer: combined });
                          }}
                          className="w-full bg-white border border-[#8c8f94] text-xs font-semibold pl-8 pr-2 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                          placeholder="e.g. HDFC Bank"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Sales & Listing Strategy */}
              <div className="p-3.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm space-y-3">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#2271b1]" />
                  Sales & Listing Strategy
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Time</label>
                    <input
                      type="text"
                      value={formData.dor}
                      onChange={(e) => setFormData({ ...formData, dor: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. 1 Month / 15 Days"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Sales target ($)</label>
                    <input
                      type="text"
                      value={formData.winning_listing}
                      onChange={(e) => setFormData({ ...formData, winning_listing: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. $5,000 / B08N5WRWNW"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Strategy</label>
                    <input
                      type="text"
                      value={formData.listing_strategy}
                      onChange={(e) => setFormData({ ...formData, listing_strategy: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. MFN Fast Shipping"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Credentials & Mail Login */}
              <div className="p-3.5 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm space-y-3">
                <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#dba617]" />
                  Security & Login Credentials
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Email ID *</label>
                    <input
                      type="email"
                      value={formData.mail}
                      onChange={(e) => setFormData({ ...formData, mail: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. Purijal22@gmail.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Email Password *</label>
                    <input
                      type="text"
                      value={formData.mail_pass}
                      onChange={(e) => setFormData({ ...formData, mail_pass: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. Mhb@9800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Account Password *</label>
                    <input
                      type="text"
                      value={formData.account_pass}
                      onChange={(e) => setFormData({ ...formData, account_pass: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. Adbhon@2025"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Card Code</label>
                    <input
                      type="text"
                      value={formData.card_code}
                      onChange={(e) => setFormData({ ...formData, card_code: e.target.value })}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-mono px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      placeholder="e.g. 4589 / Security Code"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3338] mb-1">Authenticator Code</label>
                    <input
                      type="file"
                      onChange={handleSupportFileUpload}
                      className="w-full bg-white border border-[#8c8f94] text-xs px-2 py-1 rounded-sm focus:border-[#2271b1] outline-none file:mr-2 file:py-0.5 file:px-2 file:rounded-xs file:border-0 file:text-xs file:font-semibold file:bg-[#2271b1]/10 file:text-[#2271b1] hover:file:bg-[#2271b1]/20 cursor-pointer"
                    />
                    {formData.support_file && (
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[#00a32a] font-semibold truncate max-w-[140px]">
                          ✓ {formData.support_file.split('/').pop()?.substring(0, 20) || 'Uploaded'}
                        </span>
                        <a
                          href={getImageUrl(formData.support_file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2271b1] hover:underline font-bold"
                        >
                          View File
                        </a>
                      </div>
                    )}
                  </div>


                </div>
              </div>

              {/* Partner Specific Options */}
              {formData.category === 'Partner' && (
                <div className="p-3 bg-[#f6f7f7] border border-[#c3c4c7] rounded-sm space-y-2">
                  <h3 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-2">
                    <HandshakeIcon className="w-4 h-4 text-[#dba617]" />
                    Partner Engagement Model & Share Setup
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-[#2c3338] mb-1">Partner Model Option *</label>
                      <select
                        value={formData.partner_type}
                        onChange={(e) => setFormData({ ...formData, partner_type: e.target.value })}
                        className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none"
                      >
                        <option value="Service">1) Service Partner (Fixed Fee)</option>
                        <option value="Partner with %">2) Partner with % (Profit / Revenue Share)</option>
                      </select>
                    </div>

                    {formData.partner_type === 'Partner with %' && (
                      <div>
                        <label className="block text-xs font-bold text-[#2c3338] mb-1">Partner Share Percentage (%) *</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            required
                            value={formData.partner_share_percentage}
                            onChange={(e) => setFormData({ ...formData, partner_share_percentage: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white border border-[#8c8f94] text-xs font-bold px-3 py-1.5 rounded-sm focus:border-[#2271b1] outline-none pr-8"
                            placeholder="e.g. 20"
                          />
                          <Percent className="w-3.5 h-3.5 text-[#dba617] absolute right-3 top-2" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit / Cancel Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#c3c4c7] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] text-xs font-bold rounded-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white rounded-sm shadow-xs transition-all bg-[#2271b1] hover:bg-[#135e96]"
                >
                  {editAcc ? 'Save Account Details' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function HandshakeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m11 17 2 2a1 1 0 0 0 1.4 0l5.6-5.6a1 1 0 0 0 0-1.4l-2-2" />
      <path d="m14 14 2.5 2.5" />
      <path d="M18 10 9.3 1.3a1 1 0 0 0-1.4 0L1.3 7.9a1 1 0 0 0 0 1.4L6 14" />
      <path d="m3.5 10.5 4 4" />
      <path d="m5 12 2.5 2.5" />
    </svg>
  );
}
