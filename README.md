# BowJones Monitor

BowJones Monitor — панель управления для мониторинга открытия касс торговых точек через Ytimes API и уведомлений в Telegram.

## Цели
- Веб-интерфейс на Next.js + TailwindCSS
- База данных на Prisma + Neon/Postgres
- Развертывание на Vercel
- Плановые проверки точек и уведомление в Telegram

## Технологии
- Next.js 16
- React 19
- Tailwind CSS 4
- Prisma
- PostgreSQL / Neon
- Telegram Bot API
- Ytimes API

## Быстрый старт

1. Установите зависимости:

```bash
bun install
```

2. Скопируйте пример env-файла и заполните значения:

```bash
cp .env.example .env
```

3. Настройте `DATABASE_URL` для Neon/Postgres.

4. Сгенерируйте Prisma Client и примените схему:

```bash
bunx prisma generate
bunx prisma db push
```

5. Запустите локально:

```bash
bun run dev
```

## Переменные окружения

- `DATABASE_URL` — подключение к базе данных PostgreSQL/Neon
- `SHADOW_DATABASE_URL` — опциональная теневая БД для Prisma Migrate
- `APP_BASE_URL` — базовый URL приложения
- `NEXTAUTH_URL` — URL для NextAuth
- `NEXTAUTH_SECRET` — секретный ключ для NextAuth (минимум 32 символа)
- `DEFAULT_TIMEZONE` — часовой пояс по умолчанию
- `DEFAULT_NOTIFICATION_DELAY` — задержка до уведомления (в минутах)
- `DEFAULT_PAGE_SIZE` — размер страницы
- `MAX_PAGE_SIZE` — максимальный размер страницы
- `YTIMES_BASE_URL` — базовый URL Ytimes API

## Архитектура

- `src/app` — UI и API маршруты
- `src/lib/services` — сервисный слой бизнес-логики
- `src/lib/prisma.ts` — Prisma client
- `prisma/schema.prisma` — модель базы данных
- `vercel.json` — конфигурация развертывания и cron

## Развертывание на Vercel

Репозиторий готов к публикации на Vercel. Убедитесь, что переменные окружения заданы в проекте Vercel:

- `DATABASE_URL`
- `APP_BASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DEFAULT_TIMEZONE`
- `DEFAULT_NOTIFICATION_DELAY`
- `YTIMES_BASE_URL`

Vercel будет использовать `vercel.json` для запуска функции `/api/check-now` по расписанию (cron доступен на Pro-плане; на бесплатном используйте внешний cron-сервис).

## CI / GitHub Actions

В каталоге `.github/workflows` настроен workflow для линтинга, проверки типов и сборки проекта на Bun.

## Дополнительно

- `src/lib/services/shift-monitor-service.ts` содержит основную проверку точек и отправку уведомлений.
- `src/app/api/check-now/route.ts` служит точкой ручного и автоматического запуска проверки.
- `src/app/api/bot-webhook/route.ts` принимает обновления от Telegram. Для установки webhook откройте `GET /api/bot-webhook?set` после деплоя.
- Поддерживаемые команды бота: `/start`, `/help`, `/status`, `/check`, `/mute`, `/unmute`.
