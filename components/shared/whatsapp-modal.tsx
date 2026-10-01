'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { buildWhatsAppUrl, generateWhatsAppMessage } from '@/lib/whatsapp';
import { useApp } from '@/lib/store/app-context';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { DocumentType } from '@/lib/types';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientMobile: string;
  registrationNumber: string;
  documentType: DocumentType | string;
  dueDate?: string;
  vehicleId?: string;
}

export function WhatsAppModal({
  isOpen,
  onClose,
  clientName,
  clientMobile,
  registrationNumber,
  documentType,
  dueDate,
  vehicleId,
}: WhatsAppModalProps) {
  const { settings, addVehicle } = useApp();
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const generated = generateWhatsAppMessage({
        clientName,
        clientMobile,
        documentType,
        registrationNumber,
        dueDate,
        companyName: settings.companyName,
        companyMobile: settings.companyMobile,
      });
      setMessage(generated);
      setCopied(false);
    }
  }, [isOpen, clientName, clientMobile, registrationNumber, documentType, dueDate, settings]);

  const handleOpenWhatsApp = () => {
    const url = buildWhatsAppUrl(clientMobile, message);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contact Client via WhatsApp"
      description={`Send renewal reminder to ${clientName} (${clientMobile})`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
          <div>
            <span className="font-semibold">Recipient:</span> {clientName} ({clientMobile})
          </div>
          <div className="font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
            {registrationNumber}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Editable Message Preview:
          </label>
          <textarea
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
          />
          <p className="text-xs text-slate-400 mt-1">
            You can customize the text above before opening WhatsApp.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy Text'}
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleOpenWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
              Open in WhatsApp
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
