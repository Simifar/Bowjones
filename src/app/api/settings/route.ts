import { NextResponse } from 'next/server';
import { getBotSettings, upsertBotSettings } from '@/lib/services/settings-service';

export async function GET() {
  try {
    const settings = await getBotSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = await upsertBotSettings(body);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}