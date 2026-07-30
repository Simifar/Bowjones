import { NextRequest, NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/services/telegram-client';
import { requireApiAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const unauthorized = requireApiAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await sendTestNotification();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test notification' },
      { status: 500 },
    );
  }
}