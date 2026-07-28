'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { SettingsTab } from '@/components/dashboard/settings-tab';
import { ScheduleTab } from '@/components/dashboard/schedule-tab';
import { NotificationsTab } from '@/components/dashboard/notifications-tab';
import { TradePointsTab } from '@/components/dashboard/trade-points-tab';
import { CheckLogsTab } from '@/components/dashboard/check-logs-tab';
import {
  Coffee,
  Settings,
  CalendarDays,
  Bell,
  Store,
  FileText,
  Moon,
  Sun,
  AlertTriangle,
  Github,
  Heart,
  ExternalLink,
} from 'lucide-react';

function UnconfiguredBanner({ onGoToSettings }: { onGoToSettings: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"
    >
      <div className="flex items-center gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3 sm:p-4 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Бот не настроен
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 truncate">
            Для работы мониторинга необходимо настроить API ключи Telegram и Ytimes во вкладке «Настройки»
          </p>
        </div>
        <Button
          size="sm"
          onClick={onGoToSettings}
          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Настроить</span>
        </Button>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [mounted, setMounted] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const { theme, setTheme } = useTheme();

  // next-themes requires client-side mount check to avoid hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setIsConfigured(!!data?.isBotConfigured && !!data?.isYtimesConnected);
      } catch {
        setIsConfigured(false);
      }
    }
    checkConfig();
  }, [activeTab]);

  const tabVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  };

  const tabs = [
    { value: 'overview', label: 'Обзор', icon: Coffee },
    { value: 'settings', label: 'Настройки', icon: Settings },
    { value: 'schedule', label: 'Расписание', icon: CalendarDays },
    { value: 'notifications', label: 'Уведомления', icon: Bell },
    { value: 'trade-points', label: 'Точки', icon: Store },
    { value: 'check-logs', label: 'Логи', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background bg-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-amber-200/60 dark:border-amber-900/40 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 text-amber-700 dark:text-amber-400 shadow-sm">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  BowJones Monitor
                </h1>
                <p className="text-xs text-muted-foreground leading-none hidden sm:block">
                  Контроль кассы кофейни
                </p>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                aria-label="Переключить тему"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-amber-700" />
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Unconfigured Banner */}
      {isConfigured === false && (
        <div className="pt-4">
          <UnconfiguredBanner onGoToSettings={() => setActiveTab('settings')} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 py-6 sm:py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 w-full flex flex-wrap h-auto gap-1 bg-muted/60 p-1">
              {tabs.map((tab, i) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 min-w-[64px] gap-1.5 data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <tab.icon className="h-4 w-4 hidden sm:block" />
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TabsContent value="overview" forceMount={false}>
                  <DashboardOverview />
                </TabsContent>
                <TabsContent value="settings" forceMount={false}>
                  <SettingsTab />
                </TabsContent>
                <TabsContent value="schedule" forceMount={false}>
                  <ScheduleTab />
                </TabsContent>
                <TabsContent value="notifications" forceMount={false}>
                  <NotificationsTab />
                </TabsContent>
                <TabsContent value="trade-points" forceMount={false}>
                  <TradePointsTab />
                </TabsContent>
                <TabsContent value="check-logs" forceMount={false}>
                  <CheckLogsTab />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-amber-200/40 dark:border-amber-900/30 bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Coffee className="h-3 w-3" />
              <span>
                BowJones Monitor v1.0.0
              </span>
              <span className="mx-1">·</span>
              <span>
                Powered by{' '}
                <span className="font-medium text-amber-700 dark:text-amber-400">Ytimes API</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                Сделано с <Heart className="h-3 w-3 text-red-400 fill-red-400" /> для кофе
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}