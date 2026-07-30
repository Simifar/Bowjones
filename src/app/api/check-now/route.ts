import { NextRequest, NextResponse } from 'next/server';
import { runShiftMonitoring } from '@/lib/services/shift-monitor-service';
import { requireApiAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const unauthorized = requireApiAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await runShiftMonitoring({ force: true });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to run monitoring check:', error);
    return NextResponse.json({ error: 'Monitoring check failed' }, { status: 500 });
  }
}