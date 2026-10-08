import { create } from 'zustand';

import type { NewMeasurement } from '@/db/measurements';

// Estado de la sesión activa. Lo escribe el motor (engine/session.ts) y lo lee la UI.
type SessionStore = {
  sessionId: number | null;
  count: number;
  measuring: boolean;
  // true si las actualizaciones de ubicación en segundo plano arrancaron (sigue con pantalla bloqueada).
  background: boolean;
  last: NewMeasurement | null;
  error: string | null;
  set: (patch: Partial<Omit<SessionStore, 'set'>>) => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  count: 0,
  measuring: false,
  background: false,
  last: null,
  error: null,
  set: (patch) => set(patch),
}));
