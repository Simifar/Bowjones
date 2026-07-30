import { getBotSettings, updateMuteState } from './settings-service';
import { getTodaySchedule } from './schedule-service';
import { YtimesClient } from './ytimes-client';
import { TelegramClient, parseAdminChatIds } from './telegram-client';
import { createNotificationLog } from './notifications-service';
import { createCheckLog } from './check-logs-service';
import { appConfig } from '@/lib/config';

function formatDateDDMMYYYY(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function getTimezoneDate(timezone: string) {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
}

export async function runShiftMonitoring(options: { force?: boolean } = {}) {
  let settings = await getBotSettings();
  const todaySchedule = await getTodaySchedule();

  // Check and auto-expire mute
  if (settings.isMuted && settings.muteUntil && new Date(settings.muteUntil) < new Date()) {
    settings = await updateMuteState(false, null);
  }

  if (settings.isMuted) {
    return {
      success: true,
      checked: false,
      message: 'Notifications are muted',
      notifications: [],
    };
  }

  if (!settings.ytimesApiKey || !settings.telegramBotToken || !todaySchedule) {
    return {
      success: false,
      checked: false,
      message: 'Monitoring is not ready yet. Configure settings and schedule first.',
      notifications: [],
    };
  }

  const timezone = settings.timezone || appConfig.defaultTimezone;
  const timezoneDate = getTimezoneDate(timezone);
  const [startHour, startMinute] = todaySchedule.startTime.split(':').map(Number);
  const shiftStart = new Date(timezoneDate);
  shiftStart.setHours(startHour ?? 8, startMinute ?? 0, 0, 0);
  const minutesSinceStart = Math.floor((timezoneDate.getTime() - shiftStart.getTime()) / 60000);
  const notificationDelay = settings.notificationDelay ?? appConfig.defaultNotificationDelay;

  if (!options.force && minutesSinceStart < notificationDelay) {
    return {
      success: true,
      checked: true,
      message: `Delay threshold not reached yet (${minutesSinceStart}/${notificationDelay} min)`,
      notifications: [],
    };
  }

  const todayStr = formatDateDDMMYYYY(timezoneDate);
  const client = new YtimesClient(settings.ytimesApiKey);
  const [shops, shifts] = await Promise.all([client.getShops(), client.getShifts(todayStr, todayStr)]);
  const openShiftShopGuids = new Set(shifts.map((shift) => shift.shopGuid));
  const closedShops = shops.filter((shop) => !openShiftShopGuids.has(shop.guid));

  const chatIds = parseAdminChatIds(settings.adminChatIds);
  const notifications = [] as Array<{ chatId: number | string; success: boolean; error?: string }>;
  let sentNotification = false;

  if (closedShops.length > 0 && chatIds.length > 0) {
    const telegram = new TelegramClient(settings.telegramBotToken);
    const shopList = closedShops
      .slice(0, 20)
      .map((shop, index) => `${index + 1}. ${shop.name}`)
      .join('\n');
    const moreCount = closedShops.length > 20 ? `\n...и ещё ${closedShops.length - 20} точек` : '';
    const message = `⚠️ <b>Касса не открыта!</b>\n\n` +
      `<b>Закрытых точек: ${closedShops.length}</b>\n` +
      `${shopList}${moreCount}\n\n` +
      `📅 Дата: ${todayStr}\n` +
      `⏰ Смена: <code>${todaySchedule.startTime}</code>\n` +
      `⏱ Прошло после старта: <b>${minutesSinceStart} мин.</b>`;

    const results = await telegram.sendToAdmins(chatIds, message);
    notifications.push(...results);
    sentNotification = results.some((result) => result.success);

    await createNotificationLog({
      shopName: `Closed points: ${closedShops.length}`,
      shopGuid: 'all',
      shiftDate: todayStr,
      scheduledAt: todaySchedule.startTime,
      message,
    });
  }

  await createCheckLog({
    shopGuid: 'all',
    checkDate: todayStr,
    isShiftOpen: closedShops.length === 0,
    notifiedAt: closedShops.length > 0 ? new Date() : null,
  });

  return {
    success: true,
    checked: true,
    message: closedShops.length === 0 ? 'All shops are open' : `Detected ${closedShops.length} closed shops`,
    notifications,
    details: {
      totalShops: shops.length,
      openShops: shops.length - closedShops.length,
      closedShops: closedShops.map((shop) => shop.name),
      minutesSinceStart,
      notificationDelay,
      sentNotification,
    },
  };
}
