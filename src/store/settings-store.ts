import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Settings = {
  hosts: [string, string, string];
  // Por defecto el backend desplegado en Render. Para desarrollo local: http://127.0.0.1:3000 (simulador).
  backendUrl: string;
  downloadMB: number;
  uploadMB: number;
  // En una sesión, el test de throughput corre cada N mediciones para no gastar datos móviles.
  throughputEvery: number;
  // Segundos entre el fin de una medición y el inicio de la siguiente, durante una sesión.
  sessionIntervalSec: number;
};

export const DEFAULT_SETTINGS: Settings = {
  hosts: ['1.1.1.1', '8.8.8.8', '9.9.9.9'],
  backendUrl: 'https://network-qos-monitor.onrender.com',
  downloadMB: 2,
  uploadMB: 1,
  throughputEvery: 5,
  sessionIntervalSec: 30,
};

type SettingsStore = Settings & {
  update: (patch: Partial<Settings>) => void;
};

// Se guarda en SQLite (kv-store) para que sobreviva al cierre de la app.
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
    }),
    { name: 'settings', storage: createJSONStorage(() => Storage) },
  ),
);

export const MB = 1024 * 1024;

// Devuelve los ajustes ya leídos de SQLite (la lectura es asíncrona al arrancar la app).
export async function loadSettings(): Promise<Settings> {
  if (!useSettingsStore.persist.hasHydrated()) {
    await useSettingsStore.persist.rehydrate();
  }
  return useSettingsStore.getState();
}
