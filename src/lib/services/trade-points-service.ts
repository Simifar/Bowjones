import { prisma } from '@/lib/prisma';
import { getBotSettings } from './settings-service';
import { YtimesClient } from './ytimes-client';

export async function listTradePoints() {
  return prisma.tradePoint.findMany({ orderBy: { name: 'asc' } });
}

export async function syncTradePoints() {
  const settings = await getBotSettings();

  if (!settings.ytimesApiKey) {
    throw new Error('Ytimes API key is not configured');
  }

  const client = new YtimesClient(settings.ytimesApiKey);
  const rows = await client.getShops();

  const operations = rows.map((row) =>
    prisma.tradePoint.upsert({
      where: { guid: row.guid },
      update: {
        name: row.name,
        type: row.type ?? '',
        cityName: row.cityName ?? '',
        address: row.address ?? '',
        phone: row.phone ?? '',
        updatedAt: new Date(),
      },
      create: {
        guid: row.guid,
        name: row.name,
        type: row.type ?? '',
        cityName: row.cityName ?? '',
        address: row.address ?? '',
        phone: row.phone ?? '',
      },
    }),
  );

  const results = await prisma.$transaction(operations);

  return {
    syncedCount: results.length,
    tradePoints: results,
  };
}
