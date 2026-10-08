import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { takeMeasurement } from '@/engine/measure';

// Muestreo fuera de sesión con BGTaskScheduler. iOS decide cuándo correrlo según batería,
// red y uso: 15 minutos es el mínimo, no la frecuencia. No corre en el simulador
// ni si el usuario cerró la app deslizándola.
export const PERIODIC_TASK = 'periodic-qos-measurement';
const MINIMUM_INTERVAL_MIN = 15;

TaskManager.defineTask(PERIODIC_TASK, async () => {
  try {
    // Solo ping y última ubicación conocida: sin throughput, para no gastar datos móviles.
    await takeMeasurement({ sessionId: null, source: 'background', withThroughput: false });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerPeriodicTask() {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (!(await TaskManager.isTaskRegisteredAsync(PERIODIC_TASK))) {
    await BackgroundTask.registerTaskAsync(PERIODIC_TASK, { minimumInterval: MINIMUM_INTERVAL_MIN });
  }
}
