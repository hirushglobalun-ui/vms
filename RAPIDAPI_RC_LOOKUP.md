# RapidAPI Vehicle RC Lookup Integration Guide

## Overview
This module integrates the **Vehicle RC Verification API** (provided by IDfy via RapidAPI) into the Apex Motor Consultancy management platform. It enables agents to automatically fetch and verify Indian vehicle registration data, mechanical specifications, and statutory compliance dates (Insurance, Fitness, PUC) while strictly enforcing free-tier quota protection.

API Pricing & Documentation: [RapidAPI Vehicle RC Verification](https://rapidapi.com/idfy-idfy-default/api/vehicle-rc-verification/pricing)

---

## Architecture & Security Principles

```
Browser Client (VehicleModal)
       │
       │  POST /api/vehicles/lookup
       ▼
Next.js Server API Route (/api/vehicles/lookup)
       │
       ├──► 1. Rate Limiting (Max 5 requests/min per client)
       ├──► 2. 30-Day Server Cache (0 quota consumed for repeat lookups)
       ├──► 3. Monthly Quota Hard Stop (Max 40 calls/month)
       │
       ▼
VehicleLookupService (lib/services/rc-lookup)
       │
       ├──[If RAPIDAPI_KEY is configured]──► RapidApiRcProvider (IDfy endpoint)
       │                                            │
       │                                            ▼
       │                                      RapidAPI Servers
       │
       └──[If RAPIDAPI_KEY is absent/mock]──► Local Parivahan Deterministic Engine
```

### Security Guarantees:
- **Zero Client Credential Exposure**: `RAPIDAPI_KEY` is loaded strictly on the server-side (`process.env.RAPIDAPI_KEY`). It is **never** prefixed with `NEXT_PUBLIC_` and never transmitted to the browser.
- **Provider Decoupling**: Integration is isolated inside `lib/services/rc-lookup/rapidapi-provider.ts`. Future provider swaps (e.g., SurePass, Signzy, or direct Parivahan NIC API) require editing only this adapter.

---

## Free-Tier Protection & Quota Management

The RapidAPI Basic Plan allows **40 requests per month ($0.00)**. Overages can incur credit card charges if hard limits are not enforced. Our implementation prevents this with multiple defense layers:

1. **Server-Side Monthly Counter (`.rapidapi-quota.json`)**:
   - Persists usage counts across server restarts.
   - Automatically resets when the calendar month transitions (`YYYY-MM`).
   - Rejects outgoing requests with HTTP 429 once the configured threshold (40) is reached.
2. **30-Day Server Cache**:
   - If an agent queries a vehicle that was already looked up this month, the verified record is served instantly from cache (`source: SERVER_CACHE`).
   - Consumes **0** RapidAPI calls.
3. **Client Rate Limiting**:
   - Caps calls to a maximum of 5 requests per minute per IP to prevent accidental click bursts.
4. **No Retry Loops**:
   - The frontend never performs automatic retries on failure.
5. **Admin Quota Telemetry**:
   - `GET /api/vehicles/quota` returns `{ usedCount, maxQuota, remainingQuota }`.
   - The frontend displays remaining quota directly beside the "Fetch Vehicle Details" button.

---

## Environment Configuration

In `.env.local` (server environment):

```bash
# RapidAPI Vehicle RC Verification Configuration
# (Do NOT prefix with NEXT_PUBLIC_)
RAPIDAPI_KEY="your_rapidapi_key_here"
RAPIDAPI_HOST="vehicle-rc-verification.p.rapidapi.com"
RAPIDAPI_MONTHLY_QUOTA=40
```

> **Note for Local Development:**
> If `RAPIDAPI_KEY` is left blank, the system automatically falls back to the deterministic local Parivahan engine (`source: MOCK_DEMO`). This allows full offline testing and UI development without burning free-tier calls.

---

## API Endpoints

### 1. `POST /api/vehicles/lookup`
**Request Body:**
```json
{
  "registrationNumber": "KL-10-AZ-4589"
}
```

**Success Response (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "registrationNumber": "KL10AZ4589",
    "normalizedRegistrationNumber": "KL10AZ4589",
    "make": "TOYOTA",
    "model": "INNOVA CRYSTA",
    "vehicleType": "PRIVATE_CAR",
    "fuelType": "DIESEL",
    "chassisNumber": "MBJ11BB4001234567",
    "engineNumber": "2GDF9876543",
    "rto": "KL-10 Malappuram RTO (Perinthalmanna)",
    "ownerName": "MUHAMMED ALI",
    "insuranceExpiryDate": "2027-04-10",
    "insuranceProvider": "United India Insurance Co.",
    "fitnessExpiryDate": "2036-04-11",
    "pucExpiryDate": "2026-10-15",
    "source": "RAPIDAPI_LIVE",
    "fieldVerification": {
      "registrationNumber": "VERIFIED",
      "chassisNumber": "VERIFIED",
      "insuranceExpiryDate": "VERIFIED",
      "pucExpiryDate": "VERIFIED"
    },
    "retrievedAt": "2026-10-13T10:30:00.000Z"
  },
  "quota": {
    "currentMonth": "2026-10",
    "usedCount": 1,
    "maxQuota": 40,
    "remainingQuota": 39,
    "isQuotaExhausted": false,
    "cachedLookupsCount": 1
  }
}
```

**Quota Exhausted Response (HTTP 429):**
```json
{
  "success": false,
  "error": "Monthly free tier quota of 40 lookups has been reached for 2026-10. Please enter details manually or upgrade API plan.",
  "code": "QUOTA_EXHAUSTED",
  "quota": {
    "currentMonth": "2026-10",
    "usedCount": 40,
    "maxQuota": 40,
    "remainingQuota": 0,
    "isQuotaExhausted": true,
    "cachedLookupsCount": 14
  }
}
```

### 2. `GET /api/vehicles/quota`
Returns current quota status for administration and status badges.

---

## Field Verification & Audit Rules

Fields are mapped strictly from API responses:
1. **Never Invent Missing Values**: If the registry does not return a PUC expiry or Engine Number, the field is left empty for manual staff entry.
2. **Expired Dates Flagged**: If insurance or fitness dates returned by the registry are in the past, they are marked `EXPIRED` in the verification audit map so the staff can immediately schedule renewals.
3. **User Editable**: All auto-populated values can be reviewed and edited by the agent before submitting the form.
