import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { onLocationUpdate } from '@/engine/session';
import { SESSION_LOCATION_TASK, setLatestFix, stopSessionLocationUpdates } from '@/geo/location-updates';
import { useSessionStore } from '@/store/session-store';

// Las tareas se definen al cargar el módulo (nivel superior), como exige expo-task-manager.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(SESSION_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;

  // Si iOS relanzó la app en segundo plano sin una sesión activa en memoria,
  // no hay nada que medir: se cortan las actualizaciones.
  if (useSessionStore.getState().sessionId === null) {
    await stopSessionLocationUpdates();
    return;
  }

  const loc = data.locations[data.locations.length - 1];
  setLatestFix({ lat: loc.coords.latitude, lng: loc.coords.longitude, ts: loc.timestamp });
  onLocationUpdate();
});
