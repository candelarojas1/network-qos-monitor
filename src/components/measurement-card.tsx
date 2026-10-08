import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Measurement } from '@/db/measurements';

const LOCATION_LABELS = { gps: 'GPS', last_known: 'última conocida', none: 'sin ubicación' } as const;

function ms(v: number | null) {
  return v === null ? '-' : `${v.toFixed(1)} ms`;
}

function mbps(v: number | null) {
  return v === null ? '-' : `${v.toFixed(2)} Mbps`;
}

// Una medición del historial. "when" es la hora (o fecha y hora) ya formateada.
export function MeasurementCard({ item, when }: { item: Measurement; when: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        {when} · puntaje {item.score}
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
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
});
