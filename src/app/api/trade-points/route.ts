import { NextResponse } from 'next/server';
import { listTradePoints } from '@/lib/services/trade-points-service';

export async function GET() {
  try {
    const tradePoints = await listTradePoints();
    return NextResponse.json(tradePoints);
  } catch (error) {
    console.error('Failed to fetch trade points:', error);
    return NextResponse.json({ error: 'Failed to fetch trade points' }, { status: 500 });
  }
}