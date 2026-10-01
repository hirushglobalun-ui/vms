'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { VehicleDocument } from '@/lib/types';
import { CheckCircle2, Calendar, FileText, ArrowRight } from 'lucide-react';
import { calculateNextDueDate, getDocumentTypeName } from '@/lib/renewals/engine';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: VehicleDocument;
  linkedTaskId?: string;
  registrationNumber: string;
}

export function CompletionModal({
  isOpen,
  onClose,
  document: doc,
  linkedTaskId,
  registrationNumber,
}: CompletionModalProps) {
  const { completeRenewalCycle } = useApp();

  const [newDocumentNumber, setNewDocumentNumber] = useState(doc.documentNumber || '');
  const [newIssueDate, setNewIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newAmount, setNewAmount] = useState(doc.amount ? String(doc.amount) : '');
  const [notes, setNotes] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick preset helper
  const handleQuickValidity = (years: number) => {
    const computed = calculateNextDueDate(newIssueDate, years, 'YEARS');
    setNewExpiryDate(computed);
  };

  const handleQuickMonths = (months: number) => {
    const computed = calculateNextDueDate(newIssueDate, months, 'MONTHS');
    setNewExpiryDate(computed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpiryDate) {
      alert('Please enter or select the new expiry/due date for the next cycle.');
      return;
    }

    setIsSubmitting(true);
    completeRenewalCycle(
      doc.id,
      {
        newDocumentNumber: newDocumentNumber || undefined,
        newIssueDate,
        newExpiryDate,
        newAmount: newAmount ? Number(newAmount) : undefined,
        notes: notes || undefined,
        fileName: fileName || undefined,
        fileUrl: fileName ? `/uploads/${fileName}` : undefined,
      },
      linkedTaskId
    );

    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Renewal Cycle"
      description={`Record completed renewal for ${registrationNumber} and set up the next tracking cycle.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current status banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-800">
              {getDocumentTypeName(doc.documentType)}:
            </span>{' '}
            <span className="text-slate-600">Old Expiry: {doc.expiryDate || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            <ArrowRight className="w-3.5 h-3.5" />
            Archive to History & Start Next Cycle
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="New Document / Policy Number"
            value={newDocumentNumber}
            onChange={(e) => setNewDocumentNumber(e.target.value)}
            placeholder="e.g. POL-2026-9901 or PUC-778"
          />

          <Input
            label="Payment / Premium Amount (₹)"
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="e.g. 15000"
          />

          <Input
            label="Issue / Payment Date"
            type="date"
            required
            value={newIssueDate}
            onChange={(e) => setNewIssueDate(e.target.value)}
          />

          <div>
            <Input
              label="Next Expiry / Due Date"
              type="date"
              required
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
            />
            {/* Quick calculation buttons */}
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickMonths(6)}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer"
              >
                +6 Months (PUC)
              </button>
              <button
                type="button"
                onClick={() => handleQuickValidity(1)}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer"
              >
                +1 Year (Ins/Fitness)
              </button>
              <button
                type="button"
                onClick={() => handleQuickValidity(5)}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer"
              >
                +5 Years (Tax/Permit)
              </button>
            </div>
          </div>
        </div>

        {/* Upload attachment */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Attach New Document File (PDF / JPG / PNG)
          </label>
          <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-slate-50 transition-colors">
            <input
              type="file"
              id="renewalDocFile"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFileName(e.target.files[0].name);
                }
              }}
            />
            <label
              htmlFor="renewalDocFile"
              className="cursor-pointer text-xs flex flex-col items-center justify-center text-slate-600 gap-1"
            >
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-600">
                {fileName ? fileName : 'Click to select renewed document file'}
              </span>
              <span className="text-[11px] text-slate-400">PDF, JPG, or PNG up to 15MB</span>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Completion Notes & Follow-up Summary
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid online via Parivahan portal. Certificate received and WhatsApp copy forwarded to client."
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            isLoading={isSubmitting}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete & Track Next Cycle
          </Button>
        </div>
      </form>
    </Modal>
  );
}
