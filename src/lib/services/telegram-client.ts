import { appConfig } from '@/lib/config';

export class TelegramClient {
  constructor(private readonly botToken: string) {}

  async sendMessage(chatId: number | string, text: string) {
    if (!this.botToken) {
      throw new Error('Telegram bot token is not configured');
    }

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data?.ok) {
      throw new Error(data?.description || 'Telegram message delivery failed');
    }

    return data.result;
  }

  async sendToAdmins(chatIds: Array<number | string>, text: string) {
    const results = [] as Array<{ chatId: number | string; success: boolean; error?: string }>;

    for (const chatId of chatIds) {
      try {
        await this.sendMessage(chatId, text);
        results.push({ chatId, success: true });
      } catch (error) {
        results.push({
          chatId,
          success: false,
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    return results;
  }
}

export function parseAdminChatIds(value: string | null | undefined) {
  if (!value) {
    return [] as Array<number | string>;
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    // fallback to comma-separated values
  }

  return value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
}

export async function sendTestNotification() {
  const { getBotSettings } = await import('./settings-service');
  const settings = await getBotSettings();
  const chatIds = parseAdminChatIds(settings.adminChatIds);

  if (!settings.telegramBotToken || chatIds.length === 0) {
    throw new Error('Telegram is not fully configured');
  }

  const client = new TelegramClient(settings.telegramBotToken);
  const message = `🧪 <b>Тестовое уведомление</b>\n\n✅ BowJones Monitor архитектура готова.\n🕐 ${new Date().toLocaleString('ru-RU', { timeZone: settings.timezone || appConfig.defaultTimezone })}`;

  return client.sendToAdmins(chatIds, message);
}
