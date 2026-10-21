'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { DocumentType, VehicleDocument } from '@/lib/types';
import { getDefaultReminderDays, getDocumentTypeName } from '@/lib/renewals/engine';
import { FileUp, FileText, CheckCircle2, X } from 'lucide-react';
import { validateName } from '@/lib/validation';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  clientId: string;
  initialDocument?: VehicleDocument | null;
}

export function DocumentModal({
  isOpen,
  onClose,
  vehicleId,
  clientId,
  initialDocument,
}: DocumentModalProps) {
  const { addDocument, updateDocument } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documentType, setDocumentType] = useState<DocumentType>('INSURANCE');
  const [documentName, setDocumentName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [reminderDays, setReminderDays] = useState<number>(30);
  const [docError, setDocError] = useState('');
  
  // Real File Upload State
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDocError('');
    if (initialDocument) {
      setDocumentType(initialDocument.documentType);
      setDocumentName(initialDocument.documentName || '');
      setExpiryDate(initialDocument.expiryDate || '');
      setReminderDays(initialDocument.reminderDays ?? 30);
      setFileName(initialDocument.fileName || '');
      setFileUrl(initialDocument.fileUrl || '');
      setFileSize(initialDocument.fileUrl ? 'Attached' : '');
    } else {
      setDocumentType('INSURANCE');
      setDocumentName('');
      setExpiryDate('');
      setReminderDays(getDefaultReminderDays('INSURANCE'));
      setFileName('');
      setFileUrl('');
      setFileSize('');
    }
    setIsSaving(false);
  }, [initialDocument, isOpen]);

  const handleDocumentTypeChange = (newType: DocumentType) => {
    setDocumentType(newType);
    setReminderDays(getDefaultReminderDays(newType));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
    setDocError('');

    if (documentType === 'OTHER') {
      const nameVal = validateName(documentName, 'Document name / title');
      if (!nameVal.isValid) {
        setDocError(nameVal.error || 'Please enter a valid document name.');
        return;
      }
    }

    if (documentType !== 'RC' && !expiryDate) {
      setDocError('Please select a valid expiry / compliance due date.');
      return;
    }

    setIsSaving(true);

    try {
      const docPayload = {
        vehicleId,
        clientId,
        documentType,
        documentName: documentType === 'OTHER' ? documentName : undefined,
        documentNumber: initialDocument?.documentNumber || undefined,
        startDate: initialDocument?.startDate || undefined,
        issueDate: initialDocument?.issueDate || undefined,
        lastPaymentDate: initialDocument?.lastPaymentDate || undefined,
        expiryDate: expiryDate || undefined,
        reminderDays: Number(reminderDays) || 30,
        notes: initialDocument?.notes || undefined,
        fileName: fileName || undefined,
        fileUrl: fileUrl || (fileName ? `/uploads/${fileName}` : undefined),
        insuranceProvider: initialDocument?.insuranceProvider || undefined,
        policyType: initialDocument?.policyType || undefined,
        testingCentre: initialDocument?.testingCentre || undefined,
        fitnessType: initialDocument?.fitnessType || undefined,
        permitType: initialDocument?.permitType || undefined,
      };

      if (initialDocument) {
        await updateDocument(initialDocument.id, docPayload);
      } else {
        await addDocument(docPayload);
      }
      onClose();
    } catch (err) {
      console.error('Save document error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialDocument ? `Edit ${getDocumentTypeName(documentType)}` : 'Add Vehicle Document'}
      description="Update compliance expiry date and attach digital copy scan."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {docError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2 animate-in fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
            {docError}
          </div>
        )}

        {/* Only when creating new document, select category */}
        {!initialDocument && (
          <div className="space-y-3">
            <Select
              label="Document Category"
              value={documentType}
              onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
            >
              <option value="INSURANCE">Insurance Policy</option>
              <option value="ROAD_TAX">Road Tax (MVD)</option>
              <option value="GREEN_TAX">Green Tax</option>
              <option value="PUC">Pollution / PUC Certificate</option>
              <option value="FITNESS">Fitness Certificate (FC)</option>
              <option value="PERMIT">Vehicle Permit</option>
              <option value="RC">RC / Registration Card</option>
              <option value="OTHER">Other Custom Document</option>
            </Select>

            {documentType === 'OTHER' && (
              <Input
                label="Document Name / Title"
                required
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g. Endorsement Certificate"
              />
            )}
          </div>
        )}

        {/* PRIMARY FOCUS: Expiry / Due Date */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Expiry / Due Date</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-blue-600 font-medium">Auto-triggers renewal alerts</span>
          </div>
          <Input
            type="date"
            required={documentType !== 'RC'}
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="bg-slate-50/50 focus:bg-white font-mono font-bold text-sm"
          />
        </div>

        {/* PRIMARY FOCUS: Real File Upload & Attachment */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              Attach Document Copy / Digital Scan
            </label>
            <span className="text-[11px] text-slate-400">PDF, JPG, PNG up to 15MB</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            id="docFileUpload"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
          />

          {fileName ? (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs transition-all shadow-xs">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-slate-900 truncate max-w-xs sm:max-w-sm">
                    {fileName}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>File attached and ready {fileSize && `(${fileSize})`}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <label
                  htmlFor="docFileUpload"
                  className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100/60 rounded-lg cursor-pointer transition-colors"
                >
                  Change
                </label>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="docFileUpload"
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/40 hover:bg-blue-50/20 rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors">
                <FileUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                Click or drag &amp; drop document scan or policy PDF
              </span>
              <span className="text-[11px] text-slate-400">Stores digital copy for office reference</span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl px-4 text-xs font-semibold">
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving} className="rounded-xl px-5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20">
            {initialDocument ? 'Update Document' : 'Save Document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
