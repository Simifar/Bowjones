import { NextResponse } from 'next/server';
import { getStatusSnapshot } from '@/lib/services/status-service';

export async function GET() {
  try {
    const payload = await getStatusSnapshot();
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to fetch status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}