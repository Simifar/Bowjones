import { prisma } from '@/lib/prisma';
import { appConfig } from '@/lib/config';
import { getBotSettings } from './settings-service';

export interface ScheduleInput {
  dayOfWeek: number;
  startTime: string;
  isEnabled: boolean;
}

export async function getSchedules() {
  const schedules = await prisma.shiftSchedule.findMany({ orderBy: { dayOfWeek: 'asc' } });
  const existingDays = new Set(schedules.map((schedule) => schedule.dayOfWeek));

  for (let day = 0; day < 7; day += 1) {
    if (!existingDays.has(day)) {
      const created = await prisma.shiftSchedule.create({
        data: { dayOfWeek: day, startTime: '08:00', isEnabled: true },
      });
      schedules.push(created);
    }
  }

  return schedules.sort((left, right) => left.dayOfWeek - right.dayOfWeek);
}

export async function saveSchedules(input: ScheduleInput[]) {
  await prisma.$transaction(
    input.map((schedule) =>
      prisma.shiftSchedule.upsert({
        where: { dayOfWeek: schedule.dayOfWeek },
        update: {
          startTime: schedule.startTime,
          isEnabled: schedule.isEnabled,
        },
        create: {
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          isEnabled: schedule.isEnabled,
        },
      }),
    ),
  );

  return getSchedules();
}

export async function getTodaySchedule() {
  const settings = await getBotSettings();
  const today = getTodayDayOfWeek(settings.timezone || appConfig.defaultTimezone);
  return prisma.shiftSchedule.findUnique({ where: { dayOfWeek: today } });
}

function getTodayDayOfWeek(timezone: string) {
  const now = new Date();
  const zonedNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const jsDay = zonedNow.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}
