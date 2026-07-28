import { prisma } from '@/lib/prisma';
import { appConfig } from '@/lib/config';

export interface NotificationFilters {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  acknowledged?: boolean;
}

export async function listNotifications(filters: NotificationFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(appConfig.maxPageSize, Math.max(1, filters.pageSize ?? appConfig.defaultPageSize));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (filters.dateFrom || filters.dateTo) {
    where.sentAt = {} as Record<string, unknown>;
    if (filters.dateFrom) {
      (where.sentAt as Record<string, unknown>).gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      (where.sentAt as Record<string, unknown>).lte = toDate;
    }
  }

  if (filters.acknowledged === true) {
    where.acknowledged = true;
  } else if (filters.acknowledged === false) {
    where.acknowledged = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function acknowledgeNotification(id: string) {
  return prisma.notificationLog.update({
    where: { id },
    data: { acknowledged: true },
  });
}

export async function clearNotifications() {
  return prisma.notificationLog.deleteMany({});
}

export async function createNotificationLog(input: {
  shopName: string;
  shopGuid: string;
  shiftDate: string;
  scheduledAt: string;
  message: string;
}) {
  return prisma.notificationLog.create({
    data: {
      shopName: input.shopName,
      shopGuid: input.shopGuid,
      shiftDate: input.shiftDate,
      scheduledAt: input.scheduledAt,
      message: input.message,
    },
  });
}
