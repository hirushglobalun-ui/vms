'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { DocumentType, ValidityUnit, VehicleDocument } from '@/lib/types';
import { calculateNextDueDate, getDefaultReminderDays, getDocumentTypeName } from '@/lib/renewals/engine';
import { FileUp, Calendar, AlertCircle } from 'lucide-react';

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
  const { addDocument, updateDocument, settings } = useApp();

  const [documentType, setDocumentType] = useState<DocumentType>('INSURANCE');
  const [documentName, setDocumentName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [lastPaymentDate, setLastPaymentDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [validityValue, setValidityValue] = useState<number | ''>('');
  const [validityUnit, setValidityUnit] = useState<ValidityUnit>('YEARS');
  const [amount, setAmount] = useState<number | ''>('');
  const [reminderDays, setReminderDays] = useState<number>(30);
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [policyType, setPolicyType] = useState<'COMPREHENSIVE' | 'THIRD_PARTY' | 'BUMPER_TO_BUMPER' | 'OTHER'>('COMPREHENSIVE');
  const [testingCentre, setTestingCentre] = useState('');
  const [fitnessType, setFitnessType] = useState('');
  const [permitType, setPermitType] = useState('');
  const [notes, setNotes] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (initialDocument) {
      setDocumentType(initialDocument.documentType);
      setDocumentName(initialDocument.documentName || '');
      setDocumentNumber(initialDocument.documentNumber || '');
      setStartDate(initialDocument.startDate || '');
      setIssueDate(initialDocument.issueDate || '');
      setLastPaymentDate(initialDocument.lastPaymentDate || '');
      setExpiryDate(initialDocument.expiryDate || '');
      setValidityValue(initialDocument.validityValue ?? '');
      setValidityUnit(initialDocument.validityUnit || 'YEARS');
      setAmount(initialDocument.amount ?? '');
      setReminderDays(initialDocument.reminderDays ?? 30);
      setInsuranceProvider(initialDocument.insuranceProvider || '');
      setPolicyType(initialDocument.policyType || 'COMPREHENSIVE');
      setTestingCentre(initialDocument.testingCentre || '');
      setFitnessType(initialDocument.fitnessType || '');
      setPermitType(initialDocument.permitType || '');
      setNotes(initialDocument.notes || '');
      setFileName(initialDocument.fileName || '');
    } else {
      // Defaults for new doc
      setDocumentType('INSURANCE');
      setDocumentName('');
      setDocumentNumber('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setIssueDate(new Date().toISOString().split('T')[0]);
      setLastPaymentDate('');
      setExpiryDate('');
      setValidityValue('');
      setValidityUnit('YEARS');
      setAmount('');
      setReminderDays(getDefaultReminderDays('INSURANCE'));
      setInsuranceProvider('');
      setPolicyType('COMPREHENSIVE');
      setTestingCentre('');
      setFitnessType('');
      setPermitType('');
      setNotes('');
      setFileName('');
    }
  }, [initialDocument, isOpen]);

  const handleDocumentTypeChange = (newType: DocumentType) => {
    setDocumentType(newType);
    setReminderDays(getDefaultReminderDays(newType));
  };

  const handleCalculateFromValidity = () => {
    const base = lastPaymentDate || issueDate || startDate;
    if (base && validityValue) {
      const calculated = calculateNextDueDate(base, Number(validityValue), validityUnit);
      setExpiryDate(calculated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const docPayload = {
      vehicleId,
      clientId,
      documentType,
      documentName: documentType === 'OTHER' ? documentName : undefined,
      documentNumber: documentNumber || undefined,
      startDate: startDate || undefined,
      issueDate: issueDate || undefined,
      lastPaymentDate: lastPaymentDate || undefined,
      expiryDate: expiryDate || undefined,
      validityValue: validityValue ? Number(validityValue) : undefined,
      validityUnit: validityValue ? validityUnit : undefined,
      amount: amount ? Number(amount) : undefined,
      reminderDays: Number(reminderDays) || 30,
      notes: notes || undefined,
      fileName: fileName || undefined,
      fileUrl: fileName ? `/uploads/${fileName}` : undefined,
      insuranceProvider: documentType === 'INSURANCE' ? insuranceProvider : undefined,
      policyType: documentType === 'INSURANCE' ? policyType : undefined,
      testingCentre: documentType === 'PUC' ? testingCentre : undefined,
      fitnessType: documentType === 'FITNESS' ? fitnessType : undefined,
      permitType: documentType === 'PERMIT' ? permitType : undefined,
    };

    if (initialDocument) {
      updateDocument(initialDocument.id, docPayload);
    } else {
      addDocument(docPayload);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialDocument ? `Edit ${getDocumentTypeName(documentType)}` : 'Add Vehicle Document'}
      description="Record registration, tax, insurance, or compliance details."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Document Category"
            value={documentType}
            onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
            disabled={Boolean(initialDocument)}
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

          {documentType === 'OTHER' ? (
            <Input
              label="Document Name / Title"
              required
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g. Hazardous Goods Endorsement"
            />
          ) : (
            <Input
              label="Document / Policy / Certificate Number"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="e.g. POL-992384 or PUC-102"
            />
          )}
        </div>

        {/* Type-Specific Fields */}
        {documentType === 'INSURANCE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <Input
              label="Insurance Provider / Company"
              value={insuranceProvider}
              onChange={(e) => setInsuranceProvider(e.target.value)}
              placeholder="e.g. Oriental, New India, Digit, ICICI Lombard"
            />
            <Select
              label="Policy Coverage Type"
              value={policyType}
              onChange={(e) => setPolicyType(e.target.value as any)}
            >
              <option value="COMPREHENSIVE">Comprehensive (Package)</option>
              <option value="THIRD_PARTY">Third Party (TP Only)</option>
              <option value="BUMPER_TO_BUMPER">Bumper to Bumper (Zero Dep)</option>
              <option value="OTHER">Other Add-on</option>
            </Select>
          </div>
        )}

        {documentType === 'PUC' && (
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
            <Input
              label="Authorized Testing Centre / Station"
              value={testingCentre}
              onChange={(e) => setTestingCentre(e.target.value)}
              placeholder="e.g. Malabar Green Fuel Smoke Testing Center, Perinthalmanna"
            />
          </div>
        )}

        {documentType === 'FITNESS' && (
          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
            <Input
              label="Fitness Category / Class"
              value={fitnessType}
              onChange={(e) => setFitnessType(e.target.value)}
              placeholder="e.g. Commercial Light Passenger Vehicle (Taxi)"
            />
          </div>
        )}

        {documentType === 'PERMIT' && (
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <Input
              label="Permit Classification"
              value={permitType}
              onChange={(e) => setPermitType(e.target.value)}
              placeholder="e.g. All Kerala Taxi, National Goods Permit"
            />
          </div>
        )}

        {/* Validity & Dates Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Validity, Due Dates & Reminder Threshold
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Issue / Start Date"
              type="date"
              value={issueDate || startDate || lastPaymentDate}
              onChange={(e) => {
                setIssueDate(e.target.value);
                setStartDate(e.target.value);
                setLastPaymentDate(e.target.value);
              }}
            />

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Validity Period Calculation (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={validityValue}
                  onChange={(e) => setValidityValue(e.target.value ? Number(e.target.value) : '')}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
                <select
                  value={validityUnit}
                  onChange={(e) => setValidityUnit(e.target.value as ValidityUnit)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  <option value="YEARS">Years</option>
                  <option value="MONTHS">Months</option>
                  <option value="DAYS">Days</option>
                </select>
                <button
                  type="button"
                  onClick={handleCalculateFromValidity}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Calculate Due Date
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Expiry / Due Date"
              type="date"
              required={documentType !== 'RC'}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              helperText="Determines renewal status & alerts"
            />

            <Input
              label="Amount / Fee / Premium (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 14500"
            />

            <Input
              label="Reminder Notice (Days)"
              type="number"
              value={reminderDays}
              onChange={(e) => setReminderDays(Number(e.target.value))}
              helperText="Flags 'Due Soon' this many days prior"
            />
          </div>
        </div>

        {/* File attachment */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Attach Document Copy (PDF / Scan)
          </label>
          <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-slate-50 transition-colors">
            <input
              type="file"
              id="docFileUpload"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFileName(e.target.files[0].name);
                }
              }}
            />
            <label
              htmlFor="docFileUpload"
              className="cursor-pointer text-xs flex flex-col items-center justify-center text-slate-600 gap-1"
            >
              <FileUp className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-600">
                {fileName ? fileName : 'Click to attach document scan or receipt'}
              </span>
              <span className="text-[11px] text-slate-400">PDF, JPG, or PNG up to 15MB</span>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Operational Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any specific conditions, endorsement notes, or client instructions..."
            className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialDocument ? 'Update Document' : 'Save Document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
