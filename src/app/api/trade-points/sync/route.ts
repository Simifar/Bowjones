import { NextRequest, NextResponse } from 'next/server';
import { syncTradePoints } from '@/lib/services/trade-points-service';
import { requireApiAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const unauthorized = requireApiAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const payload = await syncTradePoints();
    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error('Failed to sync trade points:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync trade points' },
      { status: 500 },
    );
  }
}