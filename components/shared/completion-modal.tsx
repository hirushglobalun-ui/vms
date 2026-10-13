'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { VehicleDocument } from '@/lib/types';
import { CheckCircle2, FileText, ArrowRight, Wallet, AlertCircle } from 'lucide-react';
import { calculateNextDueDate, getDocumentTypeName } from '@/lib/renewals/engine';
import { calculatePaymentBalance } from '@/lib/utils';

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
  
  // Financial tracking (Total Cost vs Received)
  const [totalCost, setTotalCost] = useState<string>(doc.amount ? String(doc.amount) : '');
  const [amountReceived, setAmountReceived] = useState<string>('');

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

  // Compute live financial settlement
  const balanceSummary = calculatePaymentBalance(
    totalCost ? Number(totalCost) : 0,
    amountReceived ? Number(amountReceived) : 0
  );

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
        newAmount: totalCost ? Number(totalCost) : undefined,
        amountReceived: amountReceived ? Number(amountReceived) : undefined,
        balanceAmount: balanceSummary.balanceAmount,
        paymentStatus: balanceSummary.paymentStatus,
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
      title="Complete Renewal & Next Cycle Setup"
      description={`Record completed renewal for ${registrationNumber}, collect fees, and prompt next valid expiry date.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current status banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-800">
              {getDocumentTypeName(doc.documentType)}:
            </span>{' '}
            <span className="text-slate-600">Previous Expiry: {doc.expiryDate || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            <ArrowRight className="w-3.5 h-3.5" />
            Archive to History &amp; Start Next Cycle
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="New Document / Policy Number"
            value={newDocumentNumber}
            onChange={(e) => setNewDocumentNumber(e.target.value)}
            placeholder="e.g. POL-2026-9901 or PUC-778"
          />

          <Input
            label="Issue / Payment Date"
            type="date"
            required
            value={newIssueDate}
            onChange={(e) => setNewIssueDate(e.target.value)}
          />
        </div>

        {/* Valid Until When? (Next Expiry Date) */}
        <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-2">
          <Input
            label="Valid Until When? (Next Expiry Date)"
            type="date"
            required
            value={newExpiryDate}
            onChange={(e) => setNewExpiryDate(e.target.value)}
            className="font-bold text-slate-900"
          />

          {/* Quick validity buttons */}
          <div className="flex gap-2 pt-1 flex-wrap items-center">
            <span className="text-[11px] font-bold text-purple-900">Quick Set:</span>
            <button
              type="button"
              onClick={() => handleQuickMonths(6)}
              className="text-xs bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              +6 Months (PUC)
            </button>
            <button
              type="button"
              onClick={() => handleQuickValidity(1)}
              className="text-xs bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              +1 Year (Insurance / Fitness)
            </button>
            <button
              type="button"
              onClick={() => handleQuickValidity(2)}
              className="text-xs bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              +2 Years
            </button>
          </div>
        </div>

        {/* Financial Settlement & Billing Section */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Financial Billing &amp; Settlement</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Total Service / Policy Fee (₹)"
              type="number"
              placeholder="e.g. 5500"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              helperText="Charge for insurance/fitness/puc"
            />

            <Input
              label="Amount Received from Client (₹)"
              type="number"
              placeholder="e.g. 10000 or 2000"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              helperText="Cash / UPI received"
            />
          </div>

          {/* Live Dynamic Settlement Calculation */}
          {(totalCost !== '' || amountReceived !== '') && (
            <div className="pt-1">
              {balanceSummary.paymentStatus === 'REFUND_DUE' ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
                  <Wallet className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <strong>Return to Client: ₹{balanceSummary.balanceAmount.toLocaleString('en-IN')}</strong>
                    <span className="block text-[11px] text-blue-700">Client overpaid (Fee: ₹{Number(totalCost).toLocaleString('en-IN')} | Paid: ₹{Number(amountReceived).toLocaleString('en-IN')})</span>
                  </div>
                </div>
              ) : balanceSummary.paymentStatus === 'BALANCE_DUE' ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <strong>Due from Client: ₹{balanceSummary.balanceAmount.toLocaleString('en-IN')}</strong>
                    <span className="block text-[11px] text-amber-700">Pending balance to collect (Fee: ₹{Number(totalCost).toLocaleString('en-IN')} | Paid: ₹{Number(amountReceived).toLocaleString('en-IN')})</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Payment Fully Settled (₹{Number(totalCost).toLocaleString('en-IN')})</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload attachment */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Attach Renewed Policy / Certificate Document (Optional)
          </label>
          <div className="border border-dashed border-slate-300 rounded-lg p-2.5 text-center hover:bg-slate-50 transition-colors">
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
              className="cursor-pointer text-xs flex items-center justify-center text-slate-600 gap-1.5"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-600">
                {fileName ? fileName : 'Upload PDF / JPG policy copy'}
              </span>
            </label>
          </div>
        </div>

        {/* Notes */}
        <Input
          label="Notes / Remarks"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. 50% NCB applied, certificate handed over to driver"
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} className="gap-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            Confirm Renewal &amp; Update System
          </Button>
        </div>
      </form>
    </Modal>
  );
}
