import * as Notifications from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';

import type { NewMeasurement } from '@/db/measurements';

// Umbrales de "degradación severa" (justificados en el README):
// - la mitad o más de las sondas TCP no conecta,
// - el RTT promedio supera 500 ms (la navegación se vuelve muy lenta),
// - no hay conexión.
const FAIL_PCT_LIMIT = 50;
const RTT_LIMIT_MS = 500;

const STATE_KEY = 'degraded';

export function isDegraded(m: NewMeasurement): boolean {
  return (
    m.net_type === 'none' ||
    m.rtt_avg === null ||
    m.fail_pct >= FAIL_PCT_LIMIT ||
    m.rtt_avg > RTT_LIMIT_MS
  );
}

function reason(m: NewMeasurement): string {
  if (m.net_type === 'none' || m.rtt_avg === null) return 'Sin conexión: ninguna sonda TCP pudo conectar.';
  if (m.fail_pct >= FAIL_PCT_LIMIT) return `El ${m.fail_pct.toFixed(0)} % de las conexiones TCP falló.`;
  return `Latencia muy alta: ${m.rtt_avg.toFixed(0)} ms de RTT promedio.`;
}

// Avisa solo cuando la red pasa de "bien" a "degradada", para no repetir la notificación.
// El estado se guarda en SQLite porque la tarea en segundo plano puede correr en un arranque nuevo.
export async function checkDegradation(m: NewMeasurement): Promise<void> {
  const degraded = isDegraded(m);
  const wasDegraded = (await Storage.getItem(STATE_KEY)) === '1';
  await Storage.setItem(STATE_KEY, degraded ? '1' : '0');
  if (!degraded || wasDegraded) return;

  await Notifications.scheduleNotificationAsync({
    content: { title: 'Degradación severa de la red', body: reason(m) },
    trigger: null,
  });
}

// Con la app abierta, iOS no muestra notificaciones salvo que se indique.
export function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  Notifications.requestPermissionsAsync();
}
