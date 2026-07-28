import { NextResponse } from 'next/server';
import { runShiftMonitoring } from '@/lib/services/shift-monitor-service';

export async function POST() {
  try {
    const result = await runShiftMonitoring({ force: true });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to run monitoring check:', error);
    return NextResponse.json({ error: 'Monitoring check failed' }, { status: 500 });
  }
}