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
