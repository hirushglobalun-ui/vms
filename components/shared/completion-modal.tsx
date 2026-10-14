'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/store/app-context';
import { DocumentType, VehicleDocument } from '@/lib/types';
import {
  CheckCircle2,
  FileText,
  ArrowRight,
  UploadCloud,
  X,
  Calendar,
  Sparkles,
  ShieldCheck,
  RotateCw,
  FileCheck2,
  Clock,
  Layers,
} from 'lucide-react';
import { calculateNextDueDate, getDocumentTypeName } from '@/lib/renewals/engine';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: VehicleDocument;
  linkedTaskId?: string;
  registrationNumber: string;
}

// Helpers for document category badges & presets
function getDocTheme(docType: DocumentType) {
  switch (docType) {
    case 'PUC':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        ring: 'ring-emerald-500/20',
        accent: 'text-emerald-600',
        defaultQuick: 6,
        quickUnit: 'MONTHS' as const,
      };
    case 'INSURANCE':
      return {
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        ring: 'ring-purple-500/20',
        accent: 'text-purple-600',
        defaultQuick: 1,
        quickUnit: 'YEARS' as const,
      };
    case 'FITNESS':
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        ring: 'ring-amber-500/20',
        accent: 'text-amber-600',
        defaultQuick: 1,
        quickUnit: 'YEARS' as const,
      };
    case 'ROAD_TAX':
    case 'GREEN_TAX':
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        ring: 'ring-blue-500/20',
        accent: 'text-blue-600',
        defaultQuick: 1,
        quickUnit: 'YEARS' as const,
      };
    default:
      return {
        badge: 'bg-slate-50 text-slate-700 border-slate-200',
        ring: 'ring-slate-500/20',
        accent: 'text-slate-600',
        defaultQuick: 1,
        quickUnit: 'YEARS' as const,
      };
  }
}

export function CompletionModal({
  isOpen,
  onClose,
  document: doc,
  linkedTaskId,
  registrationNumber,
}: CompletionModalProps) {
  const { completeRenewalCycle } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [selectedQuickPreset, setSelectedQuickPreset] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const theme = getDocTheme(doc.documentType);
  const baseDate = doc.expiryDate || new Date().toISOString().split('T')[0];

  const handleQuickValidity = (years: number, label: string) => {
    const computed = calculateNextDueDate(baseDate, years, 'YEARS');
    setNewExpiryDate(computed);
    setSelectedQuickPreset(label);
    if (completionError) setCompletionError('');
  };

  const handleQuickMonths = (months: number, label: string) => {
    const computed = calculateNextDueDate(baseDate, months, 'MONTHS');
    setNewExpiryDate(computed);
    setSelectedQuickPreset(label);
    if (completionError) setCompletionError('');
  };

  const handleProcessFile = (file: File) => {
    setFileName(file.name);
    const sizeKb = Math.round(file.size / 1024);
    setFileSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFileUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFileName('');
    setFileUrl('');
    setFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompletionError('');

    if (!newExpiryDate) {
      setCompletionError('Please select or specify the new validity expiry date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeRenewalCycle(
        doc.id,
        {
          newExpiryDate,
          newIssueDate: new Date().toISOString().split('T')[0],
          fileName: fileName || undefined,
          fileUrl: fileUrl || undefined,
        },
        linkedTaskId
      );
      onClose();
    } catch (err: any) {
      setCompletionError(err?.message || 'Failed to complete renewal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Modern Header */}
        <div className="flex items-start gap-3.5 pb-3.5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {registrationNumber}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${theme.badge}`}>
                {getDocumentTypeName(doc.documentType)}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Complete Renewal Cycle
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record new validity milestone and archive current certificate.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {completionError && (
          <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2 animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 animate-ping" />
            <span>{completionError}</span>
          </div>
        )}

        {/* Sleek Cycle Timeline Flow */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white text-slate-500 flex items-center justify-center border border-slate-200 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Previous Expiry</div>
              <div className="font-mono font-bold text-slate-700 text-xs">{doc.expiryDate || 'N/A'}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 text-slate-300">
            <div className="w-6 h-0.5 bg-slate-200" />
            <ArrowRight className="w-4 h-4 text-blue-500" />
            <div className="w-6 h-0.5 bg-slate-200" />
          </div>

          <div className="flex items-center gap-2 text-right">
            <div>
              <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">New Expiry</div>
              <div className="font-mono font-bold text-blue-700 text-xs">
                {newExpiryDate ? (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {newExpiryDate}
                  </span>
                ) : (
                  <span className="text-slate-400 italic font-normal">Select below</span>
                )}
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Expiry Date & Quick Intervals */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              New Validity Expiry Date <span className="text-rose-500">*</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">DD / MM / YYYY</span>
          </label>

          <input
            type="date"
            required
            value={newExpiryDate}
            onChange={(e) => {
              setNewExpiryDate(e.target.value);
              setSelectedQuickPreset(null);
              if (completionError) setCompletionError('');
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all cursor-pointer shadow-2xs"
          />

          {/* Quick Preset Segmented Pills */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <RotateCw className="w-2.5 h-2.5" /> Presets:
              </span>

              {doc.documentType === 'PUC' && (
                <button
                  type="button"
                  onClick={() => handleQuickMonths(6, '+6 Months (PUC)')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    selectedQuickPreset === '+6 Months (PUC)'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  +6 Mo (PUC)
                </button>
              )}

              <button
                type="button"
                onClick={() => handleQuickValidity(1, '+1 Year')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  selectedQuickPreset === '+1 Year'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                +1 Year
              </button>

              <button
                type="button"
                onClick={() => handleQuickValidity(2, '+2 Years')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  selectedQuickPreset === '+2 Years'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                +2 Years
              </button>

              <button
                type="button"
                onClick={() => handleQuickValidity(3, '+3 Years')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  selectedQuickPreset === '+3 Years'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                +3 Years
              </button>

              <button
                type="button"
                onClick={() => handleQuickValidity(5, '+5 Years')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  selectedQuickPreset === '+5 Years'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                +5 Years
              </button>
            </div>
          </div>
        </div>

        {/* Compact File Uploader */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              Attach Digital Copy (Optional)
            </span>
            <span className="text-[11px] font-normal text-slate-400">PDF, JPG, PNG (Max 15MB)</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            id="renewalDocUpload"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
          />

          {fileName ? (
            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-slate-900 truncate max-w-[220px] sm:max-w-xs text-xs">
                    {fileName}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Attached {fileSize && `• ${fileSize}`}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <label
                  htmlFor="renewalDocUpload"
                  className="px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                >
                  Change
                </label>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="renewalDocUpload"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border border-dashed rounded-xl py-3 px-4 text-center transition-all cursor-pointer flex items-center justify-center gap-2.5 group ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 bg-slate-50/50'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 transition-colors">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                  Upload renewed certificate scan
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Click to browse or drag &amp; drop file here
                </span>
              </div>
            </label>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="rounded-xl px-5 text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm &amp; Roll Over</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
