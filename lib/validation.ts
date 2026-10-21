/**
 * Centralized Validation Utilities for Form Inputs Across All Modules
 */

// Strict Email Regex: requires user, @, domain, and valid TLD (at least 2 letters)
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 10-digit Indian mobile number starting with 6, 7, 8, or 9
export const MOBILE_10_DIGIT_REGEX = /^[6-9]\d{9}$/;

// Generic 10-digit numeric phone regex
export const PHONE_10_DIGIT_REGEX = /^\d{10}$/;

/**
 * Normalizes and extracts digits only from a phone string.
 * Strips "+91", leading zeros, spaces, hyphens.
 */
export function cleanMobileNumber(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Validates a mobile number string.
 * Returns { isValid, error, cleaned }
 */
export function validateMobile(mobile: string, label: string = 'Mobile number', isRequired: boolean = true): {
  isValid: boolean;
  error?: string;
  cleaned: string;
} {
  const trimmed = (mobile || '').trim();
  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: `${label} is required.`, cleaned: '' };
    }
    return { isValid: true, cleaned: '' };
  }

  // Check if user entered non-numeric characters (excluding allowed formatting + or -)
  if (/[a-zA-Z]/.test(trimmed)) {
    return { isValid: false, error: `${label} must contain numbers only, no letters.`, cleaned: '' };
  }

  const cleaned = cleanMobileNumber(trimmed);

  if (cleaned.length !== 10) {
    return {
      isValid: false,
      error: `${label} must be exactly 10 digits (currently ${cleaned.length} digits).`,
      cleaned,
    };
  }

  if (!MOBILE_10_DIGIT_REGEX.test(cleaned)) {
    return {
      isValid: false,
      error: `${label} must start with 6, 7, 8, or 9 (standard mobile format).`,
      cleaned,
    };
  }

  return { isValid: true, cleaned };
}

/**
 * Validates an email address.
 * Returns { isValid, error }
 */
export function validateEmail(email: string, isRequired: boolean = false): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: 'Email address is required.' };
    }
    return { isValid: true };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address (e.g. name@example.com).',
    };
  }

  return { isValid: true };
}

/**
 * Validates full name or business title.
 */
export function validateName(name: string, label: string = 'Name'): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { isValid: false, error: `${label} is required.` };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: `${label} must have at least 2 characters.` };
  }
  return { isValid: true };
}

/**
 * Restricts input value strictly to numbers only with a max length.
 * Useful for onChange handlers: `onChange={(e) => setPhone(onlyDigits(e.target.value, 10))}`
 */
export function onlyDigits(value: string, maxLength: number = 10): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}
