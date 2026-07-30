'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Filter,
  CircleDot,
} from 'lucide-react';

interface CheckLog {
  id: string;
  shopGuid: string;
  shopName: string;
  checkDate: string;
  isShiftOpen: boolean;
  notifiedAt: string | null;
  createdAt: string;
}

interface CheckLogsResponse {
  logs: CheckLog[];
  total: number;
  page: number;
  totalPages: number;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export function CheckLogsTab() {
  const [data, setData] = useState<CheckLogsResponse>({
    logs: [],
    total: 0,
    page: 1,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const fetchLogs = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/check-logs?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Не удалось загрузить логи проверок');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const hasActiveFilter = dateFrom || dateTo;

  const getStatusCode = (log: CheckLog) => {
    if (log.isShiftOpen) return 'open';
    if (log.notifiedAt) return 'notified';
    return 'closed';
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'open':
        return (
          <Badge
            variant="outline"
            className="text-xs gap-1 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-3 w-3" />
            Открыта
          </Badge>
        );
      case 'notified':
        return (
          <Badge
            variant="outline"
            className="text-xs gap-1 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400"
          >
            <XCircle className="h-3 w-3" />
            Закрыта + ув.
          </Badge>
        );
      case 'closed':
        return (
          <Badge
            variant="outline"
            className="text-xs gap-1 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/40 text-orange-700 dark:text-orange-400"
          >
            <XCircle className="h-3 w-3" />
            Закрыта
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs gap-1">
            <CircleDot className="h-3 w-3" />
            Нет данных
          </Badge>
        );
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Header */}
      <motion.div variants={staggerItem}>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-card via-card to-amber-50/30 dark:to-amber-950/20 shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Логи проверок
                    {data.total > 0 && (
                      <Badge variant="secondary" className="font-normal">
                        {data.total}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>История всех проверок состояния смен</CardDescription>
                </div>
              </div>
              <Button
                variant={showFilter || hasActiveFilter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilter(!showFilter)}
                className={`gap-1.5 ${showFilter || hasActiveFilter ? 'bg-amber-600 text-white' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Фильтр</span>
              </Button>
            </div>
          </CardHeader>

          {/* Date Filter */}
          {showFilter && (
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
                  <Button
                    size="sm"
                    onClick={() => fetchLogs(1)}
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
                  >
                    <CalendarRange className="h-3.5 w-3.5" />
                    Применить
                  </Button>
                  {hasActiveFilter && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                      }}
                    >
                      Сбросить
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Logs Table */}
      <motion.div variants={staggerItem}>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-card shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : data.logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="h-16 w-16 opacity-15 mb-4" />
                <p className="text-sm font-medium mb-1">Логи проверок пусты</p>
                <p className="text-xs text-muted-foreground max-w-[280px] text-center">
                  Записи появятся после первого автоматического или ручного запуска проверки
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="sm:hidden divide-y">
                  {data.logs.map((log, i) => {
                    const status = getStatusCode(log);
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <StatusBadge status={status} />
                          <span className="text-xs text-muted-foreground">
                            {log.checkDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium">{log.shopName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatDateTime(log.createdAt)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs">Дата проверки</TableHead>
                          <TableHead className="text-xs">Точка</TableHead>
                          <TableHead className="text-xs">Статус</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">Уведомление</TableHead>
                          <TableHead className="text-xs">Время</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.logs.map((log, i) => {
                          const status = getStatusCode(log);
                          return (
                            <motion.tr
                              key={log.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              className="border-b"
                            >
                              <TableCell className="text-sm font-medium whitespace-nowrap">
                                {log.checkDate}
                              </TableCell>
                              <TableCell className="text-sm">
                                <span className="flex items-center gap-1.5">
                                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                  {log.shopName}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                <StatusBadge status={status} />
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                                {log.notifiedAt
                                  ? formatDateTime(log.notifiedAt)
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatDateTime(log.createdAt)}
                              </TableCell>
                            </motion.tr>
                          );
                        })}
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
                        onClick={() => fetchLogs(data.page - 1)}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.page >= data.totalPages}
                        onClick={() => fetchLogs(data.page + 1)}
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