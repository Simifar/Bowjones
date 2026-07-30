import { NextRequest, NextResponse } from 'next/server';
import { appConfig } from './config';

export function requireApiAuth(request: NextRequest): NextResponse | null {
  if (!appConfig.apiSecretKey) {
    return NextResponse.json({ error: 'API_SECRET_KEY is not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.headers.get('x-api-key');

  if (apiKey !== appConfig.apiSecretKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
