import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listSessionMeasurements, type Measurement } from '@/db/measurements';
import { formatTime } from '@/utils/format';

const LOCATION_LABELS = { gps: 'GPS', last_known: 'última conocida', none: 'sin ubicación' } as const;

function ms(v: number | null) {
  return v === null ? '-' : `${v.toFixed(1)} ms`;
}

function mbps(v: number | null) {
  return v === null ? '-' : `${v.toFixed(2)} Mbps`;
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rows, setRows] = useState<Measurement[]>([]);

  useEffect(() => {
    listSessionMeasurements(Number(id)).then(setRows);
  }, [id]);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={(m) => String(m.id)}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary">
            Esta sesión no tiene mediciones.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">
              {formatTime(item.ts)} · puntaje {item.score}
            </ThemedText>
            <ThemedText type="small">
              {item.net_type}
              {item.generation ? ` · ${item.generation}` : ''} · RTT {ms(item.rtt_avg)} · jitter {ms(item.jitter)}
            </ThemedText>
            <ThemedText type="small">
              Fallos TCP {item.fail_pct.toFixed(0)} % · bajada {mbps(item.down_mbps)} · subida {mbps(item.up_mbps)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.lat === null
                ? 'Sin ubicación'
                : `${item.lat.toFixed(5)}, ${item.lng!.toFixed(5)} (${LOCATION_LABELS[item.location_source]})`}
            </ThemedText>
          </ThemedView>
        )}
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
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
});
