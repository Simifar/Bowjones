'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Bell,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Coffee,
  AlertTriangle,
  CalendarRange,
  Filter,
  Inbox,
  Calendar,
} from 'lucide-react';

interface Notification {
  id: string;
  shopName: string;
  shopGuid: string;
  shiftDate: string;
  scheduledAt: string;
  message: string;
  sentAt: string;
  acknowledged: boolean;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
}

type FilterType = 'all' | 'unread' | 'today';

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function NotificationsTab() {
  const [data, setData] = useState<NotificationsResponse>({
    notifications: [],
    total: 0,
    page: 1,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ackLoading, setAckLoading] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const fetchNotifications = useCallback(async (page: number, filter?: FilterType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      // Apply quick filter
      const currentFilter = filter ?? activeFilter;
      if (currentFilter === 'unread') {
        params.set('acknowledged', 'false');
      } else if (currentFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.set('dateFrom', today);
        params.set('dateTo', today);
      }

      const res = await fetch(`/api/notifications?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, activeFilter]);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (res.ok) {
        toast.success('История уведомлений очищена');
        fetchNotifications(1);
      } else {
        const json = await res.json();
        toast.error(json.error || 'Ошибка очистки');
      }
    } catch {
      toast.error('Сетевая ошибка');
    } finally {
      setClearing(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    setAckLoading(id);
    try {
      const res = await fetch(`/api/notifications/acknowledge?id=${id}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === id ? { ...n, acknowledged: true } : n
          ),
        }));
        toast.success('Отмечено как прочитанное');
      }
    } catch {
      toast.error('Ошибка');
    } finally {
      setAckLoading(null);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    fetchNotifications(1, filter);
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleApplyFilter = () => {
    fetchNotifications(1);
  };

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    // Will re-fetch due to useEffect dependency
  };

  const hasActiveFilter = dateFrom || dateTo;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Header Card */}
      <motion.div variants={staggerItem}>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-card via-card to-amber-50/30 dark:to-amber-950/20 shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    История уведомлений
                    {data.total > 0 && (
                      <Badge variant="secondary" className="font-normal">
                        {data.total}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Отправленные уведомления о невыявленных открытиях</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Date Filter Toggle */}
                <Button
                  variant={showFilter || hasActiveFilter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowFilter(!showFilter)}
                  className={`gap-1.5 ${showFilter || hasActiveFilter ? 'bg-amber-600 text-white' : ''}`}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Фильтр</span>
                </Button>

                {/* Clear All */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.total === 0 || clearing}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Очистить</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Очистить историю?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Все записи об уведомлениях будут безвозвратно удалены. Это
                        действие нельзя отменить.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClear}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Очистить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>

          {/* Quick Filter Buttons */}
          <CardContent className="pt-0 pb-2">
            <div className="flex items-center gap-2">
              {([
                { key: 'all' as FilterType, label: 'Все', icon: Inbox },
                { key: 'unread' as FilterType, label: 'Непрочитанные', icon: AlertTriangle },
                { key: 'today' as FilterType, label: 'Сегодня', icon: Calendar },
              ]).map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={activeFilter === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange(key)}
                  className={`gap-1.5 text-xs ${
                    activeFilter === key ? 'bg-amber-600 text-white hover:bg-amber-700' : ''
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>

          {/* Date Filter */}
          <AnimatePresence>
            {(showFilter || hasActiveFilter) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0">
                  <div className="flex flex-col sm:flex-row items-end gap-3 p-4 rounded-lg bg-muted/50 border">
                    <div className="flex-1 w-full">
                      <Label className="text-xs text-muted-foreground mb-1 block">Дата с</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <Label className="text-xs text-muted-foreground mb-1 block">Дата по</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleApplyFilter} className="bg-amber-600 hover:bg-amber-700 text-white gap-1">
                        <CalendarRange className="h-3.5 w-3.5" />
                        Применить
                      </Button>
                      {hasActiveFilter && (
                        <Button size="sm" variant="ghost" onClick={handleClearFilter}>
                          Сбросить
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Notifications List */}
      <motion.div variants={staggerItem}>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : data.notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="relative mb-4 animate-float">
                  <Coffee className="h-16 w-16 opacity-15" />
                  <div className="absolute -bottom-1 -right-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                      <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium mb-1">Уведомлений пока нет</p>
                <p className="text-xs text-muted-foreground max-w-[280px] text-center">
                  Когда касса не будет открыта вовремя, здесь появятся уведомления
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="sm:hidden divide-y">
                  {data.notifications.map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`p-4 transition-colors border-l-4 ${
                        n.acknowledged
                          ? 'bg-muted/20 border-l-emerald-500'
                          : 'bg-card border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs font-medium bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {n.shopName}
                          </Badge>
                          {n.acknowledged && (
                            <Badge
                              variant="secondary"
                              className="text-xs gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                            >
                              <Check className="h-3 w-3" />
                              Прочитано
                            </Badge>
                          )}
                        </div>
                        {!n.acknowledged && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcknowledge(n.id)}
                            disabled={ackLoading === n.id}
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            {ackLoading === n.id ? (
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            <span className="sr-only">Отметить прочитанным</span>
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-foreground mb-1">{n.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{n.shiftDate}</span>
                        <span>·</span>
                        <span>{formatDateTime(n.sentAt)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs">Дата</TableHead>
                          <TableHead className="text-xs">Статус</TableHead>
                          <TableHead className="text-xs">Точка</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">
                            Плановое время
                          </TableHead>
                          <TableHead className="text-xs hidden lg:table-cell">
                            Сообщение
                          </TableHead>
                          <TableHead className="text-xs">Отправлено</TableHead>
                          <TableHead className="text-xs w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.notifications.map((n, i) => (
                          <motion.tr
                            key={n.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className={`border-b transition-colors border-l-4 ${
                              n.acknowledged
                                ? 'bg-muted/20 border-l-emerald-500'
                                : 'border-l-transparent'
                            }`}
                          >
                            <TableCell className="text-sm font-medium whitespace-nowrap">
                              {n.shiftDate}
                            </TableCell>
                            <TableCell className="text-sm">
                              {n.acknowledged ? (
                                <Badge variant="secondary" className="text-xs gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                                  <Check className="h-3 w-3" />
                                  Прочитано
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs gap-1 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Касса не открыта
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge variant="outline">{n.shopName}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden md:table-cell whitespace-nowrap">
                              {n.scheduledAt}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden lg:table-cell max-w-xs truncate">
                              {n.message}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDateTime(n.sentAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              {!n.acknowledged && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAcknowledge(n.id)}
                                  disabled={ackLoading === n.id}
                                  className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                >
                                  {ackLoading === n.id ? (
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                  <span className="sr-only">Отметить прочитанным</span>
                                </Button>
                              )}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Страница {data.page} из {data.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.page <= 1}
                        onClick={() => fetchNotifications(data.page - 1)}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.page >= data.totalPages}
                        onClick={() => fetchNotifications(data.page + 1)}
                        className="gap-1"
                      >
                        Далее
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}