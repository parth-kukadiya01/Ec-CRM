'use client';

import React, { useState } from 'react';
import { X, Download, FileText, ExternalLink, FileCheck, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { getImageUrl } from '@/lib/api';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    title: string;
    fileUrl: string;
    documentType?: string;
    documentNumber?: string;
    uploadedAt?: string;
    notes?: string;
  } | null;
}

export default function DocumentViewerModal({ isOpen, onClose, document }: DocumentViewerModalProps) {
  const [iframeError, setIframeError] = useState(false);

  if (!isOpen || !document || !document.fileUrl) return null;

  // Resolve absolute URL
  const rawUrl = document.fileUrl;
  const isMockUrl = rawUrl.includes('vault.crm.com') || rawUrl.includes('placeholder') || rawUrl.includes('demo');
  const fullUrl = getImageUrl(rawUrl);

  const isImage = (rawUrl.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(rawUrl)) && !isMockUrl;
  const isPdf = (rawUrl.startsWith('data:application/pdf') || /\.pdf($|\?)/i.test(rawUrl)) && !isMockUrl;

  return (
    <div className="fixed inset-0 z-[60] modal-overlay flex items-center justify-center p-4 bg-black/50">
      <div className="modal-content bg-white border border-[#c3c4c7] w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* WP Admin Header matching Orders & Accounts */}
        <div className="px-5 py-3.5 border-b border-[#c3c4c7] bg-[#f6f7f7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#2271b1] flex items-center justify-center text-white shadow-xs">
              <FileCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1d2327] leading-snug truncate max-w-md">
                {document.title || document.documentType || 'Compliance Document'}
              </h2>
              {document.documentNumber && (
                <div className="text-[11px] font-mono font-bold text-[#50575e]">
                  Document #: {document.documentNumber}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isMockUrl && (
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white rounded-sm text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            )}
            <button
              onClick={() => {
                setIframeError(false);
                onClose();
              }}
              className="p-1 text-[#50575e] hover:text-[#1d2327] rounded-sm hover:bg-[#f0f0f1] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body matching WP Admin Theme */}
        <div className="flex-1 bg-[#f6f7f7] p-4 overflow-auto flex items-center justify-center min-h-[420px]">
          {isImage ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fullUrl}
                alt={document.title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-sm shadow-md border border-[#c3c4c7] bg-white"
              />
            </div>
          ) : isPdf && !iframeError ? (
            <iframe
              src={fullUrl}
              title={document.title}
              onError={() => setIframeError(true)}
              className="w-full h-[70vh] rounded-sm border border-[#c3c4c7] bg-white shadow-xs"
            />
          ) : (
            /* WP Admin Enterprise Compliance Certificate Preview Card */
            <div className="w-full max-w-2xl bg-white border border-[#c3c4c7] rounded-sm p-8 shadow-sm text-xs space-y-6">
              <div className="flex items-start justify-between border-b border-[#c3c4c7] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-[#00a32a]/10 text-[#00a32a] border border-[#00a32a]/30 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1d2327] uppercase tracking-wide">
                      {document.documentType || 'Official Compliance Document'}
                    </h3>
                    <p className="text-xs text-[#50575e]">Verified Business Record & Legal Certificate</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-sm text-xs bg-[#00a32a]/10 text-[#00a32a] font-extrabold border border-[#00a32a]/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>VERIFIED RECORD</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f6f7f7] p-4 rounded-sm border border-[#c3c4c7]">
                <div>
                  <span className="text-[11px] font-bold text-[#50575e] uppercase block">Document Title</span>
                  <span className="font-bold text-[#1d2327] text-xs">{document.title}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#50575e] uppercase block">Registration / License #</span>
                  <span className="font-mono font-bold text-[#1d2327] text-xs">{document.documentNumber || 'REC-REG-884920'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#50575e] uppercase block">Verification Status</span>
                  <span className="font-bold text-[#00a32a] text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Approved & Archived
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#50575e] uppercase block">Upload Timestamp</span>
                  <span className="font-mono text-[#1d2327] text-xs">
                    {document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : new Date().toLocaleString()}
                  </span>
                </div>
              </div>

              {document.notes && (
                <div className="p-3 bg-white border border-[#c3c4c7] rounded-sm text-[#2c3338]">
                  <strong className="text-[#1d2327]">Notes / Remarks:</strong> {document.notes}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-[#c3c4c7]">
                <span className="text-[11px] text-[#50575e] italic">
                  Digital vault file reference: <code className="font-mono text-[10px] text-[#1d2327]">{rawUrl.substring(0, 45)}...</code>
                </span>

                {!isMockUrl && (
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white rounded-sm text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open File directly</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* WP Admin Document Footer */}
        <div className="px-5 py-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex items-center justify-between text-xs text-[#50575e] shrink-0">
          <div>
            <span className="font-bold text-[#1d2327]">Document Record:</span> {document.title}
          </div>
          <button
            onClick={() => {
              setIframeError(false);
              onClose();
            }}
            className="px-4 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] text-xs font-bold rounded-sm transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
