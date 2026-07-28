import { NextRequest, NextResponse } from 'next/server';
import { acknowledgeNotification } from '@/lib/services/notifications-service';

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const notification = await acknowledgeNotification(id);
    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Failed to acknowledge notification:', error);
    return NextResponse.json({ error: 'Failed to acknowledge notification' }, { status: 500 });
  }
}