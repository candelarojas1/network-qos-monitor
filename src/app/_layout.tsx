import NetInfo from '@react-native-community/netinfo';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { useNetworkStore } from '@/store/network-store';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const setFromNetInfo = useNetworkStore((s) => s.setFromNetInfo);

  // Una sola suscripcion a NetInfo para toda la app.
  useEffect(() => NetInfo.addEventListener(setFromNetInfo), [setFromNetInfo]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
