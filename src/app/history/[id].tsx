import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { MeasurementCard } from '@/components/measurement-card';
import { ThemedText } from '@/components/themed-text';
import { TimeSeriesChart, type ChartRow } from '@/components/time-series-chart';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listSessionMeasurements, type Measurement } from '@/db/measurements';
import { formatTime } from '@/utils/format';

// Minutos desde la primera medición de la sesión.
function toRows(rows: Measurement[], pick: (m: Measurement) => [number | null, number | null]): ChartRow[] {
  const t0 = rows[0]?.ts ?? 0;
  return rows.map((m) => {
    const [a, b] = pick(m);
    return { t: (m.ts - t0) / 60000, a, b };
  });
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rows, setRows] = useState<Measurement[]>([]);

  useEffect(() => {
    listSessionMeasurements(Number(id)).then(setRows);
  }, [id]);

  const latency = useMemo(() => toRows(rows, (m) => [m.rtt_avg, m.jitter]), [rows]);
  // El throughput solo existe en las mediciones donde se corrió el test.
  const throughput = useMemo(
    () => toRows(rows, (m) => [m.down_mbps, m.up_mbps]).filter((r) => r.a !== null),
    [rows],
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={(m) => String(m.id)}
        ListHeaderComponent={
          rows.length > 0 ? (
            <ThemedView style={styles.charts}>
              <TimeSeriesChart
                title="Latencia"
                unit="ms"
                data={latency}
                series={[
                  { key: 'a', label: 'RTT promedio', color: '#208AEF' },
                  { key: 'b', label: 'Jitter', color: '#E8710A' },
                ]}
              />
              <TimeSeriesChart
                title="Throughput"
                unit="Mbps"
                data={throughput}
                series={[
                  { key: 'a', label: 'Bajada', color: '#16A34A' },
                  { key: 'b', label: 'Subida', color: '#9333EA' },
                ]}
              />
              <ThemedText type="smallBold">Mediciones</ThemedText>
            </ThemedView>
          ) : null
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary">
            Esta sesión no tiene mediciones.
          </ThemedText>
        }
        renderItem={({ item }) => <MeasurementCard item={item} when={formatTime(item.ts)} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  charts: { gap: Spacing.four, marginBottom: Spacing.two },
});
