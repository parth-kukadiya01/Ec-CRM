'use client';

import React, { useState, useRef } from 'react';
import { ordersApi } from '@/lib/api';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  FileCheck,
  Info,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BulkUploadOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function BulkUploadOrdersModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkUploadOrdersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    errors?: string[];
  } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setErrorDetails(null);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorDetails(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      setErrorDetails({
        message: 'Invalid file format. Please upload a .csv, .xlsx, or .xls file.'
      });
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      if (format === 'csv') setDownloadingCsv(true);
      else setDownloadingXlsx(true);
      await ordersApi.downloadSampleTemplate(format);
    } catch (err) {
      console.error('Failed to download template:', err);
      alert('Failed to download sample template. Please try again.');
    } finally {
      if (format === 'csv') setDownloadingCsv(false);
      else setDownloadingXlsx(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setErrorDetails(null);

    try {
      const res = await ordersApi.uploadBulkFile(file);
      const msg = res.data?.message || 'Orders imported successfully!';
      onSuccess(msg);
      handleClose();
    } catch (err: any) {
      console.error('Bulk upload error:', err);
      const data = err.response?.data;
      if (data?.detail && typeof data.detail === 'object') {
        setErrorDetails({
          message: data.detail.message || 'Validation failed. Please review the errors below.',
          errors: data.detail.errors || []
        });
      } else if (typeof data?.detail === 'string') {
        setErrorDetails({
          message: data.detail
        });
      } else {
        setErrorDetails({
          message: 'An unexpected error occurred while processing the file. Please check file format.'
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setErrorDetails(null);
    setIsDragging(false);
    setShowGuide(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const isExcel = file?.name.endsWith('.xlsx') || file?.name.endsWith('.xls');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#c3c4c7] w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col font-sans">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#f0f0f1] border-b border-[#c3c4c7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#2271b1]/10 text-[#2271b1] flex items-center justify-center border border-[#2271b1]/20">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1d2327]">Bulk Order Upload</h2>
              <p className="text-[11px] text-[#50575e]">Import orders using CSV or Excel (.xlsx/.xls) spreadsheet</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-[#50575e] hover:text-[#1d2327] hover:bg-[#dcdcde] p-1 rounded-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Sample Templates Card */}
          <div className="p-3.5 bg-slate-50 border border-[#c3c4c7] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-[#1d2327] flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Download Sample Template</span>
              </div>
              <p className="text-[11px] text-[#50575e]">
                Pre-formatted template with headers and multi-product order examples.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                disabled={downloadingCsv}
                className="px-2.5 py-1.5 bg-white border border-[#c3c4c7] hover:bg-[#f0f0f1] text-[#2c3338] font-bold rounded-xs shadow-2xs transition-all flex items-center gap-1.5"
                title="Download Sample CSV Template"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>{downloadingCsv ? 'Downloading...' : 'Sample CSV'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('xlsx')}
                disabled={downloadingXlsx}
                className="px-2.5 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-900 font-bold rounded-xs shadow-2xs transition-all flex items-center gap-1.5"
                title="Download Sample Excel (.xlsx) Template"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>{downloadingXlsx ? 'Downloading...' : 'Sample Excel (.xlsx)'}</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#2271b1] bg-[#e8f3fc]'
                : file
                ? 'border-emerald-400 bg-emerald-50/50'
                : 'border-[#c3c4c7] hover:border-[#2271b1] hover:bg-[#f6f7f7]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-sm bg-white border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-xs">
                  {isExcel ? <FileSpreadsheet className="w-5 h-5 text-emerald-700" /> : <FileText className="w-5 h-5 text-blue-600" />}
                </div>
                <div>
                  <div className="font-bold text-[#1d2327] text-sm flex items-center justify-center gap-1.5">
                    <span>{file.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Ready to validate and import</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-1 text-[11px] text-red-600 hover:text-red-800 font-bold hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove File
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-sm bg-[#f0f0f1] border border-[#c3c4c7] flex items-center justify-center text-[#50575e]">
                  <Upload className="w-5 h-5 text-[#2271b1]" />
                </div>
                <div>
                  <p className="font-bold text-[#1d2327] text-sm">
                    Drag and drop your <span className="text-[#2271b1]">CSV</span> or <span className="text-emerald-700">Excel (.xlsx)</span> file here
                  </p>
                  <p className="text-[11px] text-[#50575e] mt-0.5">
                    or click to browse from your computer
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Validation Error Details Display */}
          {errorDetails && (
            <div className="p-3.5 bg-red-50 border border-red-300 rounded-sm space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-red-900 text-xs">{errorDetails.message}</div>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    The entire import was stopped. Please fix the errors below in your file and upload again.
                  </p>
                </div>
              </div>

              {errorDetails.errors && errorDetails.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto bg-white border border-red-200 rounded-xs p-2 text-[11px] space-y-1.5 font-mono divide-y divide-red-100">
                  {errorDetails.errors.map((err, idx) => (
                    <div key={idx} className="pt-1 first:pt-0 text-red-800 flex items-start gap-1.5">
                      <span className="font-bold text-red-900 shrink-0">•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Guide & Rules Accordion */}
          <div className="border border-[#c3c4c7] rounded-sm overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-3 py-2 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-left flex items-center justify-between text-[#2c3338] font-bold text-xs transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#2271b1]" />
                <span>Multi-Product Orders & Validation Rules Guide</span>
              </div>
              {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showGuide && (
              <div className="p-3 bg-white text-[11px] text-[#50575e] space-y-2.5 border-t border-[#c3c4c7]">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#1d2327] shrink-0">1. Multi-Product Orders (2 Easy Ways):</span>
                  <div className="space-y-1">
                    <p>
                      <strong>Way A (Single Row with pipe <code>|</code>):</strong> Put items in one row separated by <code>|</code>. E.g., Product Name: <code>Item 1 | Item 2</code>, Qty: <code>2 | 1</code>, Price: <code>19.99 | 24.50</code>.
                    </p>
                    <p>
                      <strong>Way B (Multiple Rows):</strong> Put multiple rows with the <strong>exact same Order ID</strong>. They will automatically be bundled into one order.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#1d2327] shrink-0">2. Required Fields:</span>
                  <span>
                    <strong>Order ID</strong>, <strong>Product Name</strong>, <strong>Qty</strong> (integer &gt;= 1), and <strong>Price ($)</strong> (number &gt;= 0).
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#1d2327] shrink-0">3. Date Formats:</span>
                  <span>
                    Dates can be in <code>YYYY-MM-DD</code> or <code>DD/MM/YYYY</code> format.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#1d2327] shrink-0">4. Zero Partial Imports:</span>
                  <span>
                    If even one row has an invalid or missing value, no orders will be processed so your database remains clean and accurate.
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-1.5 bg-white border border-[#c3c4c7] hover:bg-[#f0f0f1] text-[#2c3338] font-bold text-xs rounded-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`px-4 py-1.5 font-bold text-xs rounded-sm shadow-xs transition-all flex items-center gap-1.5 ${
              !file || uploading
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#2271b1] hover:bg-[#135e96] text-white cursor-pointer'
            }`}
          >
            {uploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Validating & Importing...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload & Import Orders</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
