import { NextResponse } from 'next/server';
import { vehicleLookupService } from '@/lib/services/rc-lookup';

export async function GET() {
  try {
    const quota = vehicleLookupService.getQuotaStatus();
    return NextResponse.json({
      success: true,
      quota,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to retrieve quota status.',
      },
      { status: 500 }
    );
  }
}
