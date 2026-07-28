import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const notificationWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    shopName: z.string(),
    shopGuid: z.string(),
    shiftDate: z.string(),
    scheduledAt: z.string(),
    message: z.string(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = notificationWebhookSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: parsed.error.errors },
        { status: 400 },
      )
    }

    const { type, data } = parsed.data

    if (type === 'notification_sent') {
      const log = await db.notificationLog.create({
        data: {
          shopName: data.shopName,
          shopGuid: data.shopGuid,
          shiftDate: data.shiftDate,
          scheduledAt: data.scheduledAt,
          message: data.message,
        },
      })

      return NextResponse.json({ success: true, id: log.id })
    }

    // Acknowledge other event types without logging
    return NextResponse.json({ success: true, acknowledged: true, type })
  } catch (error) {
    console.error('Failed to process bot webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 },
    )
  }
}