import { addDays, addMonths, addYears, differenceInCalendarDays, isAfter, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import { DocumentType, RenewalStatus, ValidityUnit, VehicleDocument } from '../types';

/**
 * Calculates the next due date based on base date and validity period.
 * Example: Base: 01/10/2026, Validity: 5 years -> 01/10/2031
 */
export function calculateNextDueDate(
  baseDateStr: string,
  validityValue: number,
  validityUnit: ValidityUnit
): string {
  if (!baseDateStr || !validityValue) return baseDateStr;

  const baseDate = parseISO(baseDateStr);

  let targetDate: Date;
  switch (validityUnit) {
    case 'DAYS':
      targetDate = addDays(baseDate, validityValue);
      break;
    case 'MONTHS':
      targetDate = addMonths(baseDate, validityValue);
      break;
    case 'YEARS':
      targetDate = addYears(baseDate, validityValue);
      break;
    default:
      targetDate = addYears(baseDate, validityValue);
  }

  return targetDate.toISOString().split('T')[0];
}

/**
 * Computes renewal status dynamically based on current date, expiry/due date, and reminder threshold.
 */
export function calculateRenewalStatus(
  expiryDateStr?: string,
  reminderDays: number = 30,
  isHistorical: boolean = false
): RenewalStatus {
  if (isHistorical) {
    return 'COMPLETED';
  }

  if (!expiryDateStr) {
    return 'ACTIVE';
  }

  try {
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(expiryDateStr));

    if (isSameDay(dueDate, today)) {
      return 'DUE_TODAY';
    }

    if (isBefore(dueDate, today)) {
      return 'OVERDUE';
    }

    const diffDays = differenceInCalendarDays(dueDate, today);

    if (diffDays > 0 && diffDays <= reminderDays) {
      return 'DUE_SOON';
    }

    return 'ACTIVE';
  } catch {
    return 'ACTIVE';
  }
}

/**
 * Returns integer urgency rank for sorting renewals:
 * 1: OVERDUE
 * 2: DUE_TODAY
 * 3: DUE_SOON
 * 4: ACTIVE
 * 5: COMPLETED
 */
export function getRenewalUrgencyWeight(status: RenewalStatus): number {
  switch (status) {
    case 'OVERDUE':
      return 1;
    case 'DUE_TODAY':
      return 2;
    case 'DUE_SOON':
      return 3;
    case 'ACTIVE':
      return 4;
    case 'COMPLETED':
      return 5;
    default:
      return 6;
  }
}

/**
 * Sorts documents by urgency (Overdue -> Due Today -> Due Soon -> Active) and then by due date.
 */
export function sortDocumentsByUrgency(documents: VehicleDocument[]): VehicleDocument[] {
  return [...documents].sort((a, b) => {
    const statusA = calculateRenewalStatus(a.expiryDate, a.reminderDays, a.isHistorical);
    const statusB = calculateRenewalStatus(b.expiryDate, b.reminderDays, b.isHistorical);

    const weightDiff = getRenewalUrgencyWeight(statusA) - getRenewalUrgencyWeight(statusB);
    if (weightDiff !== 0) {
      return weightDiff;
    }

    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;

    return a.expiryDate.localeCompare(b.expiryDate);
  });
}

/**
 * Human-friendly document type display names
 */
export function getDocumentTypeName(type: DocumentType): string {
  switch (type) {
    case 'INSURANCE':
      return 'Insurance';
    case 'ROAD_TAX':
      return 'Road Tax';
    case 'GREEN_TAX':
      return 'Green Tax';
    case 'PUC':
      return 'Pollution / PUC';
    case 'FITNESS':
      return 'Fitness Certificate';
    case 'PERMIT':
      return 'Permit';
    case 'RC':
      return 'RC / Registration';
    case 'OTHER':
      return 'Other Document';
    default:
      return type;
  }
}

/**
 * Default reminder days per document type
 */
export function getDefaultReminderDays(type: DocumentType): number {
  switch (type) {
    case 'INSURANCE':
      return 30;
    case 'ROAD_TAX':
      return 30;
    case 'GREEN_TAX':
      return 30;
    case 'PUC':
      return 15;
    case 'FITNESS':
      return 30;
    case 'PERMIT':
      return 30;
    case 'RC':
      return 60;
    default:
      return 30;
  }
}
