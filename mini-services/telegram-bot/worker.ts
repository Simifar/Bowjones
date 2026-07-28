import { runShiftMonitoring } from '../../src/lib/services/shift-monitor-service';

console.log('[worker] BowJones monitoring worker started');

setInterval(() => {
  runShiftMonitoring().catch((error) => {
    console.error('[worker] Monitoring cycle failed', error);
  });
}, 60_000);

setInterval(() => {
  console.log('[worker] Worker heartbeat');
}, 300_000);
