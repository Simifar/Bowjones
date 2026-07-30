import { NextRequest, NextResponse } from 'next/server';
import { getSettingsSummary, upsertBotSettings } from '@/lib/services/settings-service';
import { requireApiAuth } from '@/lib/auth';

export async function GET() {
  try {
    const settings = await getSettingsSummary();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireApiAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    await upsertBotSettings(body);
    const settings = await getSettingsSummary();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}