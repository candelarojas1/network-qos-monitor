// Las tareas en segundo plano se definen al importar estos módulos, antes de montar la UI.
import '@/background/session-location-task';

import NetInfo from '@react-native-community/netinfo';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { setupNotifications } from '@/background/degradation';
// Este import también define la tarea periódica.
import { registerPeriodicTask } from '@/background/periodic-task';
import AppTabs from '@/components/app-tabs';
import { useNetworkStore } from '@/store/network-store';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const setFromNetInfo = useNetworkStore((s) => s.setFromNetInfo);

  // Una sola suscripcion a NetInfo para toda la app.
  useEffect(() => NetInfo.addEventListener(setFromNetInfo), [setFromNetInfo]);

  useEffect(() => {
    setupNotifications();
    registerPeriodicTask();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
