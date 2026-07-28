import { NextResponse } from 'next/server'

const BOT_SERVICE_URL = 'http://localhost:3003'

export async function GET() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`${BOT_SERVICE_URL}/api/health`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      { status: 'unreachable', uptime: 0, lastCheckTime: null, isMuted: false },
      { status: 200 }, // Return 200 but with status: unreachable so frontend can show red
    )
  }
}