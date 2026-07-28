// BowJones Telegram Bot - Cash Register Shift Monitor
// Monitors Ytimes POS API and notifies via Telegram when cash register not opened after shift start time

const PORT = 3003;
const MAIN_PROJECT = '/home/z/my-project';
const DB_PATH = `${MAIN_PROJECT}/db/custom.db`;

// ============ Database (Bun built-in SQLite) ============
import { Database } from 'bun:sqlite';
const db = new Database(DB_PATH);

// ============ State ============
const startTime = Date.now();
let settings: BotSettings = getDefaultSettings();
let schedules: ShiftScheduleRow[] = [];
let isMuted = false;
let muteUntil: Date | null = null;
let lastCheckTime: Date | null = null;
let checkInProgress = false;

// ============ Types ============
interface BotSettings {
  ytimesApiKey: string;
  telegramBotToken: string;
  adminChatIds: number[];
  notificationDelay: number;
  timezone: string;
  isMuted: boolean;
  muteUntil: string | null;
}

interface ShiftScheduleRow {
  dayOfWeek: number;
  startTime: string;
  isEnabled: boolean;
}

interface YtimesShift {
  guid: string;
  shopGuid: string;
  date: string;
  number: number;
  userList: Array<{
    id: number;
    start: string;
    end: string | null;
  }>;
  cashStartValue: number;
  cashCheckValue: number;
}

interface YtimesShop {
  guid: string;
  name: string;
  type: string;
  cityName: string;
  address: string;
  phone: string | null;
}

// ============ Logging Helper ============
function logError(prefix: string, ...args: any[]) {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [${prefix}]`, ...args);
}

function logInfo(prefix: string, ...args: any[]) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${prefix}]`, ...args);
}

// ============ Defaults ============
function getDefaultSettings(): BotSettings {
  return {
    ytimesApiKey: '',
    telegramBotToken: '',
    adminChatIds: [],
    notificationDelay: 15,
    timezone: 'Asia/Yekaterinburg',
    isMuted: false,
    muteUntil: null,
  };
}

// ============ Russian Day Mapping ============
const DAY_ABBR_MAP: Record<string, number> = {
  'пн': 0, 'вт': 1, 'ср': 2, 'чт': 3, 'пт': 4, 'сб': 5, 'вс': 6,
};
const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAY_ABBR_LIST = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

// ============ Settings Loader ============
function reloadSettings() {
  try {
    const row = db.query('SELECT * FROM BotSettings WHERE id = ?').get('main') as any;
    if (row) {
      settings = {
        ytimesApiKey: row.ytimesApiKey || '',
        telegramBotToken: row.telegramBotToken || '',
        adminChatIds: JSON.parse(row.adminChatIds || '[]'),
        notificationDelay: row.notificationDelay || 15,
        timezone: row.timezone || 'Asia/Yekaterinburg',
        isMuted: !!row.isMuted,
        muteUntil: row.muteUntil || null,
      };
    }
  } catch (e) {
    logError('DB', 'Failed to reload settings:', e);
  }

  try {
    const rows = db.query('SELECT * FROM ShiftSchedule ORDER BY dayOfWeek').all() as any[];
    schedules = rows.map((r: any) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime || '08:00',
      isEnabled: !!r.isEnabled,
    }));
  } catch (e) {
    logError('DB', 'Failed to reload schedules:', e);
  }

  // Check mute expiry
  if (settings.isMuted && settings.muteUntil) {
    const muteEnd = new Date(settings.muteUntil);
    if (new Date() > muteEnd) {
      isMuted = false;
      try {
        db.query("UPDATE BotSettings SET isMuted = 0, muteUntil = NULL WHERE id = 'main'").run();
      } catch {}
    } else {
      isMuted = true;
      muteUntil = muteEnd;
    }
  } else {
    isMuted = settings.isMuted;
    muteUntil = null;
  }
}

// ============ Telegram API ============
async function telegramApi(method: string, payload: any = {}): Promise<any> {
  if (!settings.telegramBotToken) {
    throw new Error('Telegram bot token not configured');
  }
  const url = `https://api.telegram.org/bot${settings.telegramBotToken}/${method}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!data.ok) {
    logError('TG-API', `Method: ${method}`, data.description || JSON.stringify(data));
    throw new Error(`Telegram API error: ${data.description || JSON.stringify(data)}`);
  }
  return data.result;
}

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  return telegramApi('sendMessage', payload);
}

async function sendToAllAdmins(text: string, replyMarkup?: any) {
  if (isMuted) {
    logInfo('MUTE', 'Skipping notification:', text.substring(0, 80));
    return;
  }
  for (const chatId of settings.adminChatIds) {
    try {
      await sendMessage(chatId, text, replyMarkup);
      logInfo('TG', `Sent to chat ${chatId}`);
    } catch (e: any) {
      logError('TG', `Failed to send to chat ${chatId}:`, e.message);
    }
  }
}

// ============ Ytimes API ============
async function ytimesApi(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  if (!settings.ytimesApiKey) {
    throw new Error('Ytimes API key not configured');
  }
  const url = `https://api.ytimes.ru/ex/${endpoint}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json;charset=UTF-8',
    'Authorization': settings.ytimesApiKey,
  };

  const options: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json;charset=UTF-8';
    options.body = JSON.stringify(body);
  }

  const resp = await fetch(url, options);
  const data = await resp.json();

  if (!data.success) {
    logError('YTIMES', `Endpoint: ${endpoint}`, data.error || 'Unknown error');
    throw new Error(`Ytimes API error: ${data.error || 'Unknown error'}`);
  }
  return data;
}

async function getShops(): Promise<YtimesShop[]> {
  const data = await ytimesApi('shop/list');
  return data.rows || [];
}

async function getShifts(dateFrom: string, dateTo: string, shopGuid?: string): Promise<YtimesShift[]> {
  const body: any = { dateFrom, dateTo };
  if (shopGuid) body.shopGuid = shopGuid;
  const data = await ytimesApi('shift/list', 'POST', body);
  return data.rows || [];
}

// ============ Shift Monitoring Logic ============
function getTimezoneDate(): Date {
  const now = new Date();
  const tz = settings.timezone || 'Asia/Yekaterinburg';
  const str = now.toLocaleString('en-US', { timeZone: tz });
  return new Date(str);
}

function formatDateDDMMYYYY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function getTodaySchedule(): ShiftScheduleRow | undefined {
  const tzDate = getTimezoneDate();
  // getDay(): 0=Sunday, 1=Monday, ... 6=Saturday
  // Our schema: 0=Monday, 6=Sunday
  const jsDay = tzDate.getDay();
  const ourDay = jsDay === 0 ? 6 : jsDay - 1;
  return schedules.find(s => s.dayOfWeek === ourDay && s.isEnabled);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: settings.timezone });
}

function generateId(): string {
  const chars = 'abcdef0123456789';
  let id = '';
  for (let i = 0; i < 25; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

async function checkShifts(): Promise<{ checked: boolean; message: string; notifications: any[]; details?: any }> {
  if (checkInProgress) {
    return { checked: false, message: 'Проверка уже выполняется...', notifications: [] };
  }

  if (!settings.ytimesApiKey || !settings.telegramBotToken) {
    return { checked: false, message: 'Бот не полностью настроен (отсутствует API ключ или токен)', notifications: [] };
  }

  checkInProgress = true;
  const notifications: any[] = [];

  try {
    const todaySchedule = getTodaySchedule();
    if (!todaySchedule) {
      lastCheckTime = new Date();
      return { checked: true, message: 'На сегодня нет расписания', notifications: [], details: { scheduleEnabled: false } };
    }

    const tzDate = getTimezoneDate();
    const [startHour, startMinute] = todaySchedule.startTime.split(':').map(Number);
    const shiftStart = new Date(tzDate);
    shiftStart.setHours(startHour, startMinute, 0, 0);

    const now = tzDate;
    const minutesSinceStart = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);

    // Only check if we're past the notification delay
    if (minutesSinceStart < settings.notificationDelay) {
      lastCheckTime = new Date();
      return {
        checked: true,
        message: `Смена ещё не началась (начало: ${todaySchedule.startTime}, прошло ${minutesSinceStart} мин, нужно ${settings.notificationDelay} мин)`,
        notifications: [],
        details: { minutesSinceStart, delay: settings.notificationDelay },
      };
    }

    // Don't check if shift started more than 3 hours ago
    if (minutesSinceStart > 180) {
      lastCheckTime = new Date();
      return { checked: true, message: 'Смена началась более 3 часов назад, проверка пропущена', notifications: [], details: { minutesSinceStart } };
    }

    // Check if we already notified today
    const todayStr = formatDateDDMMYYYY(tzDate);
    const existingCheck = db.query(
      'SELECT * FROM ShiftCheck WHERE checkDate = ? LIMIT 1'
    ).get(todayStr) as any;

    if (existingCheck && existingCheck.notifiedAt) {
      lastCheckTime = new Date();
      return { checked: true, message: 'Уведомление за сегодня уже отправлено', notifications: [], details: { alreadyNotified: true } };
    }

    // Fetch shops from Ytimes
    let shops: YtimesShop[] = [];
    try {
      shops = await getShops();
    } catch (e: any) {
      logError('YTIMES', 'Failed to fetch shops:', e.message);
      return { checked: true, message: `Ошибка Ytimes API: ${e.message}`, notifications: [] };
    }

    // Cache shops
    const upsertShop = db.prepare(`
      INSERT INTO TradePoint (id, guid, name, type, cityName, address, phone, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(guid) DO UPDATE SET
        name = excluded.name, type = excluded.type, cityName = excluded.cityName,
        address = excluded.address, phone = excluded.phone, updatedAt = datetime('now')
    `);
    for (const shop of shops) {
      try {
        upsertShop.run(generateId(), shop.guid, shop.name, shop.type, shop.cityName, shop.address, shop.phone || '');
      } catch {}
    }

    // Fetch today's shifts
    let shifts: YtimesShift[] = [];
    try {
      shifts = await getShifts(todayStr, todayStr);
    } catch (e: any) {
      logError('YTIMES', 'Failed to fetch shifts:', e.message);
      return { checked: true, message: `Ошибка API смен Ytimes: ${e.message}`, notifications: [] };
    }

    // Check which shops have open shifts
    const openShiftShopGuids = new Set(shifts.map(s => s.shopGuid));

    // Find shops that don't have an open shift
    const closedShops = shops.filter(s => !openShiftShopGuids.has(s.guid));

    if (closedShops.length === 0) {
      db.query(`
        INSERT OR REPLACE INTO ShiftCheck (id, shopGuid, checkDate, notifiedAt, isShiftOpen, createdAt)
        VALUES (?, 'all', ?, datetime('now'), 1, datetime('now'))
      `).run(generateId(), todayStr);
      lastCheckTime = new Date();
      return { checked: true, message: 'Все смены открыты ✅', notifications: [], details: { allOpen: true, totalShops: shops.length, openShifts: shifts.length } };
    }

    // There are shops without open shifts - notify!
    const insertNotif = db.prepare(`
      INSERT INTO NotificationLog (id, shopName, shopGuid, shiftDate, scheduledAt, message, sentAt, acknowledged)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 0)
    `);

    for (const shop of closedShops) {
      const message = `⚠️ <b>Касса не открыта!</b>\n\n` +
        `🏪 <b>${shop.name}</b>\n` +
        `📅 Дата: ${todayStr}\n` +
        `⏰ Смена должна начаться: <code>${todaySchedule.startTime}</code>\n` +
        `⏱ Прошло: <b>${minutesSinceStart} мин.</b>\n\n` +
        `<i>Откройте кассу как можно скорее!</i>`;

      if (!isMuted) {
        for (const chatId of settings.adminChatIds) {
          try {
            await sendMessage(chatId, message);
            notifications.push({ shopName: shop.name, sent: true });
          } catch (e: any) {
            logError('TG', `Failed to notify for ${shop.name}:`, e.message);
            notifications.push({ shopName: shop.name, sent: false, error: e.message });
          }
        }
      }

      // Log notification
      try {
        insertNotif.run(generateId(), shop.name, shop.guid, todayStr, todaySchedule.startTime, message);
      } catch (e: any) {
        logError('DB', 'Failed to log notification:', e.message);
      }

      // Also notify via webhook to Next.js
      try {
        await fetch(`http://localhost:3000/api/bot-webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'notification_sent',
            data: {
              shopName: shop.name,
              shopGuid: shop.guid,
              shiftDate: todayStr,
              scheduledAt: todaySchedule.startTime,
              message,
            },
          }),
        });
      } catch (e: any) {
        logError('WEBHOOK', 'Failed to notify Next.js:', e.message);
      }
    }

    // Record that we checked
    db.query(`
      INSERT OR REPLACE INTO ShiftCheck (id, shopGuid, checkDate, notifiedAt, isShiftOpen, createdAt)
      VALUES (?, 'all', ?, datetime('now'), 0, datetime('now'))
    `).run(generateId(), todayStr);

    lastCheckTime = new Date();
    const statusMsg = closedShops.length === shops.length
      ? 'Ни одна смена не открыта!'
      : `${closedShops.map(s => s.name).join(', ')} — смена не открыта`;

    return {
      checked: true,
      message: statusMsg,
      notifications,
      details: {
        totalShops: shops.length,
        openShops: shops.length - closedShops.length,
        closedShops: closedShops.map(s => s.name),
        minutesSinceStart,
      },
    };
  } finally {
    checkInProgress = false;
  }
}

// ============ Inline Keyboard Builders ============
function buildStatusKeyboard(): any {
  return {
    inline_keyboard: [
      [
        { text: isMuted ? '🔇 Unmute' : '🔒 Mute', callback_data: 'action:mute' },
        { text: '✅ Check Now', callback_data: 'action:check' },
      ],
      [
        { text: '📋 Schedule', callback_data: 'action:schedule' },
        { text: '📊 Stats', callback_data: 'action:stats' },
      ],
    ],
  };
}

// ============ Callback Query Handler ============
async function handleCallbackQuery(update: any) {
  const callbackQuery = update.callback_query;
  if (!callbackQuery) return;

  const chatId = callbackQuery.message?.chat?.id;
  const data = callbackQuery.data;
  const fromId = callbackQuery.from?.id;

  logInfo('CBQ', `Callback from ${fromId}: ${data}`);

  // Only admins can use callbacks
  if (!settings.adminChatIds.includes(chatId)) {
    try {
      await telegramApi('answerCallbackQuery', {
        callback_query_id: callbackQuery.id,
        text: '⛔ Доступ запрещён',
      });
    } catch (e: any) {
      logError('TG-API', 'answerCallbackQuery error:', e.message);
    }
    return;
  }

  try {
    switch (data) {
      case 'action:mute': {
        if (isMuted) {
          // Unmute
          isMuted = false;
          muteUntil = null;
          try {
            db.query("UPDATE BotSettings SET isMuted = 0, muteUntil = NULL WHERE id = 'main'").run();
          } catch {}
          await telegramApi('answerCallbackQuery', {
            callback_query_id: callbackQuery.id,
            text: '🔊 Уведомления включены!',
          });
          // Update the message
          const statusMsg = buildStatusMessage();
          await telegramApi('editMessageText', {
            chat_id: chatId,
            message_id: callbackQuery.message?.message_id,
            text: statusMsg,
            parse_mode: 'HTML',
            reply_markup: buildStatusKeyboard(),
          });
        } else {
          // Mute
          isMuted = true;
          const muteEnd = new Date(Date.now() + 4 * 60 * 60 * 1000);
          muteUntil = muteEnd;
          try {
            db.query("UPDATE BotSettings SET isMuted = 1, muteUntil = ? WHERE id = 'main'").run(muteEnd.toISOString());
          } catch {}
          await telegramApi('answerCallbackQuery', {
            callback_query_id: callbackQuery.id,
            text: `🔇 Беззвучный режим до ${formatTime(muteEnd)}`,
          });
          const statusMsg = buildStatusMessage();
          await telegramApi('editMessageText', {
            chat_id: chatId,
            message_id: callbackQuery.message?.message_id,
            text: statusMsg,
            parse_mode: 'HTML',
            reply_markup: buildStatusKeyboard(),
          });
        }
        break;
      }

      case 'action:check': {
        await telegramApi('answerCallbackQuery', {
          callback_query_id: callbackQuery.id,
          text: '🔍 Проверяю кассу...',
        });
        const result = await checkShifts();
        const icon = result.checked ? '✅' : '⏳';
        await telegramApi('editMessageText', {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          text: `${icon} ${result.message}`,
          parse_mode: 'HTML',
          reply_markup: buildStatusKeyboard(),
        });
        break;
      }

      case 'action:schedule': {
        await telegramApi('answerCallbackQuery', {
          callback_query_id: callbackQuery.id,
          text: '📋 Загружаю расписание...',
        });
        const scheduleMsg = buildScheduleMessage();
        await telegramApi('editMessageText', {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          text: scheduleMsg,
          parse_mode: 'HTML',
        });
        break;
      }

      case 'action:stats': {
        await telegramApi('answerCallbackQuery', {
          callback_query_id: callbackQuery.id,
          text: '📊 Загружаю статистику...',
        });
        const statsMsg = buildStatsMessage();
        await telegramApi('editMessageText', {
          chat_id: chatId,
          message_id: callbackQuery.message?.message_id,
          text: statsMsg,
          parse_mode: 'HTML',
        });
        break;
      }

      default: {
        await telegramApi('answerCallbackQuery', {
          callback_query_id: callbackQuery.id,
          text: '❓ Неизвестное действие',
        });
      }
    }
  } catch (e: any) {
    logError('CBQ', 'Error handling callback query:', e.message);
    try {
      await telegramApi('answerCallbackQuery', {
        callback_query_id: callbackQuery.id,
        text: '❌ Ошибка: ' + e.message,
      });
    } catch {}
  }
}

// ============ Message Builders ============
function buildStatusMessage(): string {
  const todaySchedule = getTodaySchedule();
  const botConfigured = !!(settings.ytimesApiKey && settings.telegramBotToken);
  const muteStatus = isMuted
    ? `🔇 Беззвучный режим (до <code>${muteUntil ? formatTime(muteUntil) : 'отмены'}</code>)`
    : '🔊 Уведомления включены';

  const scheduleInfo = todaySchedule
    ? `⏰ Смена сегодня: <b>${todaySchedule.startTime}</b> (задержка: <code>${settings.notificationDelay}</code> мин)`
    : '❌ Нет расписания на сегодня';

  const lastCheck = lastCheckTime
    ? `🕐 Последняя проверка: <code>${formatTime(lastCheckTime)}</code>`
    : '🕐 Проверок ещё не было';

  return `📊 <b>Статус BowJones Monitor</b>\n\n` +
    `🤖 Бот: ${botConfigured ? '✅ Активен' : '❌ Не настроен'}\n` +
    `🔑 Ytimes API: ${settings.ytimesApiKey ? '✅ Подключён' : '❌ Не подключён'}\n` +
    `${muteStatus}\n\n` +
    `${scheduleInfo}\n` +
    `${lastCheck}`;
}

function buildScheduleMessage(): string {
  const tzDate = getTimezoneDate();
  const jsDay = tzDate.getDay();
  const ourDay = jsDay === 0 ? 6 : jsDay - 1;
  const todayName = DAY_NAMES[ourDay];

  let scheduleMsg = `📅 <b>Расписание — ${todayName}</b>\n\n`;
  for (const s of schedules) {
    const isToday = s.dayOfWeek === ourDay;
    const icon = s.isEnabled ? '✅' : '⬜';
    const todayMarker = isToday ? ' ◀️' : '';
    scheduleMsg += `${icon} <b>${DAY_ABBR_LIST[s.dayOfWeek]}</b> — ${s.isEnabled ? `<code>${s.startTime}</code>` : '<i>выкл</i>'}${todayMarker}\n`;
  }

  scheduleMsg += `\n⏱ Задержка уведомления: <b>${settings.notificationDelay} мин</b>`;
  return scheduleMsg;
}

function buildStatsMessage(): string {
  const tzDate = getTimezoneDate();
  const todayStr = formatDateDDMMYYYY(tzDate);

  // Today's notifications
  const todayNotifs = db.query(
    "SELECT COUNT(*) as cnt FROM NotificationLog WHERE date(sentAt) = date('now', 'localtime')"
  ).get() as any;
  const todayCount = todayNotifs?.cnt || 0;

  // This week's notifications (last 7 days)
  const weekNotifs = db.query(
    "SELECT COUNT(*) as cnt FROM NotificationLog WHERE sentAt >= datetime('now', 'localtime', '-7 days')"
  ).get() as any;
  const weekCount = weekNotifs?.cnt || 0;

  // Last 3 notifications
  const lastNotifs = db.query(
    'SELECT * FROM NotificationLog ORDER BY sentAt DESC LIMIT 3'
  ).all() as any[];

  // Today's checks
  const todayChecks = db.query(
    "SELECT COUNT(*) as cnt FROM ShiftCheck WHERE checkDate = ?"
  ).get(todayStr) as any;
  const todayCheckCount = todayChecks?.cnt || 0;

  const uptimeSecs = Math.floor((Date.now() - startTime) / 1000);
  const uptimeHours = Math.floor(uptimeSecs / 3600);
  const uptimeMins = Math.floor((uptimeSecs % 3600) / 60);

  let msg = `📊 <b>Статистика BowJones Monitor</b>\n\n`;
  msg += `🕐 Аптайм: <b>${uptimeHours}ч ${uptimeMins}м</b>\n\n`;
  msg += `📬 Уведомлений сегодня: <b>${todayCount}</b>\n`;
  msg += `📬 Уведомлений за неделю: <b>${weekCount}</b>\n`;
  msg += `🔍 Проверок сегодня: <b>${todayCheckCount}</b>\n\n`;

  msg += `⚙️ <b>Настройки:</b>\n`;
  msg += `   Задержка: <code>${settings.notificationDelay}</code> мин\n`;
  msg += `   Часовой пояс: <code>${settings.timezone}</code>\n`;
  msg += `   Беззвучный: ${isMuted ? '🔇 Да' : '🔊 Нет'}\n`;
  msg += `   Админов: <b>${settings.adminChatIds.length}</b>\n\n`;

  if (lastNotifs.length > 0) {
    msg += `📋 <b>Последние уведомления:</b>\n`;
    for (const n of lastNotifs) {
      const sentTime = n.sentAt ? new Date(n.sentAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '?';
      msg += `   📅 ${n.shiftDate} — <b>${n.shopName}</b> (<code>${sentTime}</code>)\n`;
    }
  } else {
    msg += `📭 Уведомлений ещё не было`;
  }

  return msg;
}

// ============ Telegram Bot Command Handler ============
async function handleUpdate(update: any) {
  // Handle callback queries
  if (update.callback_query) {
    await handleCallbackQuery(update);
    return;
  }

  const message = update.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text;
  const from = message.from;

  logInfo('TG', `Message from ${from?.first_name || 'unknown'} (${chatId}): ${text}`);

  // Check if user is admin
  if (!settings.adminChatIds.includes(chatId)) {
    if (text === '/start') {
      await sendMessage(chatId,
        '👋 Этот бот предназначен для администраторов <b>BowJones</b>.\n\n' +
        'Для получения доступа обратитесь к администратору системы.'
      );
    }
    return;
  }

  // Handle commands
  const cmd = text.split(' ')[0];
  const args = text.split(' ').slice(1).join(' ');

  switch (cmd) {
    case '/start':
      await sendMessage(chatId,
        '☕ <b>BowJones Monitor</b>\n\n' +
        'Бот отслеживает открытие кассы в Ytimes и уведомляет, если смена не начата вовремя.\n\n' +
        '<b>📋 Команды:</b>\n' +
        '/status — Текущий статус бота\n' +
        '/schedule — Расписание на неделю\n' +
        '/check — Проверить кассу сейчас\n' +
        '/shops — Торговые точки\n' +
        '/mute — Включить беззвучный режим\n' +
        '/unmute — Выключить беззвучный режим\n' +
        '/history — Последние уведомления\n' +
        '/stats — Статистика бота\n' +
        '/setdelay — Изменить задержку уведомления\n' +
        '/settime — Изменить время смены\n' +
        '/forcesend — Принудительная отправка\n' +
        '/help — Помощь'
      );
      break;

    case '/help':
      await sendMessage(chatId,
        '☕ <b>Справка BowJones Monitor</b>\n\n' +
        '<b>📋 Основные команды:</b>\n\n' +
        '/status — Показать текущий статус бота и кассы\n' +
        '/schedule — Расписание смен на неделю\n' +
        '/check — Принудительная проверка кассы\n' +
        '/shops — Список подключённых торговых точек\n' +
        '/stats — Статистика уведомлений и проверок\n\n' +
        '<b>🔔 Уведомления:</b>\n\n' +
        '/mute — Временно отключить уведомления (4 часа)\n' +
        '/unmute — Включить уведомления\n' +
        '/forcesend — Отправить уведомление принудительно\n' +
        '/history — 5 последних уведомлений\n\n' +
        '<b>⚙️ Настройки:</b>\n\n' +
        '/setdelay <i>&lt;минуты&gt;</i> — Задержка уведомления\n' +
        '  <i>Пример:</i> <code>/setdelay 20</code>\n\n' +
        '/settime <i>&lt;день&gt; &lt;время&gt;</i> — Время смены\n' +
        '  <i>Дни:</i> <code>пн вт ср чт пт сб вс</code>\n' +
        '  <i>Пример:</i> <code>/settime пн 09:00</code>'
      );
      break;

    case '/status': {
      const statusMsg = buildStatusMessage();
      await sendMessage(chatId, statusMsg, buildStatusKeyboard());
      break;
    }

    case '/schedule': {
      const scheduleMsg = buildScheduleMessage();
      await sendMessage(chatId, scheduleMsg);
      break;
    }

    case '/check': {
      await sendMessage(chatId, '🔍 <i>Проверяю статус кассы...</i>');
      const result = await checkShifts();
      const icon = result.checked ? '✅' : '⏳';
      await sendMessage(chatId, `${icon} ${result.message}`);
      break;
    }

    case '/shops': {
      try {
        const shops = await getShops();
        if (shops.length === 0) {
          await sendMessage(chatId, '❌ Не удалось получить список торговых точек. Проверьте API ключ.');
          break;
        }

        let shopsMsg = `🏪 <b>Торговые точки (${shops.length})</b>\n\n`;
        for (const shop of shops) {
          shopsMsg += `• <b>${shop.name}</b>\n`;
          if (shop.cityName) shopsMsg += `  📍 ${shop.cityName}, ${shop.address}\n`;
          shopsMsg += '\n';
        }

        await sendMessage(chatId, shopsMsg);
      } catch (e: any) {
        await sendMessage(chatId, `❌ Ошибка: ${e.message}`);
      }
      break;
    }

    case '/mute': {
      isMuted = true;
      const muteEnd = new Date(Date.now() + 4 * 60 * 60 * 1000);
      muteUntil = muteEnd;
      try {
        db.query("UPDATE BotSettings SET isMuted = 1, muteUntil = ? WHERE id = 'main'").run(muteEnd.toISOString());
      } catch (e: any) {
        logError('DB', 'Failed to save mute:', e.message);
      }
      await sendMessage(chatId,
        `🔇 <b>Беззвучный режим включён</b>\n\n` +
        `Уведомления отключены до <code>${formatTime(muteEnd)}</code>\n` +
        `Для отключения: <code>/unmute</code>`
      );
      break;
    }

    case '/unmute': {
      isMuted = false;
      muteUntil = null;
      try {
        db.query("UPDATE BotSettings SET isMuted = 0, muteUntil = NULL WHERE id = 'main'").run();
      } catch (e: any) {
        logError('DB', 'Failed to save unmute:', e.message);
      }
      await sendMessage(chatId, '🔊 <b>Уведомления включены</b>');
      break;
    }

    case '/history': {
      const logs = db.query('SELECT * FROM NotificationLog ORDER BY sentAt DESC LIMIT 5').all() as any[];
      if (logs.length === 0) {
        await sendMessage(chatId, '📭 <i>Нет уведомлений в истории.</i>');
        break;
      }

      let histMsg = '📋 <b>Последние уведомления</b>\n\n';
      for (const log of logs) {
        const sentTime = log.sentAt ? new Date(log.sentAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '?';
        histMsg += `📅 <b>${log.shiftDate}</b> — <b>${log.shopName}</b>\n`;
        histMsg += `   ⏰ Смена: <code>${log.scheduledAt}</code> | Отправлено: <code>${sentTime}</code>\n`;
        histMsg += `   ${log.acknowledged ? '✅' : '⏳'} Отправлено\n\n`;
      }

      await sendMessage(chatId, histMsg);
      break;
    }

    case '/stats': {
      const statsMsg = buildStatsMessage();
      await sendMessage(chatId, statsMsg);
      break;
    }

    case '/setdelay': {
      // /setdelay 20
      const delayMinutes = parseInt(args, 10);
      if (isNaN(delayMinutes) || delayMinutes < 1 || delayMinutes > 180) {
        await sendMessage(chatId,
          '❌ <b>Неверный формат</b>\n\n' +
          'Используйте: <code>/setdelay &lt;минуты&gt;</code>\n' +
          '<i>Пример:</i> <code>/setdelay 20</code>\n\n' +
          'Допустимые значения: <b>1–180</b> минут'
        );
        break;
      }

      // Update via Next.js API
      try {
        const resp = await fetch('http://localhost:3000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationDelay: delayMinutes }),
        });

        if (!resp.ok) {
          throw new Error(`API returned ${resp.status}`);
        }
      } catch (e: any) {
        logError('API', 'Failed to update settings via Next.js:', e.message);
        await sendMessage(chatId, `❌ Ошибка обновления настройки: ${e.message}`);
        break;
      }

      // Update in-memory settings
      settings.notificationDelay = delayMinutes;

      await sendMessage(chatId,
        `⚙️ <b>Задержка уведомления обновлена</b>\n\n` +
        `⏱ Новая задержка: <b>${delayMinutes} мин</b>\n` +
        `📅 Изменение применяется немедленно.`
      );
      break;
    }

    case '/settime': {
      // /settime пн 09:00
      const parts = args.trim().split(/\s+/);
      if (parts.length !== 2) {
        await sendMessage(chatId,
          '❌ <b>Неверный формат</b>\n\n' +
          'Используйте: <code>/settime &lt;день&gt; &lt;время&gt;</code>\n\n' +
          '<b>Дни:</b> <code>пн вт ср чт пт сб вс</code>\n' +
          '<i>Пример:</i> <code>/settime пн 09:00</code>'
        );
        break;
      }

      const dayAbbr = parts[0].toLowerCase();
      const timeStr = parts[1];

      const dayOfWeek = DAY_ABBR_MAP[dayAbbr];
      if (dayOfWeek === undefined) {
        await sendMessage(chatId,
          `❌ <b>Неизвестный день:</b> <code>${dayAbbr}</code>\n\n` +
          'Допустимые значения: <code>пн вт ср чт пт сб вс</code>'
        );
        break;
      }

      // Validate time format HH:MM
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        await sendMessage(chatId,
          '❌ <b>Неверный формат времени</b>\n\n' +
          'Используйте формат: <code>ЧЧ:ММ</code>\n' +
          '<i>Пример:</i> <code>09:00</code>, <code>14:30</code>'
        );
        break;
      }

      const hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        await sendMessage(chatId, '❌ <b>Неверное время.</b> Часы: 0–23, минуты: 0–59');
        break;
      }

      const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      // Build full schedules payload and send to Next.js API
      const updatedSchedules = schedules.map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.dayOfWeek === dayOfWeek ? formattedTime : s.startTime,
        isEnabled: s.dayOfWeek === dayOfWeek ? true : s.isEnabled,
      }));

      // Ensure the day exists in our schedules list
      if (!updatedSchedules.find(s => s.dayOfWeek === dayOfWeek)) {
        updatedSchedules.push({
          dayOfWeek,
          startTime: formattedTime,
          isEnabled: true,
        });
      }

      try {
        const resp = await fetch('http://localhost:3000/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedules: updatedSchedules }),
        });

        if (!resp.ok) {
          throw new Error(`API returned ${resp.status}`);
        }
      } catch (e: any) {
        logError('API', 'Failed to update schedule via Next.js:', e.message);
        await sendMessage(chatId, `❌ Ошибка обновления расписания: ${e.message}`);
        break;
      }

      // Update in-memory schedules
      const existing = schedules.find(s => s.dayOfWeek === dayOfWeek);
      if (existing) {
        existing.startTime = formattedTime;
        existing.isEnabled = true;
      } else {
        schedules.push({ dayOfWeek, startTime: formattedTime, isEnabled: true });
        schedules.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      }

      const dayName = DAY_NAMES[dayOfWeek];
      await sendMessage(chatId,
        `✅ <b>Расписание обновлено</b>\n\n` +
        `📅 ${dayName} (<code>${dayAbbr}</code>): <b>${formattedTime}</b>\n` +
        `🔄 Изменение применяется немедленно.`
      );
      break;
    }

    case '/forcesend': {
      const todaySchedule = getTodaySchedule();
      const todayStr = formatDateDDMMYYYY(getTimezoneDate());

      const forceMsg = `📨 <b>Принудительное уведомление</b>\n\n` +
        `🕐 Время: <code>${new Date().toLocaleTimeString('ru-RU', { timeZone: settings.timezone })}</code>\n` +
        (todaySchedule ? `⏰ Смена: <code>${todaySchedule.startTime}</code>\n` : '') +
        `👤 Отправитель: <b>${from?.first_name || 'Admin'}</b>\n\n` +
        `<i>Это тестовое/принудительное уведомление.</i>`;

      // Send to ALL admins regardless of mute
      for (const chatIdToSend of settings.adminChatIds) {
        try {
          await sendMessage(chatIdToSend, forceMsg);
          logInfo('FORCE', `Sent forced notification to chat ${chatIdToSend}`);
        } catch (e: any) {
          logError('FORCE', `Failed to send to chat ${chatIdToSend}:`, e.message);
        }
      }

      await sendMessage(chatId, `📨 <b>Уведомление отправлено</b> ${settings.adminChatIds.length} админам.`);
      break;
    }

    default:
      if (text.startsWith('/')) {
        await sendMessage(chatId, '❓ Неизвестная команда. Используйте <code>/help</code> для справки.');
      }
  }
}

// ============ Polling Loop for Telegram Updates ============
let lastUpdateId = 0;

async function pollTelegramUpdates() {
  if (!settings.telegramBotToken) return;

  try {
    const result = await telegramApi('getUpdates', {
      offset: lastUpdateId + 1,
      timeout: 30,
      allowed_updates: ['message', 'callback_query'],
    });

    if (Array.isArray(result)) {
      for (const update of result) {
        lastUpdateId = update.update_id;
        handleUpdate(update).catch(e => {
          logError('TG', 'Error handling update:', e);
        });
      }
    }
  } catch (e: any) {
    logError('TG', 'Polling error:', e.message);
  }
}

// ============ Scheduled Checker ============
async function scheduledCheck() {
  const todaySchedule = getTodaySchedule();
  if (!todaySchedule) return;
  if (!settings.ytimesApiKey || !settings.telegramBotToken) return;

  const tzDate = getTimezoneDate();
  const [startHour, startMinute] = todaySchedule.startTime.split(':').map(Number);
  const shiftStart = new Date(tzDate);
  shiftStart.setHours(startHour, startMinute, 0, 0);

  const minutesSinceStart = Math.floor((tzDate.getTime() - shiftStart.getTime()) / 60000);

  const shouldCheck =
    minutesSinceStart >= settings.notificationDelay &&
    minutesSinceStart <= 180 &&
    (minutesSinceStart === settings.notificationDelay ||
     minutesSinceStart === settings.notificationDelay + 30 ||
     minutesSinceStart === settings.notificationDelay + 60 ||
     minutesSinceStart === settings.notificationDelay + 90 ||
     minutesSinceStart === settings.notificationDelay + 120 ||
     minutesSinceStart === settings.notificationDelay + 150);

  if (shouldCheck) {
    const todayStr = formatDateDDMMYYYY(tzDate);
    const existingCheck = db.query(
      'SELECT * FROM ShiftCheck WHERE checkDate = ? LIMIT 1'
    ).get(todayStr) as any;

    if (!existingCheck || !existingCheck.notifiedAt) {
      logInfo('SCHED', `Running scheduled check (${minutesSinceStart}min since shift start)`);
      await checkShifts();
    }
  }
}

// ============ Startup Notification ============
async function sendStartupNotification() {
  if (settings.adminChatIds.length === 0) return;
  if (!settings.telegramBotToken) return;

  const uptimeSecs = Math.floor((Date.now() - startTime) / 1000);
  const bootMsg =
    `🟢 <b>Бот запущен</b>\n\n` +
    `☕ BowJones Monitor активен\n` +
    `⏱ Запуск за ${uptimeSecs / 1000 < 1 ? '<1' : uptimeSecs}с\n` +
    `🔑 Ytimes: ${settings.ytimesApiKey ? '✅' : '❌'}\n` +
    `📢 Telegram: ✅\n` +
    `📅 Активных дней: ${schedules.filter(s => s.isEnabled).length}/7\n` +
    `⏰ Задержка: <code>${settings.notificationDelay}</code> мин`;

  for (const chatId of settings.adminChatIds) {
    try {
      await sendMessage(chatId, bootMsg);
      logInfo('BOOT', `Startup notification sent to ${chatId}`);
    } catch (e: any) {
      logError('BOOT', `Failed to send startup notification to ${chatId}:`, e.message);
    }
  }
}

// ============ HTTP Server (for dashboard communication) ============
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers });
    }

    try {
      // GET /api/health - Health check with detailed info
      if (path === '/api/health' && req.method === 'GET') {
        const uptimeSecs = Math.floor((Date.now() - startTime) / 1000);
        return new Response(JSON.stringify({
          status: 'ok',
          uptime: uptimeSecs,
          uptimeFormatted: `${Math.floor(uptimeSecs / 3600)}h ${Math.floor((uptimeSecs % 3600) / 60)}m ${uptimeSecs % 60}s`,
          lastCheckTime: lastCheckTime?.toISOString() || null,
          isMuted,
          configured: !!(settings.ytimesApiKey && settings.telegramBotToken),
          port: PORT,
        }), { status: 200, headers });
      }

      // GET /api/logs - Last 20 shift checks from DB
      if (path === '/api/logs' && req.method === 'GET') {
        try {
          const logs = db.query(
            'SELECT * FROM ShiftCheck ORDER BY createdAt DESC LIMIT 20'
          ).all() as any[];
          return new Response(JSON.stringify({ logs, count: logs.length }), { status: 200, headers });
        } catch (e: any) {
          logError('HTTP', 'Failed to query shift checks:', e.message);
          return new Response(JSON.stringify({ error: 'DB query failed' }), { status: 500, headers });
        }
      }

      // POST /api/check - Trigger shift check
      if (path === '/api/check' && req.method === 'POST') {
        reloadSettings();
        const result = await checkShifts();
        return new Response(JSON.stringify(result), { status: 200, headers });
      }

      // POST /api/test-notification - Send test notification
      if (path === '/api/test-notification' && req.method === 'POST') {
        reloadSettings();
        if (settings.adminChatIds.length === 0) {
          return new Response(JSON.stringify({ success: false, error: 'No admin chat IDs configured' }), { status: 400, headers });
        }
        await sendToAllAdmins(
          '🧪 <b>Тестовое уведомление</b>\n\n' +
          '✅ BowJones Monitor работает корректно!\n' +
          `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: settings.timezone })}`
        );
        return new Response(JSON.stringify({ success: true, message: 'Test notification sent' }), { status: 200, headers });
      }

      // GET /api/status - Bot status
      if (path === '/api/status' && req.method === 'GET') {
        reloadSettings();
        const todaySchedule = getTodaySchedule();
        return new Response(JSON.stringify({
          configured: !!(settings.ytimesApiKey && settings.telegramBotToken),
          ytimesConnected: !!settings.ytimesApiKey,
          telegramConnected: !!settings.telegramBotToken,
          adminCount: settings.adminChatIds.length,
          isMuted,
          todaySchedule: todaySchedule ? {
            startTime: todaySchedule.startTime,
            dayOfWeek: todaySchedule.dayOfWeek,
          } : null,
          lastCheck: lastCheckTime?.toISOString() || null,
          timezone: settings.timezone,
          uptime: Math.floor((Date.now() - startTime) / 1000),
          notificationDelay: settings.notificationDelay,
        }), { status: 200, headers });
      }

      // GET /health - Simple health check (legacy)
      if (path === '/health' && req.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', port: PORT }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    } catch (e: any) {
      logError('HTTP', `Error on ${req.method} ${path}:`, e.message);
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
  },
});

logInfo('BOT', `BowJones Telegram Bot running on port ${PORT}`);

// ============ Main Loop ============
reloadSettings();

// Telegram polling every 35 seconds
setInterval(async () => {
  try {
    await pollTelegramUpdates();
  } catch (e: any) {
    logError('TG', 'Poll interval error:', e.message);
  }
}, 35000);

// Scheduled shift check every minute
setInterval(async () => {
  try {
    reloadSettings();
    await scheduledCheck();
  } catch (e: any) {
    logError('SCHED', 'Check interval error:', e.message);
  }
}, 60000);

// Initial setup after 2 seconds
setTimeout(() => {
  reloadSettings();
  logInfo('BOT', 'Initial settings loaded');
  logInfo('BOT', `Ytimes API: ${settings.ytimesApiKey ? 'configured' : 'NOT configured'}`);
  logInfo('BOT', `Telegram: ${settings.telegramBotToken ? 'configured' : 'NOT configured'}`);
  logInfo('BOT', `Admin chats: ${settings.adminChatIds.length}`);
  logInfo('BOT', `Schedules: ${schedules.filter(s => s.isEnabled).length} active`);
}, 2000);

// Initial Telegram poll after 3 seconds
setTimeout(() => {
  pollTelegramUpdates().catch(e => {
    logError('TG', 'Initial poll error:', e);
  });
}, 3000);

// Startup notification after 5 seconds
setTimeout(() => {
  reloadSettings();
  sendStartupNotification().catch(e => {
    logError('BOOT', 'Failed to send startup notification:', e);
  });
}, 5000);