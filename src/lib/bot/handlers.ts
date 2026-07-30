import { getBotSettings, updateMuteState } from '@/lib/services/settings-service';
import { getStatusSnapshot } from '@/lib/services/status-service';
import { runShiftMonitoring } from '@/lib/services/shift-monitor-service';
import { TelegramClient } from '@/lib/services/telegram-client';
import { parseAdminChatIds } from '@/lib/services/telegram-client';

function formatTime(date: Date, timezone: string) {
  return date.toLocaleTimeString('ru-RU', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function handleTelegramUpdate(update: {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { first_name?: string };
  };
}) {
  const message = update.message;
  if (!message || !message.text) return { handled: false };

  const chatId = message.chat.id;
  const text = message.text.trim();
  const command = text.split(' ')[0].toLowerCase();

  const settings = await getBotSettings();
  const adminChatIds = parseAdminChatIds(settings.adminChatIds);
  const isAdmin = adminChatIds.includes(String(chatId));

  if (!isAdmin) {
    if (command === '/start') {
      await sendMessage(settings.telegramBotToken, chatId,
        '👋 Этот бот предназначен для администраторов <b>BowJones</b>.\n\n' +
        'Для получения доступа обратитесь к администратору системы.'
      );
      return { handled: true };
    }
    return { handled: false };
  }

  switch (command) {
    case '/start':
    case '/help':
      await sendHelp(settings.telegramBotToken, chatId);
      break;

    case '/status':
      await sendStatus(settings.telegramBotToken, chatId);
      break;

    case '/check':
      await sendCheck(settings.telegramBotToken, chatId);
      break;

    case '/mute': {
      const muteUntil = new Date(Date.now() + 4 * 60 * 60 * 1000);
      await updateMuteState(true, muteUntil.toISOString());
      await sendMessage(settings.telegramBotToken, chatId,
        `🔇 <b>Беззвучный режим включён</b>\n\n` +
        `Уведомления отключены до <code>${formatTime(muteUntil, settings.timezone)}</code>`
      );
      break;
    }

    case '/unmute':
      await updateMuteState(false, null);
      await sendMessage(settings.telegramBotToken, chatId, '🔊 <b>Уведомления включены</b>');
      break;

    default:
      if (command.startsWith('/')) {
        await sendMessage(settings.telegramBotToken, chatId,
          '❓ Неизвестная команда. Используйте <code>/help</code> для справки.'
        );
      }
  }

  return { handled: true };
}

async function sendMessage(token: string, chatId: number, text: string) {
  if (!token) return;
  const client = new TelegramClient(token);
  try {
    await client.sendMessage(chatId, text);
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
}

async function sendHelp(token: string, chatId: number) {
  const text =
    '☕ <b>BowJones Monitor</b>\n\n' +
    'Бот отслеживает открытие кассы в Ytimes и уведомляет, если смена не начата вовремя.\n\n' +
    '<b>📋 Команды:</b>\n' +
    '/status — Текущий статус бота\n' +
    '/check — Проверить кассу сейчас\n' +
    '/mute — Включить беззвучный режим на 4 часа\n' +
    '/unmute — Выключить беззвучный режим\n' +
    '/help — Помощь';
  await sendMessage(token, chatId, text);
}

async function sendStatus(token: string, chatId: number) {
  const status = await getStatusSnapshot();
  const scheduleText = status.todaySchedule
    ? `⏰ Смена сегодня: <b>${status.todaySchedule.startTime}</b>`
    : '❌ Нет расписания на сегодня';

  const muteText = status.isMuted
    ? `🔇 Беззвучный режим (до ${status.muteUntil ? new Date(status.muteUntil).toLocaleTimeString('ru-RU') : 'отмены'})`
    : '🔊 Уведомления включены';

  const text =
    `📊 <b>Статус BowJones Monitor</b>\n\n` +
    `🤖 Бот: ${status.isBotConfigured ? '✅ Активен' : '❌ Не настроен'}\n` +
    `🔑 Ytimes API: ${status.isYtimesConnected ? '✅ Подключён' : '❌ Не подключён'}\n` +
    `${muteText}\n\n` +
    `${scheduleText}\n` +
    `⏱ Задержка уведомления: <code>${status.notificationDelay}</code> мин`;

  await sendMessage(token, chatId, text);
}

async function sendCheck(token: string, chatId: number) {
  await sendMessage(token, chatId, '🔍 <i>Проверяю статус кассы...</i>');
  const result = await runShiftMonitoring({ force: true });
  const icon = result.checked ? '✅' : '⏳';
  const details = result.details
    ? `\n\nВсего точек: <b>${result.details.totalShops}</b>\n` +
      `Открыто: <b>${result.details.openShops}</b>\n` +
      `Закрыто: <b>${(result.details.closedShops as string[]).length}</b>`
    : '';
  await sendMessage(token, chatId, `${icon} ${result.message}${details}`);
}
