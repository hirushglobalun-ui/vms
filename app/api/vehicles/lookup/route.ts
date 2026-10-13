import { NextRequest, NextResponse } from 'next/server';
import { vehicleLookupService } from '@/lib/services/rc-lookup';
import { LookupResponse } from '@/lib/services/rc-lookup/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.registrationNumber || typeof body.registrationNumber !== 'string') {
      const quota = vehicleLookupService.getQuotaStatus();
      return NextResponse.json<LookupResponse>(
        {
          success: false,
          error: 'Please provide a valid vehicle registration number in request body.',
          code: 'INVALID_REG_NO',
          quota,
        },
        { status: 400 }
      );
    }

    // Determine client identifier for rate limiting (from IP or authorization headers)
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'anonymous-agent';

    const { data, quota } = await vehicleLookupService.lookup(
      body.registrationNumber,
      clientIp
    );

    return NextResponse.json<LookupResponse>(
      {
        success: true,
        data,
        quota,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const quota = vehicleLookupService.getQuotaStatus();
    const errorMessage = err?.message || 'An unexpected error occurred during vehicle lookup.';
    const errorCode = err?.code || 'PROVIDER_ERROR';

    let status = 500;
    if (errorCode === 'INVALID_REG_NO') status = 400;
    else if (errorCode === 'QUOTA_EXHAUSTED' || errorCode === 'RATE_LIMITED') status = 429;
    else if (errorMessage.toLowerCase().includes('not found')) status = 404;
    else if (errorCode === 'UNAUTHORIZED') status = 401;

    return NextResponse.json<LookupResponse>(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
        quota,
      },
      { status }
    );
  }
}
