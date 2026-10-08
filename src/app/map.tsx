import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { countUnmappedMeasurements, listMappedMeasurements, type Measurement } from '@/db/measurements';
import { formatDateTime } from '@/utils/format';
import { scoreColor } from '@/utils/score-color';

// Radio de cada círculo en metros. Los círculos semitransparentes se superponen y
// forman el "mapa de calor" de calidad.
const CIRCLE_RADIUS_M = 40;

function detail(m: Measurement) {
  const rtt = m.rtt_avg === null ? '-' : `${m.rtt_avg.toFixed(0)} ms`;
  const down = m.down_mbps === null ? '' : ` · bajada ${m.down_mbps.toFixed(1)} Mbps`;
  return `${m.net_type}${m.generation ? ` ${m.generation}` : ''} · RTT ${rtt}${down}`;
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [points, setPoints] = useState<Measurement[]>([]);
  const [unmapped, setUnmapped] = useState(0);
  const [showMarkers, setShowMarkers] = useState(false);

  // Se recarga al entrar a la pestaña y se encuadran todos los puntos.
  useFocusEffect(
    useCallback(() => {
      Promise.all([listMappedMeasurements(), countUnmappedMeasurements()]).then(([rows, n]) => {
        setPoints(rows);
        setUnmapped(n);
        if (rows.length > 0) {
          mapRef.current?.fitToCoordinates(
            rows.map((m) => ({ latitude: m.lat!, longitude: m.lng! })),
            { edgePadding: { top: 80, right: 40, bottom: 200, left: 40 }, animated: false },
          );
        }
      });
    }, []),
  );

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} showsUserLocation>
        {points.map((m) => (
          <Circle
            key={`c${m.id}`}
            center={{ latitude: m.lat!, longitude: m.lng! }}
            radius={CIRCLE_RADIUS_M}
            fillColor={scoreColor(m.score, 0.35)}
            strokeColor={scoreColor(m.score, 0.6)}
            strokeWidth={1}
          />
        ))}
        {showMarkers &&
          points.map((m) => (
            <Marker
              key={`m${m.id}`}
              coordinate={{ latitude: m.lat!, longitude: m.lng! }}
              pinColor={scoreColor(m.score)}
              title={`${formatDateTime(m.ts)} · puntaje ${m.score}`}
              description={detail(m)}
            />
          ))}
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedText type="smallBold">Calidad de red ({points.length} mediciones)</ThemedText>
          <View style={styles.legend}>
            {[0, 50, 100].map((s) => (
              <View key={s} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: scoreColor(s) }]} />
                <ThemedText type="small">{s === 0 ? 'Mala' : s === 50 ? 'Regular' : 'Buena'}</ThemedText>
              </View>
            ))}
          </View>
          {unmapped > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {unmapped} mediciones sin ubicación no se dibujan.
            </ThemedText>
          )}
          <Pressable onPress={() => setShowMarkers((v) => !v)}>
            <ThemedText type="linkPrimary">
              {showMarkers ? 'Ocultar detalle' : 'Ver detalle de cada punto'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    margin: Spacing.three,
    marginBottom: BottomTabInset + Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  legend: { flexDirection: 'row', gap: Spacing.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  swatch: { width: 12, height: 12, borderRadius: 6 },
});
