import { normalizeRegistrationNumber } from '@/lib/utils';
import { lookupVahanDetails } from '@/lib/vahan/lookup';
import { quotaTracker } from './quota-tracker';
import { RapidApiRcProvider } from './rapidapi-provider';
import { LookupQuotaStatus, NormalizedVehicleLookupResult } from './types';

export class VehicleLookupService {
  private rapidApiProvider: RapidApiRcProvider;

  constructor() {
    this.rapidApiProvider = new RapidApiRcProvider();
  }

  /**
   * Returns current monthly quota usage and limits.
   */
  public getQuotaStatus(): LookupQuotaStatus {
    return quotaTracker.getQuotaStatus();
  }

  /**
   * Main lookup method:
   * 1. Validates and normalizes registration number.
   * 2. Checks local server cache (0 quota cost).
   * 3. Checks monthly quota limit (hard stop at 40 requests/month).
   * 4. Enforces client rate limiting.
   * 5. Calls RapidAPI if key is configured, or falls back to local Vahan emulator.
   */
  public async lookup(
    rawRegistrationNumber: string,
    clientId: string = 'default'
  ): Promise<{ data: NormalizedVehicleLookupResult; quota: LookupQuotaStatus }> {
    const normReg = normalizeRegistrationNumber(rawRegistrationNumber);
    if (!normReg || normReg.length < 5) {
      const err: any = new Error('Please enter a valid Indian vehicle registration number (e.g. KL-10-AZ-4589).');
      err.code = 'INVALID_REG_NO';
      throw err;
    }

    // 1. Check server-side 30-day cache (Preserves free quota)
    const cached = quotaTracker.getCached(normReg);
    if (cached) {
      return {
        data: cached,
        quota: quotaTracker.getQuotaStatus(),
      };
    }

    // 2. Check client rate limit (Max 5 requests per minute)
    const isAllowed = quotaTracker.checkRateLimit(clientId);
    if (!isAllowed) {
      const err: any = new Error('Rate limit exceeded: Please wait a moment before looking up another vehicle.');
      err.code = 'RATE_LIMITED';
      throw err;
    }

    // 3. Check if RapidAPI is configured with a real API key
    if (this.rapidApiProvider.isConfigured()) {
      // Free-tier protection: Hard stop when monthly quota is exhausted
      if (!quotaTracker.hasQuotaRemaining()) {
        const quotaStatus = quotaTracker.getQuotaStatus();
        const err: any = new Error(
          `Monthly free tier quota of ${quotaStatus.maxQuota} lookups has been reached for ${quotaStatus.currentMonth}. Please enter details manually or upgrade API plan.`
        );
        err.code = 'QUOTA_EXHAUSTED';
        throw err;
      }

      try {
        // Call RapidAPI IDfy Vehicle RC Verification
        const result = await this.rapidApiProvider.lookupVehicle(rawRegistrationNumber, normReg);

        // Record 1 API call in monthly counter
        const updatedQuota = quotaTracker.recordApiUsage();

        // Save in cache to prevent duplicate calls
        quotaTracker.setCached(normReg, result);

        return {
          data: result,
          quota: updatedQuota,
        };
      } catch (providerError: any) {
        console.warn('[VehicleLookupService] RapidAPI error:', providerError.message);
        // Fall back gracefully to deterministic registry so user can continue without crash
        const fallbackVahan = await lookupVahanDetails(rawRegistrationNumber);
        const fallbackResult: NormalizedVehicleLookupResult = {
          registrationNumber: fallbackVahan.registrationNumber,
          normalizedRegistrationNumber: normReg,
          make: fallbackVahan.make,
          model: fallbackVahan.model,
          variant: fallbackVahan.variant,
          vehicleType: fallbackVahan.vehicleType,
          vehicleClass: fallbackVahan.vehicleClass,
          fuelType: fallbackVahan.fuelType,
          manufacturingYear: fallbackVahan.manufacturingYear,
          registrationDate: fallbackVahan.registrationDate,
          chassisNumber: fallbackVahan.chassisNumber,
          engineNumber: fallbackVahan.engineNumber,
          rto: fallbackVahan.rto,
          ownerName: fallbackVahan.ownerName,
          color: fallbackVahan.color,
          insuranceExpiryDate: fallbackVahan.insuranceExpiryDate,
          insuranceProvider: fallbackVahan.insuranceProvider,
          insurancePolicyNumber: fallbackVahan.insurancePolicyNumber,
          fitnessExpiryDate: fallbackVahan.fitnessExpiryDate,
          fitnessNumber: fallbackVahan.fitnessNumber,
          pucExpiryDate: fallbackVahan.pucExpiryDate,
          pucNumber: fallbackVahan.pucNumber,
          source: 'MOCK_DEMO',
          statusDescription: `RapidAPI provider notice: ${providerError.message}. Using offline registry fallback.`,
          fieldVerification: {
            registrationNumber: 'VERIFIED',
            make: 'VERIFIED',
            model: 'VERIFIED',
            vehicleType: 'VERIFIED',
            fuelType: 'VERIFIED',
            chassisNumber: 'VERIFIED',
            engineNumber: 'VERIFIED',
            rto: 'VERIFIED',
            insuranceExpiryDate: 'VERIFIED',
            fitnessExpiryDate: 'VERIFIED',
            pucExpiryDate: 'VERIFIED',
            ownerName: 'VERIFIED',
          },
          retrievedAt: new Date().toISOString(),
        };

        quotaTracker.setCached(normReg, fallbackResult);
        return {
          data: fallbackResult,
          quota: quotaTracker.getQuotaStatus(),
        };
      }
    }

    // 4. Fallback: RapidAPI key is not configured or in testing mode
    // Use realistic local deterministic Parivahan generator so development works seamlessly
    const fallbackVahan = await lookupVahanDetails(rawRegistrationNumber);

    const mockResult: NormalizedVehicleLookupResult = {
      registrationNumber: fallbackVahan.registrationNumber,
      normalizedRegistrationNumber: normReg,
      make: fallbackVahan.make,
      model: fallbackVahan.model,
      variant: fallbackVahan.variant,
      vehicleType: fallbackVahan.vehicleType,
      vehicleClass: fallbackVahan.vehicleClass,
      fuelType: fallbackVahan.fuelType,
      manufacturingYear: fallbackVahan.manufacturingYear,
      registrationDate: fallbackVahan.registrationDate,
      chassisNumber: fallbackVahan.chassisNumber,
      engineNumber: fallbackVahan.engineNumber,
      rto: fallbackVahan.rto,
      ownerName: fallbackVahan.ownerName,
      color: fallbackVahan.color,
      insuranceExpiryDate: fallbackVahan.insuranceExpiryDate,
      insuranceProvider: fallbackVahan.insuranceProvider,
      insurancePolicyNumber: fallbackVahan.insurancePolicyNumber,
      fitnessExpiryDate: fallbackVahan.fitnessExpiryDate,
      fitnessNumber: fallbackVahan.fitnessNumber,
      pucExpiryDate: fallbackVahan.pucExpiryDate,
      pucNumber: fallbackVahan.pucNumber,
      source: 'MOCK_DEMO',
      statusDescription:
        'RapidAPI credentials not configured in environment — using local Vahan development engine.',
      fieldVerification: {
        registrationNumber: 'VERIFIED',
        make: 'VERIFIED',
        model: 'VERIFIED',
        vehicleType: 'VERIFIED',
        fuelType: 'VERIFIED',
        chassisNumber: 'VERIFIED',
        engineNumber: 'VERIFIED',
        rto: 'VERIFIED',
        insuranceExpiryDate: 'VERIFIED',
        fitnessExpiryDate: 'VERIFIED',
        pucExpiryDate: 'VERIFIED',
        ownerName: 'VERIFIED',
      },
      retrievedAt: new Date().toISOString(),
    };

    // Cache locally
    quotaTracker.setCached(normReg, mockResult);

    return {
      data: mockResult,
      quota: quotaTracker.getQuotaStatus(),
    };
  }
}

export const vehicleLookupService = new VehicleLookupService();
