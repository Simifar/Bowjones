'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Save,
  Key,
  Clock,
  Globe,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  Bot,
  Database,
  Settings2,
} from 'lucide-react';

const RUSSIAN_TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function FieldTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={4} className="max-w-[280px] text-left">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export function SettingsTab() {
  const [form, setForm] = useState({
    ytimesApiKey: '',
    telegramBotToken: '',
    adminChatIds: '',
    notificationDelay: 15,
    timezone: 'Asia/Yekaterinburg',
  });
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ytimesTest, setYtimesTest] = useState<TestResult>({ status: 'idle', message: '' });
  const [botTest, setBotTest] = useState<TestResult>({ status: 'idle', message: '' });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.id) {
          let chatIdsStr = '';
          try {
            const parsed = JSON.parse(data.adminChatIds);
            chatIdsStr = Array.isArray(parsed) ? parsed.join(', ') : '';
          } catch {
            chatIdsStr = data.adminChatIds ?? '';
          }
          setForm({
            ytimesApiKey: data.ytimesApiKey ?? '',
            telegramBotToken: data.telegramBotToken ?? '',
            adminChatIds: chatIdsStr,
            notificationDelay: data.notificationDelay ?? 15,
            timezone: data.timezone ?? 'Asia/Yekaterinburg',
          });
        }
      } catch {
        toast.error('Не удалось загрузить настройки');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const chatIdArray = form.adminChatIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ytimesApiKey: form.ytimesApiKey,
          telegramBotToken: form.telegramBotToken,
          adminChatIds: JSON.stringify(chatIdArray),
          notificationDelay: form.notificationDelay,
          timezone: form.timezone,
        }),
      });
      if (res.ok) {
        toast.success('Настройки сохранены');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Ошибка сохранения');
      }
    } catch {
      toast.error('Сетевая ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleTestYtimes = async () => {
    setYtimesTest({ status: 'loading', message: '' });
    try {
      const res = await fetch('/api/trade-points/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setYtimesTest({
          status: 'success',
          message: `Подключено! ${data.syncedCount ?? 0} точек найдено`,
        });
      } else {
        setYtimesTest({
          status: 'error',
          message: data.error || 'Ошибка подключения к Ytimes',
        });
      }
    } catch {
      setYtimesTest({ status: 'error', message: 'Сетевая ошибка' });
    }
  };

  const handleTestBot = async () => {
    setBotTest({ status: 'loading', message: '' });
    try {
      const res = await fetch('/api/test-notification', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBotTest({
          status: 'success',
          message: 'Тестовое сообщение отправлено',
        });
      } else {
        setBotTest({
          status: 'error',
          message: data.error || 'Ошибка отправки через Telegram',
        });
      }
    } catch {
      setBotTest({ status: 'error', message: 'Сервис бота недоступен' });
    }
  };

  if (loading) {
    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div key={i} variants={staggerItem}>
            <Skeleton className="h-16 rounded-lg" />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {/* Section: API Integration */}
        <motion.div variants={staggerItem}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-card via-card to-amber-50/30 dark:to-amber-950/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Интеграции</CardTitle>
                  <CardDescription>Подключение к внешним сервисам</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Ytimes API Key */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="ytimes-key" className="text-sm font-medium">
                    Ytimes API Ключ
                  </Label>
                  <FieldTooltip text="Получите в Ytimes → Настройки → Интеграции → Интеграция по API" />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="ytimes-key"
                      type={showApiKeys ? 'text' : 'password'}
                      value={form.ytimesApiKey}
                      onChange={(e) =>
                        setForm({ ...form, ytimesApiKey: e.target.value })
                      }
                      placeholder="Введите API ключ Ytimes"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKeys(!showApiKeys)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showApiKeys ? 'Скрыть ключ' : 'Показать ключ'}
                    >
                      {showApiKeys ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestYtimes}
                    disabled={ytimesTest.status === 'loading' || !form.ytimesApiKey}
                    className="shrink-0 gap-1.5 min-w-[140px]"
                  >
                    {ytimesTest.status === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : ytimesTest.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : ytimesTest.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Key className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {ytimesTest.status === 'loading'
                        ? 'Проверка...'
                        : ytimesTest.status === 'success'
                        ? 'ОК'
                        : ytimesTest.status === 'error'
                        ? 'Ошибка'
                        : 'Проверить'}
                    </span>
                  </Button>
                </div>
                {/* Inline test result */}
                {ytimesTest.status !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                      ytimesTest.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        : ytimesTest.status === 'error'
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {ytimesTest.status === 'loading' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : ytimesTest.status === 'success' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{ytimesTest.message}</span>
                  </motion.div>
                )}
              </div>

              <Separator />

              {/* Telegram Bot Token */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="tg-token" className="text-sm font-medium">
                    Telegram Bot Token
                  </Label>
                  <FieldTooltip text="Создайте бота через @BotFather в Telegram" />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="tg-token"
                      type={showApiKeys ? 'text' : 'password'}
                      value={form.telegramBotToken}
                      onChange={(e) =>
                        setForm({ ...form, telegramBotToken: e.target.value })
                      }
                      placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKeys(!showApiKeys)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showApiKeys ? 'Скрыть токен' : 'Показать токен'}
                    >
                      {showApiKeys ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestBot}
                    disabled={botTest.status === 'loading' || !form.telegramBotToken}
                    className="shrink-0 gap-1.5 min-w-[140px]"
                  >
                    {botTest.status === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : botTest.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : botTest.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {botTest.status === 'loading'
                        ? 'Отправка...'
                        : botTest.status === 'success'
                        ? 'Отправлено'
                        : botTest.status === 'error'
                        ? 'Ошибка'
                        : 'Тест бота'}
                    </span>
                  </Button>
                </div>
                {/* Inline test result */}
                {botTest.status !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                      botTest.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        : botTest.status === 'error'
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {botTest.status === 'loading' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : botTest.status === 'success' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{botTest.message}</span>
                  </motion.div>
                )}
              </div>

              {/* Admin Chat IDs */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="chat-ids" className="text-sm font-medium">
                    ID чатов администраторов
                  </Label>
                  <FieldTooltip text="Получите ID через @userinfobot. Сначала отправьте /start вашему боту" />
                </div>
                <Input
                  id="chat-ids"
                  type="text"
                  value={form.adminChatIds}
                  onChange={(e) =>
                    setForm({ ...form, adminChatIds: e.target.value })
                  }
                  placeholder="123456789, 987654321"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section: Schedule Settings */}
        <motion.div variants={staggerItem}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-card via-card to-orange-50/30 dark:to-orange-950/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Параметры мониторинга</CardTitle>
                  <CardDescription>Настройка времени и задержек</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Notification Delay */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="delay" className="text-sm font-medium">
                    Задержка уведомления
                  </Label>
                  <FieldTooltip text="Сколько минут ждать после начала смены перед отправкой уведомления. Если касса откроется позже — уведомление не отправится." />
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    id="delay"
                    type="number"
                    min={1}
                    max={120}
                    value={form.notificationDelay}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        notificationDelay: parseInt(e.target.value) || 15,
                      })
                    }
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">
                    мин. после начала смены
                  </span>
                </div>
              </div>

              <Separator />

              {/* Timezone */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label className="text-sm font-medium">
                    Часовой пояс
                  </Label>
                  <FieldTooltip text="Часовой пояс вашей кофейни. Используется для определения текущего дня и времени при проверке смен." />
                </div>
                <Select
                  value={form.timezone}
                  onValueChange={(val) => setForm({ ...form, timezone: val })}
                >
                  <SelectTrigger className="w-full">
                    <Globe className="h-4 w-4 text-muted-foreground mr-2" />
                    <SelectValue placeholder="Выберите часовой пояс" />
                  </SelectTrigger>
                  <SelectContent>
                    {RUSSIAN_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div variants={staggerItem} className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-md hover:shadow-lg transition-shadow min-w-[200px]"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Сохранить настройки
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}