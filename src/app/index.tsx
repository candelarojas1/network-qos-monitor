import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { probeTcp } from '@/engine/tcp-probe';
import { useNetworkStore } from '@/store/network-store';
import type { CellularInfo } from '../../modules/telephony';

const TYPE_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  cellular: 'Celular',
  none: 'Sin conexión',
  unknown: 'Desconocida',
};

const PERMISSION_LABELS: Record<string, string> = {
  granted: 'Concedido',
  denied: 'Denegado',
  undetermined: 'Sin decidir',
};

function yesNo(value: boolean | null) {
  if (value === null) return 'Sin dato';
  return value ? 'Sí' : 'No';
}

// Ej.: "5G (NRNSA)". Sin radio celular (simulador o sin SIM) no hay dato.
function cellularLabel(info: CellularInfo | undefined) {
  if (!info?.radioTech) return 'No disponible';
  return info.generation ? `${info.generation} (${info.radioTech})` : info.radioTech;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </ThemedView>
  );
}

export default function MonitorScreen() {
  const network = useNetworkStore((s) => s.network);
  const refreshCellular = useNetworkStore((s) => s.refreshCellular);
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [probe, setProbe] = useState<string>('Sin medir');

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then((res) => setPermission(res.status));
  }, []);

  const runProbe = async () => {
    setProbe('Midiendo...');
    const rtt = await probeTcp('1.1.1.1');
    setProbe(rtt === null ? 'Falló (timeout o error)' : `${rtt.toFixed(1)} ms`);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Monitor</ThemedText>

          <ThemedText type="smallBold">Red activa</ThemedText>
          <Row label="Tipo" value={network ? (TYPE_LABELS[network.type] ?? network.type) : 'Cargando...'} />
          <Row label="Conectado" value={yesNo(network?.isConnected ?? null)} />
          <Row label="Internet alcanzable" value={yesNo(network?.isInternetReachable ?? null)} />

          <ThemedText type="smallBold">Red celular (módulo nativo)</ThemedText>
          <Row label="Tecnología" value={cellularLabel(network?.cellular)} />
          <Row label="Operador" value={network?.cellular.carrier ?? 'No disponible'} />
          <Row label="Intensidad de señal" value="No disponible en iOS" />
          <Pressable style={styles.secondaryButton} onPress={refreshCellular}>
            <ThemedText type="smallBold">Actualizar red celular</ThemedText>
          </Pressable>

          <ThemedText type="smallBold">Permisos</ThemedText>
          <Row label="Ubicación" value={permission ? PERMISSION_LABELS[permission] : 'Pidiendo...'} />

          <ThemedText type="smallBold">Prueba TCP (1.1.1.1:443)</ThemedText>
          <Row label="RTT" value={probe} />
          <Pressable style={styles.button} onPress={runProbe}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              Probar conexión TCP
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  button: {
    backgroundColor: '#208AEF',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: { color: '#ffffff' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
});
