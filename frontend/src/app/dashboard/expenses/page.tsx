'use client';

import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  User,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Upload,
  ShieldCheck,
} from 'lucide-react';
import { expenseClaimsApi, authApi } from '@/lib/api';
import ResizableTable from '@/components/ResizableTable';

interface ClaimItem {
  id: number;
  user_id: number;
  user_full_name: string;
  user_email: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  status: string;
  receipt_image: string | null;
  notes: string | null;
  approval_proof: string | null;
  created_at: string;
}

export default function ExpensesPage() {
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Approval modal state
  const [approvalModal, setApprovalModal] = useState<{ open: boolean; claimId: number | null; targetStatus: string }>({
    open: false, claimId: null, targetStatus: ''
  });
  const [approvalProofImage, setApprovalProofImage] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const renderReceiptThumbnails = (receiptImageStr: string | null) => {
    if (!receiptImageStr) {
      return (
        <div className="w-10 h-10 rounded-lg bg-surface-100 text-surface-400 flex items-center justify-center">
          <ImageIcon className="w-5 h-5" />
        </div>
      );
    }

    let images: string[] = [];
    if (receiptImageStr.startsWith('[')) {
      try {
        images = JSON.parse(receiptImageStr);
      } catch {
        images = [receiptImageStr];
      }
    } else {
      images = [receiptImageStr];
    }

    return (
      <div className="flex flex-wrap gap-1.5 max-w-[120px]">
        {images.map((imgUrl, idx) => (
          <div key={idx} className="relative group cursor-pointer" onClick={() => setPreviewImage(imgUrl)}>
            <img
              src={imgUrl}
              alt={`Receipt ${idx + 1}`}
              className="w-10 h-10 rounded-lg object-cover border border-surface-200 shadow-xs group-hover:opacity-80 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, claimsRes] = await Promise.all([
        authApi.getMe().catch(() => ({ data: null })),
        expenseClaimsApi.getAllClaims(),
      ]);
      setCurrentUser(userRes.data);
      setClaims(claimsRes.data || []);
    } catch (err: any) {
      setErrorMsg('Failed to load expense claims');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (claimId: number, targetStatus: string) => {
    setApprovalModal({ open: true, claimId, targetStatus });
    setApprovalProofImage(null);
    setApprovalNotes('');
  };

  const closeApprovalModal = () => {
    setApprovalModal({ open: false, claimId: null, targetStatus: '' });
    setApprovalProofImage(null);
    setApprovalNotes('');
  };

  const handleApprovalProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setApprovalProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmApproval = async () => {
    if (!approvalModal.claimId) return;
    const { claimId, targetStatus } = approvalModal;

    // Require proof image for Approve or Reimburse
    if ((targetStatus === 'Approved' || targetStatus === 'Reimbursed') && !approvalProofImage) {
      setErrorMsg('Please upload an approval proof image before proceeding.');
      return;
    }

    try {
      setUpdatingId(claimId);
      setErrorMsg('');
      const payload: any = { status: targetStatus };
      if (approvalNotes) payload.notes = approvalNotes;
      if (approvalProofImage) payload.approval_proof = approvalProofImage;

      const res = await expenseClaimsApi.updateStatus(claimId, payload);
      setClaims((prev) =>
        prev.map((c) => (c.id === claimId ? {
          ...c,
          status: res.data.status,
          notes: res.data.notes,
          approval_proof: res.data.approval_proof,
        } : c))
      );
      setSuccessMsg(`Expense claim #${claimId} marked as ${targetStatus}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      closeApprovalModal();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update claim status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusUpdate = async (claimId: number, newStatus: string) => {
    // For Approve and Reimburse, open the modal to require proof
    if (newStatus === 'Approved' || newStatus === 'Reimbursed') {
      openApprovalModal(claimId, newStatus);
      return;
    }
    // For Reject, allow direct status update
    try {
      setUpdatingId(claimId);
      setErrorMsg('');
      const res = await expenseClaimsApi.updateStatus(claimId, { status: newStatus });
      setClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, status: res.data.status } : c))
      );
      setSuccessMsg(`Expense claim #${claimId} marked as ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update claim status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (claim.user_full_name && claim.user_full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (claim.user_email && claim.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      claim.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || claim.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const totalAmount = claims.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const pendingClaims = claims.filter((c) => c.status === 'Pending Review');
  const approvedClaims = claims.filter((c) => c.status === 'Approved' || c.status === 'Reimbursed');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'Reimbursed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><Check className="w-3.5 h-3.5" /> Reimbursed</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5" /> Pending Review</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin" />
          <span className="text-sm text-surface-400 font-medium">Loading expense claims management...</span>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-blue-600" />
            Employee Expense Claims
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Review, verify receipts, and manage employee spending reimbursements across the organization.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2.5 bg-white border border-surface-200 hover:bg-surface-50 text-surface-700 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-blue-600" />
          <span>Refresh Claims</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Claims</p>
            <h3 className="text-2xl font-extrabold text-surface-900 mt-0.5">{claims.length}</h3>
          </div>
        </div>

        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Pending Review</p>
            <h3 className="text-2xl font-extrabold text-surface-900 mt-0.5">{pendingClaims.length}</h3>
          </div>
        </div>

        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Approved / Paid</p>
            <h3 className="text-2xl font-extrabold text-surface-900 mt-0.5">{approvedClaims.length}</h3>
          </div>
        </div>

        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Claim Value</p>
            <h3 className="text-2xl font-extrabold text-purple-900 mt-0.5">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card-premium p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search claims by employee or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-surface-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-surface-900 input-premium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['ALL', 'Pending Review', 'Approved', 'Reimbursed', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {st === 'ALL' ? 'All Claims' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Claims Table */}
      <div className="card-premium p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <ResizableTable className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Receipt</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Expense Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-4">Approval Proof</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-surface-800">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-surface-400 font-medium">
                    No expense claims match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      {renderReceiptThumbnails(c.receipt_image)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 uppercase">
                          {(c.user_full_name || 'E').charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-surface-900">{c.user_full_name || 'Employee'}</div>
                          <div className="text-[11px] text-surface-500 font-mono">{c.user_email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-surface-900">{c.title}</div>
                      <div className="text-[11px] text-surface-400 font-mono">Claim ID: #{c.id}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-surface-100 text-surface-700">
                        {c.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-surface-500 font-medium">{c.date}</td>

                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-sm text-blue-600">
                        ₹{c.amount.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="max-w-[180px]">
                        {c.notes ? (
                          <div className="text-[11px] text-surface-600 whitespace-pre-wrap leading-relaxed">{c.notes}</div>
                        ) : (
                          <span className="text-[11px] text-surface-400 italic">—</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {c.approval_proof ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={c.approval_proof}
                            alt="Approval Proof"
                            onClick={() => setPreviewImage(c.approval_proof)}
                            className="w-9 h-9 rounded-lg object-cover border border-emerald-200 cursor-pointer hover:opacity-80 transition-opacity shadow-xs"
                            title="View approval proof"
                          />
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-surface-400 italic">Not provided</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(c.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status !== 'Approved' && (
                          <button
                            onClick={() => handleStatusUpdate(c.id, 'Approved')}
                            disabled={updatingId === c.id}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                            title="Approve expense claim"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                        {c.status !== 'Reimbursed' && (
                          <button
                            onClick={() => handleStatusUpdate(c.id, 'Reimbursed')}
                            disabled={updatingId === c.id}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                            title="Mark as Reimbursed"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Reimburse
                          </button>
                        )}
                        {c.status !== 'Rejected' && (
                          <button
                            onClick={() => handleStatusUpdate(c.id, 'Rejected')}
                            disabled={updatingId === c.id}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                            title="Reject expense claim"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>

      {/* Receipt Image Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white p-2 rounded-2xl shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-surface-700 shadow-md flex items-center justify-center hover:bg-surface-100"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewImage} alt="Receipt Full Preview" className="max-h-[80vh] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>

      {/* Approval Confirmation Modal */}
      {approvalModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeApprovalModal}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-100 hover:bg-surface-200 text-surface-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-surface-900">
                  {approvalModal.targetStatus === 'Approved' ? 'Approve Expense Claim' : 'Reimburse Expense Claim'}
                </h3>
                <p className="text-xs text-surface-500">Claim #{approvalModal.claimId} — Upload proof before proceeding</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Approval Proof Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase mb-1.5">Approval Proof Image <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-4 p-3.5 rounded-xl border border-dashed border-surface-300 bg-surface-50/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleApprovalProofFile}
                    id="approval-proof-input"
                    className="hidden"
                  />
                  <label
                    htmlFor="approval-proof-input"
                    className="px-4 py-2 bg-white border border-surface-300 rounded-lg text-xs font-bold text-surface-700 cursor-pointer flex items-center gap-1.5 shadow-xs hover:bg-surface-100 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Upload Proof</span>
                  </label>

                  {approvalProofImage ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={approvalProofImage}
                        alt="Proof preview"
                        className="w-12 h-12 rounded-lg object-cover border shadow-xs"
                      />
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Attached
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-surface-400">Upload payment slip, signed voucher, or screenshot</span>
                  )}
                </div>
              </div>

              {/* Reviewer Notes */}
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase mb-1.5">Reviewer Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Add any review comments or verification notes..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full bg-white border border-surface-200 rounded-xl p-3 text-xs text-surface-900 input-premium resize-none"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-surface-100">
              <button
                onClick={closeApprovalModal}
                className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={updatingId !== null || !approvalProofImage}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  approvalModal.targetStatus === 'Approved'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                }`}
              >
                {updatingId ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : approvalModal.targetStatus === 'Approved' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <DollarSign className="w-3.5 h-3.5" />
                )}
                {approvalModal.targetStatus === 'Approved' ? 'Confirm Approval' : 'Confirm Reimbursement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
