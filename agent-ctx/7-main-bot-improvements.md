# Task 7: Telegram Bot Feature Improvements

**Agent:** Main
**Status:** Completed

## Work Log

- Read existing bot code (758 lines) and understood full architecture
- Read Next.js API endpoints `/api/settings` and `/api/schedules` to understand expected request formats
- Wrote complete updated bot file with all 10 requested improvements

## Changes Made

### 1. `/setdelay` command
- Parses `/setdelay <minutes>` (validates 1–180 range)
- Calls `POST http://localhost:3000/api/settings` with `{ notificationDelay: N }`
- Updates in-memory `settings.notificationDelay` immediately
- Confirmation message with new delay value

### 2. `/settime` command
- Parses `/settime <day> <time>` (e.g., `/settime пн 09:00`)
- Maps Russian abbreviations (пн/вт/ср/чт/пт/сб/вс) to dayOfWeek (0–6)
- Validates time format HH:MM and range
- Calls `POST http://localhost:3000/api/schedules` with full schedules array
- Updates in-memory schedules array

### 3. Inline keyboard on `/status`
- Added `buildStatusKeyboard()` returning inline_keyboard with 4 buttons:
  - 🔒 Mute / 🔊 Unmute (toggles based on state)
  - ✅ Check Now
  - 📋 Schedule
  - 📊 Stats

### 4. Callback query handler
- Added `handleCallbackQuery()` function
- Handles: `action:mute`, `action:check`, `action:schedule`, `action:stats`
- Uses `answerCallbackQuery` for instant feedback
- Uses `editMessageText` to update the original status message
- Admin-only access check for callbacks

### 5. `/forcesend` command
- Sends a formatted notification to ALL admin chats
- Bypasses mute mode completely
- Includes timestamp, shift info, and sender name
- Confirms how many admins received it

### 6. Improved message formatting
- All messages use HTML parse_mode (already was the default)
- Added `<code>` formatting for times and values
- Added `<i>` for descriptions
- Emoji icons on every message
- Consistent formatting patterns across all commands

### 7. Startup notification
- Added `sendStartupNotification()` function
- Sends `🟢 Бот запущен` message 5 seconds after boot
- Shows configuration status, schedule count, and delay setting
- Sent to all admin chats

### 8. Error logging with timestamps
- Added `logError(prefix, ...args)` and `logInfo(prefix, ...args)` helpers
- Format: `[ISO-8601 timestamp] [PREFIX] message`
- All `console.error` calls replaced with `logError`
- All `console.log` calls replaced with `logInfo`
- Timestamps on: TG API errors, Ytimes errors, DB errors, HTTP errors, polling errors, scheduled check errors, webhook errors

### 9. `/stats` command
- Shows bot uptime (hours/minutes)
- Today's notification count (DB query)
- This week's notification count (DB query)
- Today's check count
- Current settings summary (delay, timezone, mute status, admin count)
- Last 3 notifications with shop name, date, and send time

### 10. Improved HTTP server endpoints
- **GET `/api/health`**: Returns `{ status, uptime, uptimeFormatted, lastCheckTime, isMuted, configured, port }`
- **GET `/api/logs`**: Returns last 20 ShiftCheck records from DB via `bun:sqlite`
- **GET `/api/status`**: Enhanced with `uptime` and `notificationDelay` fields
- **POST `/api/check`**: Returns enhanced `details` object with `minutesSinceStart`, `totalShops`, `openShops`, `closedShops`

## Additional Improvements
- Refactored message building into shared functions: `buildStatusMessage()`, `buildScheduleMessage()`, `buildStatsMessage()`
- Added `DAY_NAMES`, `DAY_ABBR_LIST`, `DAY_ABBR_MAP` constants for DRY code
- Schedule display now highlights today's day with ◀️ marker
- `/history` now shows send time for each notification
- Command parsing improved: uses `cmd = text.split(' ')[0]` and `args` for parameterized commands
- `allowed_updates` in polling now includes `callback_query`

## Verification
- Bot compiles successfully (bun build)
- Bot starts and serves HTTP on port 3003
- All endpoints tested: `/api/health`, `/api/logs`, `/api/status`, `/health`
- All return correct JSON responses