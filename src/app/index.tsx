import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { pingHosts, PROBES_PER_HOST, type HostResult } from '@/engine/ping';
import { CONNECT_TIMEOUT_MS } from '@/engine/tcp-probe';
import { startSession, stopSession } from '@/engine/session';
import { measureThroughput, warmUp, type ThroughputResult } from '@/engine/throughput';
import { useSessionStore } from '@/store/session-store';
import { useNetworkStore } from '@/store/network-store';
import { MB, useSettingsStore } from '@/store/settings-store';
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

function ms(value: number | null) {
  return value === null ? '-' : `${value.toFixed(1)} ms`;
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
  const settings = useSettingsStore();
  const session = useSessionStore();
  const [pinging, setPinging] = useState(false);
  const [pingResults, setPingResults] = useState<HostResult[]>([]);
  const [testingSpeed, setTestingSpeed] = useState(false);
  const [speedStatus, setSpeedStatus] = useState<string | null>(null);
  const [speed, setSpeed] = useState<ThroughputResult | null>(null);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then((res) => setPermission(res.status));
  }, []);

  const runPing = async () => {
    setPinging(true);
    setPingResults(await pingHosts(settings.hosts));
    setPinging(false);
  };

  const runSpeed = async () => {
    setSpeed(null);
    if (network?.isConnected === false) {
      setSpeedStatus('Error: sin conexión a internet.');
      return;
    }
    setTestingSpeed(true);
    try {
      setSpeedStatus('Despertando servidor...');
      await warmUp(settings.backendUrl);
      setSpeedStatus('Midiendo bajada y subida...');
      setSpeed(
        await measureThroughput(settings.backendUrl, settings.downloadMB * MB, settings.uploadMB * MB),
      );
      setSpeedStatus(null);
    } catch (e) {
      setSpeedStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTestingSpeed(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Monitor</ThemedText>

          <ThemedText type="smallBold">Sesión de medición</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Mide cada {settings.sessionIntervalSec} s (ping + GPS) y throughput cada {settings.throughputEvery} mediciones.
          </ThemedText>
          {session.sessionId !== null && (
            <>
              <Row label="Mediciones" value={`${session.count}${session.measuring ? ' (midiendo...)' : ''}`} />
              <Row
                label="Con pantalla bloqueada"
                value={session.background ? 'Sigue midiendo' : 'Se pausa (sin ubicación)'}
              />
              {session.last && (
                <>
                  <Row label="Último puntaje" value={`${session.last.score} / 100`} />
                  <Row label="Último RTT promedio" value={ms(session.last.rtt_avg)} />
                  <Row
                    label="Ubicación"
                    value={
                      session.last.lat === null
                        ? 'Sin ubicación'
                        : `${session.last.lat.toFixed(5)}, ${session.last.lng!.toFixed(5)}`
                    }
                  />
                </>
              )}
            </>
          )}
          {session.error && <ThemedText type="small">Error: {session.error}</ThemedText>}
          <Pressable
            style={[styles.button, session.sessionId !== null && styles.stopButton]}
            onPress={session.sessionId === null ? startSession : stopSession}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              {session.sessionId === null ? 'Iniciar sesión' : 'Detener sesión'}
            </ThemedText>
          </Pressable>

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
          {permission === 'denied' && (
            <ThemedText type="small" themeColor="textSecondary">
              Sin permiso de ubicación las mediciones se guardan sin coordenadas y no aparecen en el mapa. Se
              activa en Ajustes de iOS &gt; Network QoS Monitor &gt; Ubicación.
            </ThemedText>
          )}

          <ThemedText type="smallBold">Latencia (TCP al puerto 443)</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {PROBES_PER_HOST} sondas por host, timeout {CONNECT_TIMEOUT_MS} ms.
          </ThemedText>
          {pingResults.map(({ host, stats }) => (
            <ThemedView key={host} type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">{host}</ThemedText>
              <ThemedText type="small">
                min {ms(stats.min)} / avg {ms(stats.avg)} / max {ms(stats.max)}
              </ThemedText>
              <ThemedText type="small">Jitter {ms(stats.jitter)}</ThemedText>
              <ThemedText type="small">
                Fallos de conexión TCP (estimación de pérdida): {stats.failPct.toFixed(0)} %
              </ThemedText>
            </ThemedView>
          ))}
          <Pressable style={styles.button} onPress={runPing} disabled={pinging}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              {pinging ? 'Midiendo...' : 'Medir latencia'}
            </ThemedText>
          </Pressable>

          <ThemedText type="smallBold">Throughput</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Bajada {settings.downloadMB} MB, subida {settings.uploadMB} MB contra {settings.backendUrl}
          </ThemedText>
          {speed && (
            <>
              <Row label="Bajada" value={`${speed.downMbps.toFixed(2)} Mbps`} />
              <Row label="Subida" value={`${speed.upMbps.toFixed(2)} Mbps`} />
            </>
          )}
          {speedStatus && <ThemedText type="small">{speedStatus}</ThemedText>}
          <Pressable style={styles.button} onPress={runSpeed} disabled={testingSpeed}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              {testingSpeed ? 'Midiendo...' : 'Test de velocidad'}
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
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
  button: {
    backgroundColor: '#208AEF',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  stopButton: { backgroundColor: '#D93025' },
  buttonText: { color: '#ffffff' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
});
