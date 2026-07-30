import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate } from '@/lib/bot/handlers';
import { getBotSettings } from '@/lib/services/settings-service';
import { appConfig } from '@/lib/config';

const webhookUrl = `${appConfig.appBaseUrl}/api/bot-webhook`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (!searchParams.has('set')) {
    return NextResponse.json({ webhookUrl });
  }

  const settings = await getBotSettings();
  if (!settings.telegramBotToken) {
    return NextResponse.json({ error: 'Telegram bot token is not configured' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${settings.telegramBotToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.ok ? 200 : 400 });
  } catch (error) {
    console.error('Failed to set Telegram webhook:', error);
    return NextResponse.json({ error: 'Failed to set webhook' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await handleTelegramUpdate(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process Telegram update:', error);
    return NextResponse.json({ error: 'Failed to process update' }, { status: 500 });
  }
}
