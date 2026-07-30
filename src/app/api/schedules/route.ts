import { NextRequest, NextResponse } from 'next/server';
import { getSchedules, saveSchedules } from '@/lib/services/schedule-service';
import { requireApiAuth } from '@/lib/auth';

export async function GET() {
  try {
    const schedules = await getSchedules();
    return NextResponse.json(schedules);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireApiAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const schedules = await saveSchedules(body.schedules ?? []);
    return NextResponse.json(schedules);
  } catch {
    return NextResponse.json({ error: 'Failed to update schedules' }, { status: 500 });
  }
}