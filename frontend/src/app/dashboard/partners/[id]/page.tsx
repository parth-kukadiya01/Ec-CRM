'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store,
  Mail,
  Phone,
  ArrowLeft,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  UserCheck,
  UserX,
  FileText,
  Clock,
  ShieldCheck,
  Truck,
  Users,
  Upload,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  UserPlus,
  Sparkles,
  Paperclip
} from 'lucide-react';
import { usersApi, authApi, accountsApi, employeeDocumentsApi } from '@/lib/api';

const ONBOARDING_STAGES = ['Draft', 'Submitted', 'In Review', 'Active'];

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = parseInt(params.id as string);

  const [partner, setPartner] = useState<any | null>(null);
  const [accountObj, setAccountObj] = useState<any | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Required Documents Checklist from Account
  const [accountRequiredDocs, setAccountRequiredDocs] = useState<{ type: string; desc: string; required: boolean }[]>([]);

  // State for inline document inputs per required doc type
  const [inlineDocForms, setInlineDocForms] = useState<{
    [docType: string]: { docNumber: string; fileUrl: string; fileName: string; isSubmitting?: boolean };
  }>({});

  // Selected Reassign Employee State
  const [selectedReassignId, setSelectedReassignId] = useState<string>('');

  // Document Upload Modal State (fallback)
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    document_type: 'GSTIN Certificate',
    document_number: '',
    file_url: '',
    notes: '',
  });

  const loadPartnerData = async () => {
    try {
      setLoading(true);
      const [partnerRes, meRes, docRes, usersRes, accRes] = await Promise.all([
        usersApi.getOne(partnerId),
        authApi.getMe(),
        employeeDocumentsApi.list(partnerId).catch(() => ({ data: [] })),
        usersApi.list().catch(() => ({ data: [] })),
        accountsApi.list().catch(() => ({ data: [] })),
      ]);

      const pData = partnerRes.data;
      setPartner(pData);
      setCurrentUser(meRes.data);
      setDocuments(docRes.data || []);
      
      const staffMembers = (usersRes.data || []).filter((u: any) => !u.is_partner);
      setEmployees(staffMembers);
      setSelectedReassignId(pData.assigned_employee_id ? String(pData.assigned_employee_id) : '');

      // Match Account to get dynamic document requirements template
      if (pData.account_id || pData.account_name) {
        const acc = (accRes.data || []).find((a: any) => a.id === pData.account_id || a.account_name === pData.account_name);
        if (acc) {
          setAccountObj(acc);
          try {
            if (acc.required_documents) {
              const parsed = JSON.parse(acc.required_documents);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setAccountRequiredDocs(parsed);
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartnerData();
  }, [partnerId]);

  const handleForwardStatus = async (nextStatus: string) => {
    if (!partner) return;

    // Block stage advancement to In Review or Active if mandatory docs are missing
    if ((nextStatus === 'In Review' || nextStatus === 'Active') && !allMandatoryDone) {
      const missing = mandatoryDocs.filter(req => !documents.some(d => d.document_type === req.type)).map(r => r.type);
      alert(`⚠️ Cannot advance onboarding stage to "${nextStatus}"!\n\nMandatory compliance documents are still missing:\n- ${missing.join('\n- ')}\n\nPlease fill document numbers and attach files for all mandatory documents, then click "Submit & Complete Onboarding".`);
      return;
    }

    try {
      const payload: any = { onboarding_status: nextStatus };
      if (nextStatus === 'Active') {
        payload.is_active = true;
      }
      await usersApi.update(partner.id, payload);
      alert(`✅ Onboarding stage updated to "${nextStatus}"`);
      loadPartnerData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Error updating onboarding status');
    }
  };

  const handleAssignEmployee = async () => {
    if (!partner || !selectedReassignId) return;
    const emp = employees.find((e) => String(e.id) === selectedReassignId);
    if (!emp) return;

    if (confirm(`Reassign onboarding lead to ${emp.full_name || emp.email}?`)) {
      try {
        await usersApi.update(partner.id, {
          assigned_employee_id: parseInt(selectedReassignId),
          assigned_employee_name: emp.full_name || emp.email
        });
        alert(`✅ Onboarding task successfully reassigned to ${emp.full_name || emp.email}!`);
        await loadPartnerData();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Error reassigning employee lead');
      }
    }
  };

  const handleToggleActive = async () => {
    if (!partner) return;
    const action = partner.is_active ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} ${partner.full_name || partner.email}?`)) {
      try {
        await usersApi.update(partner.id, { is_active: !partner.is_active });
        loadPartnerData();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || `Error trying to ${action} partner`);
      }
    }
  };

  const handleInlineFileSelect = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInlineDocForms((prev) => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            fileUrl: reader.result as string,
            fileName: file.name,
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInlineUploadSubmit = async (docType: string) => {
    const inputState = inlineDocForms[docType];
    const docNum = inputState?.docNumber?.trim();
    if (!docNum) {
      alert(`Please enter the Document / License number for ${docType}`);
      return;
    }

    try {
      setInlineDocForms((prev) => ({
        ...prev,
        [docType]: { ...prev[docType], isSubmitting: true },
      }));

      const fileUrlToSave = inputState?.fileUrl || `https://vault.crm.com/docs/${docType.toLowerCase().replace(/ /g, '_')}_${partnerId}.pdf`;

      await employeeDocumentsApi.create(partnerId, {
        document_type: docType,
        document_number: docNum,
        file_url: fileUrlToSave,
        notes: `Uploaded & verified by staff lead (${currentUser?.full_name || currentUser?.email})`,
      });

      // Clear inline form state
      setInlineDocForms((prev) => ({
        ...prev,
        [docType]: { docNumber: '', fileUrl: '', fileName: '' },
      }));

      loadPartnerData();
    } catch (err: any) {
      console.error(err);
      alert('Error uploading document');
    }
  };

  const handleOpenDocModalForType = (typeStr: string) => {
    setDocForm({
      document_type: typeStr,
      document_number: '',
      file_url: '',
      notes: 'Uploaded by Assigned Employee',
    });
    setShowDocModal(true);
  };

  const handleAddDocumentModal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeeDocumentsApi.create(partnerId, {
        document_type: docForm.document_type,
        document_number: docForm.document_number,
        file_url: docForm.file_url || `https://vault.crm.com/docs/${docForm.document_type.toLowerCase().replace(/ /g, '_')}_${partnerId}.pdf`,
        notes: docForm.notes || 'Uploaded via Onboarding Workspace',
      });

      if (partner.onboarding_status === 'Draft') {
        await usersApi.update(partnerId, { onboarding_status: 'Documents Submitted' });
      }

      setShowDocModal(false);
      setDocForm({ document_type: 'GSTIN Certificate', document_number: '', file_url: '', notes: '' });
      loadPartnerData();
    } catch (err) {
      console.error(err);
      alert('Error uploading document');
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (confirm('Delete this compliance document?')) {
      try {
        await employeeDocumentsApi.delete(partnerId, docId);
        loadPartnerData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Submit complete onboarding workflow once all mandatory docs are uploaded
  const handleFinalSubmitOnboarding = async () => {
    if (!partner) return;
    if (confirm(`Submit & approve onboarding for ${partner.full_name || partner.email}? Partner account will become Active.`)) {
      try {
        await usersApi.update(partner.id, {
          onboarding_status: 'Active',
          is_active: true,
        });
        alert(`🎉 All required compliance documents verified! Onboarding completed successfully. ${partner.full_name || 'Partner'} is now Active and ready for inventory linkage.`);
        loadPartnerData();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Error submitting onboarding completion');
      }
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs text-slate-500 font-medium">Loading partner workspace...</span>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="py-16 text-center card-premium max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h2 className="text-sm font-bold text-slate-800">Partner Account Not Found</h2>
        <Link href="/dashboard/partners" className="text-xs font-bold text-blue-600 hover:underline mt-2 inline-block">
          &larr; Back to Channel Partners
        </Link>
      </div>
    );
  }

  const currentStageIdx = ONBOARDING_STAGES.indexOf(partner.onboarding_status || 'Draft');
  const isAssignedLead = currentUser && partner.assigned_employee_id === currentUser.id;

  // Compliance metrics
  const mandatoryDocs = accountRequiredDocs.filter((req) => req.required);
  const uploadedMandatoryCount = mandatoryDocs.filter((req) =>
    documents.some((d) => d.document_type === req.type)
  ).length;
  const allMandatoryDone = mandatoryDocs.length > 0 && uploadedMandatoryCount === mandatoryDocs.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/partners"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Channel Partners</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              partner.is_active
                ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {partner.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            <span>{partner.is_active ? 'Deactivate Partner' : 'Activate Partner'}</span>
          </button>
        </div>
      </div>

      {/* Main Partner Profile Banner (Blue & White Theme) */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 rounded-3xl shadow-md border border-blue-600/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 font-bold text-xl">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white">{partner.full_name || 'Channel Partner'}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                  partner.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'
                }`}>
                  {partner.is_active ? 'Active Account' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-blue-100 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-300" />
                  {partner.email}
                </span>
                {partner.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-blue-300" />
                    {partner.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Store Account & Shipping Badge */}
          <div className="flex flex-wrap gap-2 self-start md:self-auto">
            {partner.account_name && (
              <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                <div className="text-[10px] text-blue-200 uppercase tracking-wider font-extrabold">Marketplace Store</div>
                <div className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                  <Store className="w-4 h-4 text-blue-300" />
                  {partner.account_name}
                </div>
              </div>
            )}

            <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
              <div className="text-[10px] text-emerald-300 uppercase tracking-wider font-extrabold">Shipping Mode</div>
              <div className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                <Truck className="w-4 h-4 text-emerald-300" />
                {partner.requires_shipping ? (partner.shipping_partner || 'FedEx Express') : 'Self Fulfillment'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ONBOARDING PIPELINE & FORWARD PROCESS (STAFF & ADMIN CONTROLLED) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-blue-600" />
              Employee Onboarding Pipeline & Forward Progress
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Current Active Stage: <strong className="text-blue-700 font-bold">{partner.onboarding_status || 'Draft'}</strong>
              {isAssignedLead && <span className="ml-2 text-emerald-600 font-bold">(You are the assigned lead)</span>}
            </p>
          </div>

          {/* Quick Action Button for Next Stage */}
          {currentStageIdx < ONBOARDING_STAGES.length - 1 && (
            <button
              onClick={() => handleForwardStatus(ONBOARDING_STAGES[currentStageIdx + 1])}
              className="btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-1.5"
            >
              <span>Advance to Stage {currentStageIdx + 2}: {ONBOARDING_STAGES[currentStageIdx + 1]}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Visual Interactive Progress Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {ONBOARDING_STAGES.map((stage, idx) => {
            const isCompleted = idx <= (currentStageIdx >= 0 ? currentStageIdx : 0);
            const isCurrent = idx === (currentStageIdx >= 0 ? currentStageIdx : 0);

            return (
              <div
                key={stage}
                onClick={() => handleForwardStatus(stage)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                  isCurrent
                    ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-50/50 border-emerald-300 hover:bg-emerald-50'
                    : 'bg-slate-50/70 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    isCurrent ? 'text-blue-700' : isCompleted ? 'text-emerald-700' : 'text-slate-500'
                  }`}>
                    Stage {idx + 1}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-300" />
                  )}
                </div>

                <div className={`text-xs font-bold ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>
                  {stage}
                </div>

                <div className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  <span>{isCurrent ? 'Active Stage' : `Set to ${stage}`}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ASSIGNED EMPLOYEE LEAD & HANDOVER TO NEXT USER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-blue-600" />
            Assigned Staff Lead & Task Handover
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Onboarding Lead
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="flex items-center gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200/80">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
              {(partner.assigned_employee_name || 'E').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 font-medium">Current Staff Lead:</div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {partner.assigned_employee_name || 'Unassigned Lead'}
              </div>
            </div>
          </div>

          {/* Handover / Reassign to Next Employee */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Pass / Reassign Task to Next Staff Member:
            </label>
            <div className="flex gap-2">
              <select
                value={selectedReassignId}
                onChange={(e) => setSelectedReassignId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Next Staff Member --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name || emp.email} ({emp.role_name || (emp.is_admin ? 'Super Admin' : 'Staff')})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAssignEmployee}
                disabled={!selectedReassignId || selectedReassignId === String(partner.assigned_employee_id)}
                className="btn-primary text-xs py-2 px-4 shrink-0 disabled:opacity-50"
              >
                Reassign
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC MARKETPLACE REQUIRED COMPLIANCE DOCUMENTS CHECKLIST & INLINE UPLOAD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              Dynamic Marketplace Compliance Documents Checklist ({documents.length} Uploaded)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Assigned employee <strong className="text-slate-800">{partner.assigned_employee_name || 'lead'}</strong> must fill document numbers and attach files for <strong>{partner.account_name || 'Marketplace'}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDocModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Custom Document</span>
            </button>
          </div>
        </div>

        {/* Live Compliance Mandatory Progress Banner */}
        {mandatoryDocs.length > 0 && (
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
            allMandatoryDone
              ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950'
              : 'bg-blue-50/70 border-blue-200/90 text-blue-950'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
                allMandatoryDone ? 'bg-emerald-600' : 'bg-blue-600'
              }`}>
                {allMandatoryDone ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  Compliance Documents Progress: {uploadedMandatoryCount} of {mandatoryDocs.length} Mandatory Completed
                </h3>
                <p className="text-xs font-medium opacity-80 mt-0.5">
                  {allMandatoryDone
                    ? '🎉 All mandatory compliance documents uploaded and verified! Click the submit button to complete onboarding.'
                    : `Upload remaining ${mandatoryDocs.length - uploadedMandatoryCount} mandatory document(s) to submit onboarding.`}
                </p>
              </div>
            </div>

            {/* ALL DOCS DONE SUBMIT BUTTON */}
            {allMandatoryDone && partner.onboarding_status !== 'Active' && (
              <button
                onClick={handleFinalSubmitOnboarding}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2 shrink-0 animate-pulse"
              >
                <Sparkles className="w-4 h-4" />
                <span>Submit & Complete Onboarding →</span>
              </button>
            )}
          </div>
        )}

        {/* Dynamic Required Checklist Cards with Inline Fields */}
        {accountRequiredDocs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Required Documents Checklist Template for {partner.account_name}
            </h3>

            <div className="grid grid-cols-1 gap-3.5">
              {accountRequiredDocs.map((req, idx) => {
                const existingDoc = documents.find((d) => d.document_type === req.type);
                const inputState = inlineDocForms[req.type] || { docNumber: '', fileUrl: '', fileName: '' };

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      existingDoc
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-3">
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                          {existingDoc ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                          )}
                          <span className="text-sm font-bold">{req.type}</span>
                          {req.required ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-extrabold border border-red-200">
                              Mandatory
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-bold">
                              Optional
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{req.desc}</p>
                      </div>

                      {existingDoc && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified & Uploaded
                          </span>
                          <button
                            onClick={() => handleDeleteDocument(existingDoc.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* If Already Uploaded: Show Verified Info */}
                    {existingDoc ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-emerald-200">
                        <div>
                          <span className="text-slate-500 font-semibold">Document / License #: </span>
                          <strong className="font-mono font-bold text-blue-900">{existingDoc.document_number || 'N/A'}</strong>
                        </div>

                        <div>
                          {existingDoc.file_url ? (
                            <a
                              href={existingDoc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
                            >
                              <FileText className="w-4 h-4" />
                              <span>View Attachment File</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No attachment file</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* If Not Uploaded Yet: Render Inline Input Form & File Selector */
                      <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              {req.type} Number / License # *
                            </label>
                            <input
                              type="text"
                              required
                              value={inputState.docNumber || ''}
                              onChange={(e) =>
                                setInlineDocForms((prev) => ({
                                  ...prev,
                                  [req.type]: { ...prev[req.type], docNumber: e.target.value },
                                }))
                              }
                              placeholder={`e.g. ${req.type === 'GSTIN Certificate' ? '24AAACG1234F1Z9' : req.type === 'PAN Card' ? 'ABCDE1234F' : 'Doc / License #'}`}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Select & Attach File *
                            </label>
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all shrink-0">
                                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                                <span>Choose File</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => handleInlineFileSelect(req.type, e)}
                                />
                              </label>
                              <span className="text-[11px] text-slate-600 font-mono truncate">
                                {inputState.fileName || 'No file chosen'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Fill document number and attach file to verify.
                          </span>

                          <button
                            type="button"
                            onClick={() => handleInlineUploadSubmit(req.type)}
                            disabled={inputState.isSubmitting}
                            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload & Verify {req.type}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Documents List */}
        {documents.length > 0 && (
          <div className="pt-3 space-y-2 border-t border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              All Uploaded Partner Documents Registry ({documents.length})
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <th className="py-3 px-3">Document Type</th>
                    <th className="py-3 px-3">Document / License #</th>
                    <th className="py-3 px-3">Attachment File</th>
                    <th className="py-3 px-3">Notes & Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        {doc.document_type}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-800">
                        {doc.document_number || 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View File Attachment</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No File Uploaded</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium max-w-xs truncate">
                        {doc.notes || 'Verified'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Fallback Upload Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="modal-content bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Upload className="w-5 h-5 text-blue-600" />
              Upload Partner Compliance Document
            </h3>

            <form onSubmit={handleAddDocumentModal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Document Type *</label>
                <input
                  type="text"
                  required
                  value={docForm.document_type}
                  onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
                  placeholder="e.g. GSTIN Certificate / FSSAI License"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Document / License Number *</label>
                <input
                  type="text"
                  required
                  value={docForm.document_number}
                  onChange={(e) => setDocForm({ ...docForm, document_number: e.target.value })}
                  placeholder="e.g. 24AAACG1234F1Z9"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Document Attachment File URL</label>
                <input
                  type="text"
                  value={docForm.file_url}
                  onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })}
                  placeholder="https://vault.s3.amazonaws.com/document.pdf"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Verification Status & Notes</label>
                <textarea
                  rows={2}
                  value={docForm.notes}
                  onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                  placeholder="e.g. Uploaded and verified by assigned employee lead"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
