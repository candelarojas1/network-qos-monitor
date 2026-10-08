import { createSession, endSession } from '@/db/measurements';
import { useSessionStore } from '@/store/session-store';
import { useSettingsStore } from '@/store/settings-store';
import { takeMeasurement } from './measure';

let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(delayMs: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(tick, delayMs);
}

// Una medición de la sesión. La bandera "measuring" evita que dos mediciones se superpongan.
async function tick() {
  timer = null;
  const { sessionId, count, measuring, set } = useSessionStore.getState();
  if (sessionId === null || measuring) return;

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
  if (current !== null) {
    schedule(current === sessionId ? useSettingsStore.getState().sessionIntervalSec * 1000 : 0);
  }
}

export async function startSession() {
  if (useSessionStore.getState().sessionId !== null) return;
  const id = await createSession(Date.now());
  useSessionStore.getState().set({ sessionId: id, count: 0, last: null, error: null });
  schedule(0);
}

export async function stopSession() {
  const { sessionId } = useSessionStore.getState();
  if (sessionId === null) return;
  if (timer) clearTimeout(timer);
  timer = null;
  useSessionStore.getState().set({ sessionId: null });
  await endSession(sessionId, Date.now());
}
