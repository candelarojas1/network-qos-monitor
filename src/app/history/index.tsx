import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listSessions, type SessionSummary } from '@/db/measurements';
import { formatDateTime, formatDuration } from '@/utils/format';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  // Se recarga cada vez que se entra a la pestaña.
  useFocusEffect(
    useCallback(() => {
      listSessions().then(setSessions);
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={sessions}
        keyExtractor={(s) => String(s.id)}
        ListHeaderComponent={
          <Link href="/history/background" asChild>
            <Pressable>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">Mediciones en segundo plano</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Las que ejecutó iOS fuera de una sesión, con su hora.
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        }
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no hay sesiones. Iniciá una desde la pestaña Monitor.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/history/[id]', params: { id: item.id } }} asChild>
            <Pressable>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{formatDateTime(item.started_at)}</ThemedText>
                <ThemedText type="small">
                  {item.ended_at ? formatDuration(item.ended_at - item.started_at) : 'En curso'} ·{' '}
                  {item.count} mediciones
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Puntaje promedio: {item.avg_score === null ? '-' : Math.round(item.avg_score)}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
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
