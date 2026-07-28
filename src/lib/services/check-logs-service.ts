import { prisma } from '@/lib/prisma';
import { appConfig } from '@/lib/config';

export interface CheckLogFilters {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}

export async function listCheckLogs(filters: CheckLogFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(appConfig.maxPageSize, Math.max(1, filters.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {} as Record<string, unknown>;
    if (filters.dateFrom) {
      (where.createdAt as Record<string, unknown>).gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = toDate;
    }
  }

  const checks = await prisma.shiftCheck.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: pageSize,
  });

  const total = await prisma.shiftCheck.count({ where });

  const guids = [...new Set(checks.map((check) => check.shopGuid))];
  const tradePoints = guids.length > 0
    ? await prisma.tradePoint.findMany({
        where: { guid: { in: guids } },
        select: { guid: true, name: true },
      })
    : [];

  const nameMap = new Map(tradePoints.map((tradePoint) => [tradePoint.guid, tradePoint.name]));

  const enriched = checks.map((check) => ({
    id: check.id,
    shopGuid: check.shopGuid,
    shopName: nameMap.get(check.shopGuid) ?? check.shopGuid,
    checkDate: check.checkDate,
    isShiftOpen: check.isShiftOpen,
    notifiedAt: check.notifiedAt,
    createdAt: check.createdAt,
  }));

  return {
    logs: enriched,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createCheckLog(input: {
  shopGuid: string;
  checkDate: string;
  isShiftOpen: boolean;
  notifiedAt?: Date | null;
}) {
  return prisma.shiftCheck.create({
    data: {
      shopGuid: input.shopGuid,
      checkDate: input.checkDate,
      isShiftOpen: input.isShiftOpen,
      notifiedAt: input.notifiedAt ?? null,
    },
  });
}
