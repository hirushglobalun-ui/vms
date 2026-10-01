import { format } from 'date-fns';
import { getDocumentTypeName } from './renewals/engine';
import { DocumentType } from './types';

export interface WhatsAppMessageParams {
  clientName: string;
  clientMobile: string;
  documentType: DocumentType | string;
  registrationNumber: string;
  dueDate?: string;
  companyName?: string;
  companyMobile?: string;
}

/**
 * Normalizes phone numbers for WhatsApp API link:
 * Strips non-digits; if 10 digits (Indian standard), prefixes with '91'.
 */
export function normalizePhoneForWhatsApp(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Generates the default courteous reminder message.
 */
export function generateWhatsAppMessage({
  clientName,
  documentType,
  registrationNumber,
  dueDate,
  companyName = 'Apex Motor Consultancy',
  companyMobile = '+91 98470 12345',
}: WhatsAppMessageParams): string {
  const docName = typeof documentType === 'string' && documentType in {}
    ? getDocumentTypeName(documentType as DocumentType)
    : documentType;

  const formattedDate = dueDate ? dueDate : 'soon';

  return `Dear ${clientName},\n\nThis is a polite reminder from ${companyName}. Your vehicle *${registrationNumber}* has an upcoming renewal for *${docName}* due on *${formattedDate}*.\n\nPlease contact our office at ${companyMobile} to complete your renewal without any late fee or penalties.\n\nThank you,\n${companyName}`;
}

/**
 * Builds the direct WhatsApp click-to-chat URL.
 */
export function buildWhatsAppUrl(mobile: string, message: string): string {
  const cleanPhone = normalizePhoneForWhatsApp(mobile);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
