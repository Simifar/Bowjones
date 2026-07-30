'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { RefreshCw, Store, MapPin, Phone, Building2 } from 'lucide-react';
import { apiHeaders } from '@/lib/api-client';

interface TradePoint {
  id: string;
  guid: string;
  name: string;
  type: string;
  cityName: string;
  address: string;
  phone: string;
  updatedAt: string;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export function TradePointsTab() {
  const [points, setPoints] = useState<TradePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchPoints = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trade-points');
      const data = await res.json();
      setPoints(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Не удалось загрузить торговые точки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/trade-points/sync', {
        method: 'POST',
        headers: apiHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Синхронизация завершена');
        await fetchPoints();
      } else {
        toast.error(data.error || 'Ошибка синхронизации');
      }
    } catch {
      toast.error('Сетевая ошибка');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <motion.div variants={staggerItem}>
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-card via-card to-amber-50/30 dark:to-amber-950/20 shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Торговые точки
                    {points.length > 0 && (
                      <Badge variant="secondary" className="font-normal">
                        {points.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Синхронизированные точки из Ytimes</CardDescription>
                </div>
              </div>
              <Button
                onClick={handleSync}
                disabled={syncing}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Синхронизация...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Синхронизировать
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : points.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="relative mb-4">
                  <Building2 className="h-16 w-16 opacity-15" />
                  <div className="absolute -bottom-1 -right-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                      <Store className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium mb-1">Нет подключённых торговых точек</p>
                <p className="text-xs text-muted-foreground max-w-[280px] text-center">
                  Нажмите «Синхронизировать» для загрузки из Ytimes
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="sm:hidden divide-y">
                  {points.map((point, i) => (
                    <motion.div
                      key={point.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{point.name}</span>
                        {point.type && (
                          <Badge variant="outline" className="text-xs">
                            {point.type}
                          </Badge>
                        )}
                      </div>
                      {point.cityName && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>
                            {point.cityName}
                            {point.address ? `, ${point.address}` : ''}
                          </span>
                        </div>
                      )}
                      {point.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{point.phone}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs">Название</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">
                            Тип
                          </TableHead>
                          <TableHead className="text-xs hidden md:table-cell">
                            Город
                          </TableHead>
                          <TableHead className="text-xs hidden lg:table-cell">
                            Адрес
                          </TableHead>
                          <TableHead className="text-xs hidden xl:table-cell">
                            Телефон
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {points.map((point, i) => (
                          <motion.tr
                            key={point.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b"
                          >
                            <TableCell className="font-medium text-sm">
                              {point.name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                              {point.type ? (
                                <Badge variant="outline">{point.type}</Badge>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                              {point.cityName ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {point.cityName}
                                </span>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden lg:table-cell max-w-xs truncate">
                              {point.address || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">
                              {point.phone ? (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {point.phone}
                                </span>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}