import { FuelType, VehicleType } from '@/lib/types';

export interface FieldVerificationMap {
  registrationNumber: 'VERIFIED' | 'MISSING';
  make: 'VERIFIED' | 'MISSING';
  model: 'VERIFIED' | 'MISSING';
  vehicleType: 'VERIFIED' | 'MANUAL_REQUIRED';
  fuelType: 'VERIFIED' | 'MANUAL_REQUIRED';
  chassisNumber: 'VERIFIED' | 'MISSING';
  engineNumber: 'VERIFIED' | 'MISSING';
  rto: 'VERIFIED' | 'MISSING';
  insuranceExpiryDate: 'VERIFIED' | 'MISSING' | 'EXPIRED';
  fitnessExpiryDate: 'VERIFIED' | 'MISSING' | 'EXPIRED';
  pucExpiryDate: 'VERIFIED' | 'MISSING' | 'EXPIRED';
  ownerName: 'VERIFIED' | 'MISSING';
}

export interface NormalizedVehicleLookupResult {
  registrationNumber: string;
  normalizedRegistrationNumber: string;
  make: string;
  model: string;
  variant?: string;
  vehicleType: VehicleType;
  vehicleClass?: string;
  fuelType: FuelType;
  manufacturingYear?: number;
  registrationDate?: string;
  chassisNumber?: string;
  engineNumber?: string;
  rto?: string;
  ownerName?: string;
  color?: string;

  // Core 3 Compliance Expiries
  insuranceExpiryDate?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;

  fitnessExpiryDate?: string;
  fitnessNumber?: string;

  pucExpiryDate?: string;
  pucNumber?: string;

  // Metadata
  source: 'RAPIDAPI_LIVE' | 'SERVER_CACHE' | 'MOCK_DEMO';
  statusDescription: string;
  fieldVerification: Partial<FieldVerificationMap>;
  retrievedAt: string;
}

export interface LookupQuotaStatus {
  currentMonth: string; // YYYY-MM
  usedCount: number;
  maxQuota: number;
  remainingQuota: number;
  isQuotaExhausted: boolean;
  cachedLookupsCount: number;
}

export interface LookupResponse {
  success: boolean;
  data?: NormalizedVehicleLookupResult;
  quota: LookupQuotaStatus;
  error?: string;
  code?: 'INVALID_REG_NO' | 'NOT_FOUND' | 'QUOTA_EXHAUSTED' | 'RATE_LIMITED' | 'PROVIDER_ERROR' | 'UNAUTHORIZED';
}
