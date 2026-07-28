import { NextRequest, NextResponse } from 'next/server';
import { listCheckLogs } from '@/lib/services/check-logs-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;

    const payload = await listCheckLogs({
      page: page ? Number(page) : 1,
      dateFrom,
      dateTo,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to fetch check logs:', error);
    return NextResponse.json({ error: 'Failed to fetch check logs' }, { status: 500 });
  }
}