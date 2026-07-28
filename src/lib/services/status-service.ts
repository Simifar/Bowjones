import { prisma } from '@/lib/prisma';
import { appConfig } from '@/lib/config';
import { getBotSettings } from './settings-service';
import { getTodaySchedule } from './schedule-service';

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export async function getStatusSnapshot() {
  const [settings, todaySchedule, lastCheck] = await Promise.all([
    getBotSettings(),
    getTodaySchedule(),
    prisma.shiftCheck.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);

  let isMuted = settings.isMuted;
  if (isMuted && settings.muteUntil && new Date(settings.muteUntil) < new Date()) {
    isMuted = false;
  }

  return {
    isBotConfigured: Boolean(settings.telegramBotToken),
    isYtimesConnected: Boolean(settings.ytimesApiKey),
    todaySchedule: todaySchedule
      ? {
          dayOfWeek: todaySchedule.dayOfWeek,
          dayName: DAY_NAMES[todaySchedule.dayOfWeek] ?? 'День',
          startTime: todaySchedule.startTime,
          isEnabled: todaySchedule.isEnabled,
        }
      : null,
    lastCheck: lastCheck
      ? {
          shopGuid: lastCheck.shopGuid,
          checkDate: lastCheck.checkDate,
          isShiftOpen: lastCheck.isShiftOpen,
          notifiedAt: lastCheck.notifiedAt,
          createdAt: lastCheck.createdAt,
        }
      : null,
    isMuted,
    muteUntil: settings.muteUntil,
    notificationDelay: settings.notificationDelay ?? appConfig.defaultNotificationDelay,
    timezone: settings.timezone ?? appConfig.defaultTimezone,
  };
}
