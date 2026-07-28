import { NextRequest, NextResponse } from 'next/server';
import { clearNotifications, listNotifications } from '@/lib/services/notifications-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    const acknowledged = searchParams.get('acknowledged');
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;
    const pageSize = searchParams.get('pageSize') ?? undefined;

    const payload = await listNotifications({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : undefined,
      dateFrom,
      dateTo,
      acknowledged: acknowledged === 'false' ? false : acknowledged === 'true' ? true : undefined,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const result = await clearNotifications();
    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error('Failed to clear notifications:', error);
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}