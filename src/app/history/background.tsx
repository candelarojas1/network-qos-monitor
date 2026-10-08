import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { MeasurementCard } from '@/components/measurement-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listBackgroundMeasurements, type Measurement } from '@/db/measurements';
import { formatDateTime } from '@/utils/format';

// Evidencia de la ejecución en segundo plano: cada fila es una vez que iOS corrió la tarea
// (o que se la forzó en desarrollo). Las horas muestran cada cuánto la ejecutó realmente iOS.
export default function BackgroundMeasurementsScreen() {
  const [rows, setRows] = useState<Measurement[]>([]);

  useFocusEffect(
    useCallback(() => {
      listBackgroundMeasurements().then(setRows);
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={(m) => String(m.id)}
        ListHeaderComponent={
          <ThemedText type="small" themeColor="textSecondary">
            iOS decide cuándo ejecutar la tarea (mínimo 15 minutos, sin garantía). Solo ping y última
            ubicación conocida, sin throughput.
          </ThemedText>
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no hay mediciones en segundo plano.
          </ThemedText>
        }
        renderItem={({ item }) => <MeasurementCard item={item} when={formatDateTime(item.ts)} />}
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
});
