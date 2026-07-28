import { NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/services/telegram-client';

export async function POST() {
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