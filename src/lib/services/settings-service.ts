import { prisma } from '@/lib/prisma';
import { appConfig } from '@/lib/config';

export interface BotSettingsInput {
  ytimesApiKey?: string;
  telegramBotToken?: string;
  adminChatIds?: string;
  notificationDelay?: number;
  timezone?: string;
  isMuted?: boolean;
  muteUntil?: string | null;
}

export async function getBotSettings() {
  let settings = await prisma.botSettings.findUnique({ where: { id: 'main' } });
  if (!settings) {
    settings = await prisma.botSettings.create({ data: { id: 'main' } });
  }
  return settings;
}

export async function upsertBotSettings(input: BotSettingsInput) {
  const current = await getBotSettings();

  return prisma.botSettings.upsert({
    where: { id: 'main' },
    update: {
      ...(input.ytimesApiKey !== undefined && { ytimesApiKey: input.ytimesApiKey }),
      ...(input.telegramBotToken !== undefined && { telegramBotToken: input.telegramBotToken }),
      ...(input.adminChatIds !== undefined && { adminChatIds: input.adminChatIds }),
      ...(input.notificationDelay !== undefined && { notificationDelay: input.notificationDelay }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.isMuted !== undefined && { isMuted: input.isMuted }),
      ...(input.muteUntil !== undefined && { muteUntil: input.muteUntil }),
    },
    create: {
      id: 'main',
      ytimesApiKey: input.ytimesApiKey ?? current.ytimesApiKey ?? '',
      telegramBotToken: input.telegramBotToken ?? current.telegramBotToken ?? '',
      adminChatIds: input.adminChatIds ?? current.adminChatIds ?? '[]',
      notificationDelay: input.notificationDelay ?? current.notificationDelay ?? appConfig.defaultNotificationDelay,
      timezone: input.timezone ?? current.timezone ?? appConfig.defaultTimezone,
      isMuted: input.isMuted ?? current.isMuted ?? false,
      muteUntil: input.muteUntil ?? current.muteUntil ?? null,
    },
  });
}

export async function updateMuteState(isMuted: boolean, muteUntil?: string | null) {
  return upsertBotSettings({ isMuted, muteUntil });
}

export async function getSettingsSummary() {
  const settings = await getBotSettings();
  return {
    id: settings.id,
    notificationDelay: settings.notificationDelay,
    timezone: settings.timezone,
    isMuted: settings.isMuted,
    muteUntil: settings.muteUntil,
    isBotConfigured: Boolean(settings.telegramBotToken),
    isYtimesConnected: Boolean(settings.ytimesApiKey),
  };
}
