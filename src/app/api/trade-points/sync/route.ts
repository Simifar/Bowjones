import { NextResponse } from 'next/server';
import { syncTradePoints } from '@/lib/services/trade-points-service';

export async function POST() {
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