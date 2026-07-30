const nodeEnv = process.env.NODE_ENV ?? 'development';
const databaseUrl = process.env.DATABASE_URL ?? '';
const apiSecretKey = process.env.API_SECRET_KEY ?? '';
const clientApiKey = process.env.NEXT_PUBLIC_API_SECRET_KEY ?? apiSecretKey;

if (nodeEnv === 'production' && !databaseUrl) {
  throw new Error('DATABASE_URL must be set in production');
}

export const appConfig = {
  nodeEnv,
  databaseUrl: databaseUrl || 'file:./dev.db',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  apiSecretKey,
  clientApiKey,
  defaultTimezone: process.env.DEFAULT_TIMEZONE ?? 'Asia/Yekaterinburg',
  defaultNotificationDelay: Number(process.env.DEFAULT_NOTIFICATION_DELAY ?? 10),
  defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE ?? 20),
  maxPageSize: Number(process.env.MAX_PAGE_SIZE ?? 50),
  ytimesBaseUrl: process.env.YTIMES_BASE_URL ?? 'https://api.ytimes.ru/ex',
} as const;

export function isProduction() {
  return appConfig.nodeEnv === 'production';
}
