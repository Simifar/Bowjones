'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarDays, Save, Clock, Info } from 'lucide-react';
import { jsonHeaders } from '@/lib/api-client';

const DAY_LABELS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface Schedule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  isEnabled: boolean;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export function ScheduleTab() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Yekaterinburg');

  useEffect(() => {
    async function load() {
      try {
        const [schedulesRes, settingsRes] = await Promise.all([
          fetch('/api/schedules'),
          fetch('/api/settings'),
        ]);
        const schedulesData = await schedulesRes.json();
        const settingsData = await settingsRes.json();
        setSchedules(schedulesData);
        if (settingsData?.timezone) setTimezone(settingsData.timezone);
      } catch {
        toast.error('Не удалось загрузить расписание');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getTodayDayOfWeek = () => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  };

  const todayIndex = getTodayDayOfWeek();

  const handleTimeChange = (dayOfWeek: number, value: string) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, startTime: value } : s
      )
    );
  };

  const handleToggle = (dayOfWeek: number, checked: boolean) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, isEnabled: checked } : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          schedules: schedules.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            isEnabled: s.isEnabled,
          })),
        }),
      });
      if (res.ok) {
        toast.success('Расписание сохранено');
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  // Time range for the visual bar (6:00 to 22:00)
  const BAR_START = 6 * 60;
  const BAR_END = 22 * 60;
  const BAR_RANGE = BAR_END - BAR_START;

  const timeToPercent = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const mins = (h ?? 0) * 60 + (m ?? 0);
    return Math.max(0, Math.min(100, ((mins - BAR_START) / BAR_RANGE) * 100));
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Visual Week Calendar */}
      <motion.div variants={staggerItem}>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-card via-card to-amber-50/30 dark:to-amber-950/20 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Недельное расписание</CardTitle>
                <CardDescription>Визуальное отображение графика смен</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Time axis */}
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-muted-foreground px-10 sm:px-12">
                <span>6:00</span>
                <span>9:00</span>
                <span>12:00</span>
                <span>15:00</span>
                <span>18:00</span>
                <span>22:00</span>
              </div>
            </div>

            {/* Day rows */}
            <div className="space-y-1.5">
              {schedules.map((schedule) => {
                const isToday = schedule.dayOfWeek === todayIndex;
                const startPos = timeToPercent(schedule.startTime);
                const barWidth = Math.max(3, (4 * 60 / BAR_RANGE) * 100); // 4-hour visual bar

                return (
                  <motion.div
                    key={schedule.dayOfWeek}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: schedule.dayOfWeek * 0.04, duration: 0.3 }}
                    className={`flex items-center gap-2 sm:gap-3 rounded-lg px-2 py-1.5 transition-colors ${
                      isToday
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {/* Day label */}
                    <div className="flex items-center gap-1.5 w-[52px] sm:w-[100px] shrink-0">
                      {isToday && (
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse-dot shrink-0" />
                      )}
                      <span
                        className={`text-xs sm:text-sm font-medium ${
                          isToday ? 'text-amber-700 dark:text-amber-400' : ''
                        } ${!schedule.isEnabled ? 'text-muted-foreground opacity-50' : ''}`}
                      >
                        {isToday ? (
                          <span className="flex items-center gap-1">
                            <span className="font-bold">{DAY_SHORT[schedule.dayOfWeek]}</span>
                            <span className="hidden sm:inline">{DAY_LABELS[schedule.dayOfWeek]}</span>
                          </span>
                        ) : (
                          <>
                            <span>{DAY_SHORT[schedule.dayOfWeek]}</span>
                            <span className="hidden sm:inline">{DAY_LABELS[schedule.dayOfWeek]}</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Visual bar */}
                    <div className="flex-1 relative h-8">
                      {/* Background grid lines */}
                      <div className="absolute inset-0 flex">
                        {[0, 25, 50, 75].map((p) => (
                          <div key={p} className="flex-1 border-r border-dashed border-border/50" />
                        ))}
                      </div>

                      {/* Time bar */}
                      {schedule.isEnabled ? (
                        <motion.div
                          className="absolute top-1 h-6 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-600 dark:to-amber-500 shadow-sm"
                          style={{
                            left: `${startPos}%`,
                            width: `${barWidth}%`,
                          }}
                          layout
                        >
                          <div className="relative h-full flex items-center justify-center">
                            <span className="text-[10px] sm:text-xs font-semibold text-white drop-shadow-sm">
                              {schedule.startTime}
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border/60" />
                      )}
                    </div>

                    {/* Toggle */}
                    <div className="shrink-0">
                      <Switch
                        id={`enabled-vis-${schedule.dayOfWeek}`}
                        checked={schedule.isEnabled}
                        onCheckedChange={(checked) =>
                          handleToggle(schedule.dayOfWeek, checked)
                        }
                        aria-label={`${DAY_LABELS[schedule.dayOfWeek]} — ${schedule.isEnabled ? 'включено' : 'выключено'}`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse-dot" />
                <span>Сегодня</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-6 rounded bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-600 dark:to-amber-500" />
                <span>Рабочий день</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-px w-6 bg-border" />
                <span>Выходной</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Settings */}
      <motion.div variants={staggerItem}>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Настройка времени</CardTitle>
                <CardDescription>Уточните время начала смены для каждого дня</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schedules.map((schedule) => {
                const isToday = schedule.dayOfWeek === todayIndex;
                return (
                  <div
                    key={schedule.dayOfWeek}
                    className={`grid grid-cols-[100px_1fr_80px] gap-4 items-center rounded-lg border px-3 py-3 transition-colors ${
                      isToday
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
                        : schedule.isEnabled
                        ? 'border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10'
                        : 'border-muted bg-muted/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold">
                        {DAY_SHORT[schedule.dayOfWeek]}
                      </span>
                      <span className="text-sm font-medium hidden sm:inline">
                        {DAY_LABELS[schedule.dayOfWeek]}
                      </span>
                      {isToday && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Сегодня
                        </Badge>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor={`time-${schedule.dayOfWeek}`}
                        className="text-xs text-muted-foreground sm:hidden mb-1"
                      >
                        Начало смены
                      </Label>
                      <Input
                        id={`time-${schedule.dayOfWeek}`}
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) =>
                          handleTimeChange(schedule.dayOfWeek, e.target.value)
                        }
                        disabled={!schedule.isEnabled}
                        className="w-full sm:w-32"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        id={`enabled-${schedule.dayOfWeek}`}
                        checked={schedule.isEnabled}
                        onCheckedChange={(checked) =>
                          handleToggle(schedule.dayOfWeek, checked)
                        }
                        aria-label={`${DAY_LABELS[schedule.dayOfWeek]} — ${schedule.isEnabled ? 'включено' : 'выключено'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timezone note */}
      <motion.div variants={staggerItem} className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>
          Часовой пояс: <span className="font-medium text-foreground">{timezone}</span>. Измените в настройках.
        </span>
      </motion.div>

      {/* Prominent Save Button */}
      <motion.div variants={staggerItem} className="flex justify-center">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-md hover:shadow-lg transition-shadow min-w-[240px] text-base"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Сохранить все
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}