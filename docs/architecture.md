# BowJones Monitor MVP architecture

## Goals
- Deliver a production-oriented MVP on Vercel + Neon.
- Keep one source of truth for settings, schedules, notifications and logs.
- Make the bot logic modular so it can evolve into a worker/queue-based service later.

## Core principles
1. One database for web app and bot.
2. Shared service layer for business logic.
3. API routes remain thin wrappers.
4. External integrations (Ytimes, Telegram) are isolated behind client modules.

## Service modules
- settings-service.ts — read/write bot settings.
- schedule-service.ts — manage day-based shift schedules.
- trade-points-service.ts — synchronize and list trade points.
- notifications-service.ts — list, acknowledge and clear notifications.
- check-logs-service.ts — list and create check logs.
- status-service.ts — aggregate status for the overview screen.
- ytimes-client.ts — Ytimes API wrapper.
- telegram-client.ts — Telegram API wrapper.
- shift-monitor-service.ts — orchestrates shift checks and notification delivery.

## Suggested deployment model
- Vercel: Next.js app and API routes.
- Neon: Postgres database.
- Worker: separate bot process that calls the same services and Prisma client.

## Evolution path
- Phase 1: single web app + single worker.
- Phase 2: queue-based job processing.
- Phase 3: multi-tenant and role-based access.
