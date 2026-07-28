'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Bot,
  Clock,
  Bell,
  RefreshCw,
  Send,
  Activity,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Server,
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  Zap,
  Timer,
  Eye,
  MapPin,
} from 'lucide-react';

interface StatusData {
  isBotConfigured: boolean;
  isYtimesConnected: boolean;
  todaySchedule: {
    dayOfWeek: number;
    dayName: string;
    startTime: string;
    isEnabled: boolean;
  } | null;
  lastCheck: {
    shopGuid: string;
    checkDate: string;
    isShiftOpen: boolean;
    notifiedAt: string | null;
    createdAt: string;
  } | null;
  isMuted: boolean;
  muteUntil: string | null;
  notificationDelay: number;
  timezone: string;
}

interface BotHealthData {
  status: 'ok' | 'unreachable';
  uptime: number;
  lastCheckTime: string | null;
  isMuted: boolean;
  muteUntil?: string | null;
}

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  isEnabled: boolean;
}

interface Notification {
  id: string;
  shopName: string;
  message: string;
  sentAt: string;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function DashboardOverview() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [botServiceUp, setBotServiceUp] = useState<boolean | null>(null);
  const [botHealth, setBotHealth] = useState<BotHealthData | null>(null);
  const [stats, setStats] = useState<{
    totalNotifications: number;
    lastNotificationTime: string | null;
    checksToday: number;
    daysWithoutMissed: number;
  } | null>(null);
  const [lastCheckShop, setLastCheckShop] = useState<string>('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statusRes, schedulesRes, notifsRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/schedules'),
          fetch('/api/notifications?page=1&pageSize=5'),
        ]);
        const statusData = await statusRes.json();
        const schedulesData = await schedulesRes.json();
        const notifsData = await notifsRes.json();
        setStatus(statusData);
        setSchedules(schedulesData);
        setNotifications(notifsData.notifications?.slice(0, 5) ?? []);

        // Fetch stats
        try {
          const statsRes = await fetch('/api/notifications');
          const statsData = await statsRes.json();
          const today = new Date().toISOString().split('T')[0];
          const lastNotif = statsData.notifications?.[0]?.sentAt ?? null;

          // Count checks today
          const checksRes = await fetch(`/api/check-logs?dateFrom=${today}`);
          const checksData = await checksRes.json();

          // Calculate days without missed notifications
          let daysWithoutMissed = 0;
          if (statsData.notifications && Array.isArray(statsData.notifications)) {
            const notifDates = new Set(
              statsData.notifications.map((n: { sentAt?: string }) =>
                n.sentAt ? new Date(n.sentAt).toISOString().split('T')[0] : null
              ).filter(Boolean)
            );
            const todayDate = new Date();
            for (let d = 0; d < 365; d++) {
              const checkDate = new Date(todayDate);
              checkDate.setDate(checkDate.getDate() - d);
              const dateStr = checkDate.toISOString().split('T')[0];
              if (!notifDates.has(dateStr)) {
                daysWithoutMissed = d;
              } else {
                break;
              }
            }
          }

          setStats({
            totalNotifications: statsData.total ?? 0,
            lastNotificationTime: lastNotif,
            checksToday: checksData.total ?? 0,
            daysWithoutMissed,
          });
        } catch {
          // Stats are non-critical
        }
      } catch {
        toast.error('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tz = status?.timezone || 'Asia/Yekaterinburg';
      try {
        setCurrentTime(
          now.toLocaleTimeString('ru-RU', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        setCurrentDate(
          now.toLocaleDateString('ru-RU', {
            timeZone: tz,
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
        );
      } catch {
        setCurrentTime(
          now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        setCurrentDate(
          now.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
        );
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [status?.timezone]);

  // Check bot service health
  useEffect(() => {
    const checkBotService = async () => {
      try {
        const res = await fetch('/api/bot-health', {
          signal: AbortSignal.timeout(3000),
        });
        const data = await res.json();
        setBotServiceUp(data.status === 'ok');
        setBotHealth(data);
      } catch {
        setBotServiceUp(false);
        setBotHealth(null);
      }
    };

    checkBotService();
    const interval = setInterval(checkBotService, 15000);
    return () => clearInterval(interval);
  }, []);

  // Find last check shop name
  useEffect(() => {
    if (status?.lastCheck?.shopGuid) {
      fetch('/api/trade-points')
        .then(r => r.json())
        .then(points => {
          const pt = (Array.isArray(points) ? points : []).find(
            (p: { guid: string }) => p.guid === status.lastCheck?.shopGuid
          );
          setLastCheckShop(pt?.name || status.lastCheck?.shopGuid || '');
        })
        .catch(() => setLastCheckShop(status.lastCheck?.shopGuid || ''));
    }
  }, [status?.lastCheck?.shopGuid]);

  const handleAction = async (action: string, label: string) => {
    setActionLoading(action);
    try {
      const url = action.includes('/') ? `/api/${action}` : `/api/${action}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `${label} выполнено`);
      } else {
        toast.error(data.error || `Ошибка при ${label.toLowerCase()}`);
      }
    } catch {
      toast.error(`Сетевая ошибка при ${label.toLowerCase()}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Calculate mute remaining time
  const getMuteRemaining = () => {
    const muteUntilStr = botHealth?.muteUntil || status?.muteUntil;
    if (!muteUntilStr) return null;
    const muteUntil = new Date(muteUntilStr);
    const now = new Date();
    if (muteUntil <= now) return null;
    const diffMs = muteUntil.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    return `${minutes} мин`;
  };

  if (loading) {
    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div key={i} variants={staggerItem}>
            <Skeleton className="h-48 rounded-xl" />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  const todaySchedule = status?.todaySchedule;
  const isShiftToday = todaySchedule?.isEnabled;
  const timezone = status?.timezone || 'Asia/Yekaterinburg';
  const muteRemaining = getMuteRemaining();
  const isMuted = status?.isMuted || botHealth?.isMuted || false;

  // Shop name for last check
  const lastCheckShopName = lastCheckShop || status?.lastCheck?.shopGuid || null;

  // Timeline calculations
  const getTimelineData = () => {
    if (!isShiftToday || !todaySchedule) return null;
    const now = new Date();
    const [h, m] = todaySchedule.startTime.split(':').map(Number);
    const shiftStartMin = (h ?? 8) * 60 + (m ?? 0);
    const delay = status?.notificationDelay ?? 15;

    let currentMin = now.getHours() * 60 + now.getMinutes();
    try {
      const tzStr = now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      const [th, tm] = tzStr.split(':').map(Number);
      currentMin = (th ?? now.getHours()) * 60 + (tm ?? now.getMinutes());
    } catch {
      // fallback
    }

    const notifMin = shiftStartMin + delay;
    const nextCheckMin = notifMin + 30;
    const barStart = shiftStartMin - 30;
    const barEnd = shiftStartMin + 180;

    const toPercent = (min: number) =>
      Math.max(0, Math.min(100, ((min - barStart) / (barEnd - barStart)) * 100));

    return {
      shiftStart: shiftStartMin,
      current: currentMin,
      notifPoint: notifMin,
      nextCheck: nextCheckMin,
      barStart,
      barEnd,
      toPercent,
    };
  };

  const timeline = getTimelineData();

  const StatusDot = ({ isUp, label, tooltip }: { isUp: boolean | null; label: string; tooltip: string }) => (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full transition-colors duration-500 ${
            isUp === null
              ? 'bg-muted-foreground/40'
              : isUp
              ? 'bg-emerald-500 animate-glow-green'
              : 'bg-red-500'
          }`}
          title={tooltip}
        />
        <span className="text-sm font-medium" title={tooltip}>{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">
        {isUp === null ? 'Проверка...' : isUp ? 'Подключено' : 'Не подключено'}
      </span>
    </div>
  );

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Mute Status Banner */}
      {isMuted && muteRemaining && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <Timer className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Уведомления приостановлены
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Осталось: <span className="font-semibold">{muteRemaining}</span>
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Mute
            </Badge>
          </div>
        </motion.div>
      )}

      {/* Real-time Clock */}
      <motion.div variants={staggerItem}>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/80 via-card to-orange-50/40 dark:from-amber-950/30 dark:via-card dark:to-orange-950/20 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  <Clock className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-3xl sm:text-4xl font-bold tracking-tight font-mono tabular-nums">
                    {currentTime}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {currentDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-normal gap-1">
                  <Zap className="h-3 w-3" />
                  {timezone}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Connection Status Row */}
      <motion.div variants={staggerItem}>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wifi className="h-4 w-4" />
              Статус подключений
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <StatusDot
                isUp={!!status?.isBotConfigured}
                label="Telegram"
                tooltip={status?.isBotConfigured ? 'Telegram бот настроен' : 'Токен бота не указан'}
              />
              <StatusDot
                isUp={!!status?.isYtimesConnected}
                label="Ytimes API"
                tooltip={status?.isYtimesConnected ? 'API ключ Ytimes настроен' : 'API ключ Ytimes не указан'}
              />
              <StatusDot
                isUp={botServiceUp}
                label="Сервис бота"
                tooltip={botServiceUp === null ? 'Проверяем...' : botServiceUp ? `Работает, аптайм: ${Math.floor((botHealth?.uptime ?? 0) / 60)} мин` : 'Сервис бота не отвечает'}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Timeline */}
      {timeline && (
        <motion.div variants={staggerItem}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="h-4 w-4" />
                Временная шкала сегодня
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Timeline bar */}
                <div className="relative">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    {/* Shift zone */}
                    <div
                      className="absolute h-full bg-gradient-to-r from-amber-200 to-amber-400 dark:from-amber-800 dark:to-amber-600 rounded-full opacity-60"
                      style={{
                        left: `${timeline.toPercent(timeline.shiftStart)}%`,
                        width: '10%',
                      }}
                    />
                    {/* Current time marker */}
                    <div
                      className="absolute h-full w-1 bg-foreground rounded-full z-10"
                      style={{ left: `${timeline.toPercent(timeline.current)}%` }}
                    />
                  </div>
                  {/* Markers */}
                  <div className="relative mt-1 h-6">
                    {/* Shift start */}
                    <div
                      className="absolute flex flex-col items-center -translate-x-1/2"
                      style={{ left: `${timeline.toPercent(timeline.shiftStart)}%` }}
                    >
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                        Открытие
                      </span>
                    </div>
                    {/* Notification delay */}
                    <div
                      className="absolute flex flex-col items-center -translate-x-1/2"
                      style={{ left: `${timeline.toPercent(timeline.notifPoint)}%` }}
                    >
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                        Задержка
                      </span>
                    </div>
                    {/* Next check */}
                    <div
                      className="absolute flex flex-col items-center -translate-x-1/2"
                      style={{ left: `${timeline.toPercent(timeline.nextCheck)}%` }}
                    >
                      <div className="h-2 w-2 rounded-full bg-rose-400" />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                        Проверка
                      </span>
                    </div>
                    {/* Current position label */}
                    <div
                      className="absolute flex flex-col items-center -translate-x-1/2"
                      style={{ left: `${timeline.toPercent(timeline.current)}%` }}
                    >
                      <div className="h-3 w-3 rounded-full bg-foreground border-2 border-background" />
                      <span className="text-[10px] font-semibold whitespace-nowrap mt-0.5">
                        Сейчас
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shift info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Смена: <span className="font-medium text-foreground">{todaySchedule.startTime}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {timeline.current < timeline.shiftStart ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        До открытия: {Math.max(0, timeline.shiftStart - timeline.current)} мин
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Смена началась
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Last Check Card */}
      {status?.lastCheck && (
        <motion.div variants={staggerItem}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Eye className="h-4 w-4" />
                Последняя проверка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Когда</p>
                  <p className="text-sm font-medium">
                    {new Date(status.lastCheck.createdAt).toLocaleString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Торговая точка</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{lastCheckShop || '—'}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Касса открыта</p>
                  {status.lastCheck.isShiftOpen ? (
                    <Badge variant="outline" className="text-xs gap-1 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Да
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs gap-1 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400">
                      <XCircle className="h-3 w-3" />
                      Нет
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Уведомление</p>
                  {status.lastCheck.notifiedAt ? (
                    <Badge variant="outline" className="text-xs gap-1 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400">
                      <Bell className="h-3 w-3" />
                      Отправлено
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Не требовалось</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions + Recent Notifications */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Actions */}
        <motion.div variants={staggerItem}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-card via-card to-amber-50/30 dark:to-amber-950/20 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Zap className="h-4 w-4" />
                Быстрые действия
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleAction('check-now', 'Проверка')}
                  disabled={actionLoading === 'check-now'}
                  className="w-full justify-start gap-2"
                >
                  {actionLoading === 'check-now' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  Проверить сейчас
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    handleAction('test-notification', 'Тестовое уведомление')
                  }
                  disabled={actionLoading === 'test-notification'}
                  className="w-full justify-start gap-2"
                >
                  {actionLoading === 'test-notification' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Тестовое уведомление
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    handleAction('trade-points/sync', 'Синхронизация ТТ')
                  }
                  disabled={actionLoading === 'trade-points/sync'}
                  className="w-full justify-start gap-2"
                >
                  {actionLoading === 'trade-points/sync' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Синхр. торговые точки
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Notifications */}
        <motion.div variants={staggerItem}>
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-card via-card to-orange-50/30 dark:to-orange-950/20 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Bell className="h-4 w-4" />
                Последние уведомления
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Нет уведомлений
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm"
                    >
                      <Badge variant="outline" className="shrink-0 mt-0.5 text-xs">
                        {n.shopName}
                      </Badge>
                      <p className="text-muted-foreground line-clamp-1">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stats Row */}
      <motion.div variants={staggerItem}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-amber-500 border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-muted-foreground">Всего отправлено</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalNotifications ?? '—'}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500 border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                <span className="text-xs text-muted-foreground">Последнее</span>
              </div>
              <p className="text-lg font-bold truncate">
                {stats?.lastNotificationTime
                  ? new Date(stats.lastNotificationTime).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500 border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-xs text-muted-foreground">Проверок сегодня</span>
              </div>
              <p className="text-2xl font-bold">{stats?.checksToday ?? '—'}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarCheck className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                <span className="text-xs text-muted-foreground">Без пропусков</span>
              </div>
              <p className="text-2xl font-bold">
                {stats?.daysWithoutMissed ?? 0} дн.
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}