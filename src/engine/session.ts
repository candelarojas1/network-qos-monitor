import { createSession, endSession } from '@/db/measurements';
import { startSessionLocationUpdates, stopSessionLocationUpdates } from '@/geo/location-updates';
import { useSessionStore } from '@/store/session-store';
import { useSettingsStore } from '@/store/settings-store';
import { takeMeasurement } from './measure';

// Hay dos disparadores de medición:
// - un timer, que funciona con la app en pantalla;
// - cada actualización de ubicación (onLocationUpdate), que sigue llegando con la pantalla
//   bloqueada gracias al modo de ubicación en segundo plano.
// Los dos llaman a tick(), que solo mide si ya pasó el intervalo desde la medición anterior.

let timer: ReturnType<typeof setTimeout> | null = null;
let lastEnd = 0;

function intervalMs() {
  return useSettingsStore.getState().sessionIntervalSec * 1000;
}

function schedule(delayMs: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(tick, delayMs);
}

async function tick() {
  const { sessionId, count, measuring, set } = useSessionStore.getState();
  // La bandera "measuring" evita que dos mediciones se superpongan.
  if (sessionId === null || measuring || Date.now() - lastEnd < intervalMs()) return;

  const { throughputEvery } = useSettingsStore.getState();
  set({ measuring: true, error: null });
  try {
    // Throughput en la primera medición y después cada N.
    const last = await takeMeasurement({
      sessionId,
      source: 'session',
      withThroughput: count % throughputEvery === 0,
    });
    // Si la sesión se detuvo mientras se medía, la medición queda guardada pero no se cuenta.
    if (useSessionStore.getState().sessionId === sessionId) {
      useSessionStore.getState().set({ count: count + 1, last });
    }
  } catch (e) {
    useSessionStore.getState().set({ error: e instanceof Error ? e.message : String(e) });
  } finally {
    useSessionStore.getState().set({ measuring: false });
  }

  // El intervalo se cuenta desde que termina una medición, así nunca se pisan.
  // Si mientras tanto se inició otra sesión, esa arranca enseguida.
  const current = useSessionStore.getState().sessionId;
  if (current === sessionId) {
    lastEnd = Date.now();
    schedule(intervalMs());
  } else if (current !== null) {
    schedule(0);
  }
}

// La llama la tarea de ubicación (background/session-location-task.ts) en cada actualización.
export function onLocationUpdate() {
  tick();
}

export async function startSession() {
  if (useSessionStore.getState().sessionId !== null) return;
  const id = await createSession(Date.now());
  lastEnd = 0;
  useSessionStore.getState().set({ sessionId: id, count: 0, last: null, error: null });
  const background = await startSessionLocationUpdates();
  useSessionStore.getState().set({ background });
  schedule(0);
}

export async function stopSession() {
  const { sessionId } = useSessionStore.getState();
  if (sessionId === null) return;
  if (timer) clearTimeout(timer);
  timer = null;
  useSessionStore.getState().set({ sessionId: null, background: false });
  await stopSessionLocationUpdates();
  await endSession(sessionId, Date.now());
}
