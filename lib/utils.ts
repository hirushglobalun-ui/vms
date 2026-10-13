import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes vehicle registration number by removing spaces, hyphens, and converting to uppercase.
 * Example: "KL-10-AB-1234" -> "KL10AB1234"
 */
export function normalizeRegistrationNumber(regNo: string): string {
  if (!regNo) return "";
  return regNo.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * Formats a normalized registration number into readable format.
 * Example: "KL10AB1234" -> "KL 10 AB 1234"
 */
export function formatRegistrationNumber(regNo: string): string {
  if (!regNo) return "";
  const cleaned = normalizeRegistrationNumber(regNo);
  // Match standard Indian format like KL10AB1234
  const match = cleaned.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{1,4})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}-${match[4]}`;
  }
  return regNo.toUpperCase();
}

export function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface PaymentBalanceSummary {
  totalCost: number;
  amountReceived: number;
  balanceAmount: number;
  paymentStatus: 'SETTLED' | 'BALANCE_DUE' | 'REFUND_DUE';
  label: string;
}

export function calculatePaymentBalance(totalCost: number = 0, amountReceived: number = 0): PaymentBalanceSummary {
  const diff = Number(totalCost || 0) - Number(amountReceived || 0);
  if (diff > 0) {
    return {
      totalCost: Number(totalCost || 0),
      amountReceived: Number(amountReceived || 0),
      balanceAmount: diff,
      paymentStatus: 'BALANCE_DUE',
      label: `Due from Client: ₹${diff.toLocaleString('en-IN')}`,
    };
  } else if (diff < 0) {
    const refund = Math.abs(diff);
    return {
      totalCost: Number(totalCost || 0),
      amountReceived: Number(amountReceived || 0),
      balanceAmount: refund,
      paymentStatus: 'REFUND_DUE',
      label: `Return to Client: ₹${refund.toLocaleString('en-IN')}`,
    };
  } else {
    return {
      totalCost: Number(totalCost || 0),
      amountReceived: Number(amountReceived || 0),
      balanceAmount: 0,
      paymentStatus: 'SETTLED',
      label: totalCost > 0 ? `Fully Settled (₹${Number(totalCost).toLocaleString('en-IN')})` : 'Settled',
    };
  }
}

