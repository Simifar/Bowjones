# BowJones Monitor

BowJones Monitor — это панель управления для Telegram-бота, который мониторит открытие касс торговых точек через Ytimes API и уведомляет администратора.

## Цели
- Веб-интерфейс на Next.js + TailwindCSS
- База данных на Prisma + Neon/Postgres
- Развертывание на Vercel
- Плановые проверки точек и уведомление в Telegram

## Технологии
- Next.js 16
- React 19
- Tailwind CSS
- Prisma
- PostgreSQL / Neon
- Telegram Bot API
- Ytimes API

## Быстрый старт

1. Установите зависимости:

```bash
npm install
```

2. Скопируйте пример env-файла и заполните значения:

```bash
cp .env.example .env
```

3. Настройте `DATABASE_URL` для Neon/Postgres.

4. Сгенерируйте Prisma Client и примените схему:

```bash
npx prisma generate
npx prisma db push
```

5. Запустите локально:

```bash
npm run dev
```

## Переменные окружения

Файл `.env.example` содержит необходимые переменные:

- `DATABASE_URL` — подключение к базе данных PostgreSQL/Neon
- `BOT_SERVICE_URL` — URL бэкенда (локально `http://localhost:3003`)
- `APP_BASE_URL` — базовый URL приложения
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
- `DEFAULT_TIMEZONE`
- `DEFAULT_NOTIFICATION_DELAY`
- `YTIMES_BASE_URL`

Vercel будет использовать `vercel.json` для запуска функции `/api/check-now` по расписанию.

## CI / GitHub Actions

В каталоге `.github/workflows` настроен базовый workflow для линтинга и сборки проекта.

## Дополнительно

- Для тестового уведомления используйте Telegram Bot Token и chat ID администратора.
- `src/lib/services/shift-monitor-service.ts` содержит основную проверку точек и отправку уведомлений.
- `src/app/api/check-now/route.ts` служит точкой ручного запуска проверки.
