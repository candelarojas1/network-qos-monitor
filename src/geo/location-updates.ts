import * as Location from 'expo-location';

// Actualizaciones de ubicación durante una sesión. Con el modo "location" de iOS en segundo plano,
// estas actualizaciones mantienen viva la app con la pantalla bloqueada (con el indicador azul).
export const SESSION_LOCATION_TASK = 'session-location-updates';

export type Fix = { lat: number; lng: number; ts: number };

let latestFix: Fix | null = null;

export function setLatestFix(fix: Fix) {
  latestFix = fix;
}

// La última posición recibida por la tarea, si es reciente.
export function getRecentFix(maxAgeMs: number): Fix | null {
  if (latestFix && Date.now() - latestFix.ts <= maxAgeMs) return latestFix;
  return null;
}

// iOS permite seguir recibiendo ubicación en segundo plano si las actualizaciones se iniciaron
// en primer plano por una acción del usuario, aun con el permiso "Mientras se usa".
export async function startSessionLocationUpdates(): Promise<boolean> {
  try {
    await Location.startLocationUpdatesAsync(SESSION_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
    });
    return true;
  } catch {
    // sin permiso de ubicación: la sesión sigue, pero solo mide con la app en pantalla
    return false;
  }
}

export async function stopSessionLocationUpdates(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(SESSION_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(SESSION_LOCATION_TASK);
  }
  latestFix = null;
}
