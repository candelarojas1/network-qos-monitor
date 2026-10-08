import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_SETTINGS, useSettingsStore, type Settings } from '@/store/settings-store';

type Draft = {
  hosts: [string, string, string];
  backendUrl: string;
  downloadMB: string;
  uploadMB: string;
  throughputEvery: string;
};

function toDraft(s: Settings): Draft {
  return {
    hosts: [...s.hosts],
    backendUrl: s.backendUrl,
    downloadMB: String(s.downloadMB),
    uploadMB: String(s.uploadMB),
    throughputEvery: String(s.throughputEvery),
  };
}

// Devuelve un mensaje de error, o null si el borrador es válido.
function validate(d: Draft): string | null {
  if (d.hosts.some((h) => h.trim() === '')) return 'Los 3 hosts son obligatorios.';
  if (!/^https?:\/\/.+/.test(d.backendUrl.trim())) return 'La URL del backend debe empezar con http:// o https://';
  const down = Number(d.downloadMB);
  const up = Number(d.uploadMB);
  if (!(down > 0 && down <= 50) || !(up > 0 && up <= 50)) return 'Los payloads deben estar entre 0 y 50 MB.';
  const every = Number(d.throughputEvery);
  if (!Number.isInteger(every) || every < 1) return '"Throughput cada N mediciones" debe ser un entero mayor o igual a 1.';
  return null;
}

export default function SettingsScreen() {
  const settings = useSettingsStore();
  const theme = useTheme();
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [message, setMessage] = useState<string | null>(null);

  // Los ajustes se leen de SQLite en forma asíncrona: al terminar, se carga el borrador.
  useEffect(() => useSettingsStore.persist.onFinishHydration((s) => setDraft(toDraft(s))), []);

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  const save = () => {
    const error = validate(draft);
    if (error) {
      setMessage(error);
      return;
    }
    settings.update({
      hosts: draft.hosts.map((h) => h.trim()) as Settings['hosts'],
      backendUrl: draft.backendUrl.trim().replace(/\/+$/, ''),
      downloadMB: Number(draft.downloadMB),
      uploadMB: Number(draft.uploadMB),
      throughputEvery: Number(draft.throughputEvery),
    });
    setMessage('Guardado.');
  };

  const field = (label: string, value: string, onChange: (v: string) => void, numeric = false) => (
    <ThemedView style={styles.field} key={label}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        style={inputStyle}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={numeric ? 'decimal-pad' : 'url'}
      />
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Ajustes</ThemedText>

          <ThemedText type="smallBold">Hosts para el ping (puerto 443)</ThemedText>
          {draft.hosts.map((h, i) =>
            field(`Host ${i + 1}`, h, (v) => {
              const hosts = [...draft.hosts] as Draft['hosts'];
              hosts[i] = v;
              setDraft({ ...draft, hosts });
            }),
          )}

          <ThemedText type="smallBold">Test de throughput</ThemedText>
          {field('URL del backend', draft.backendUrl, (v) => setDraft({ ...draft, backendUrl: v }))}
          {field('Payload de bajada (MB)', draft.downloadMB, (v) => setDraft({ ...draft, downloadMB: v }), true)}
          {field('Payload de subida (MB)', draft.uploadMB, (v) => setDraft({ ...draft, uploadMB: v }), true)}
          {field('Throughput cada N mediciones (sesión)', draft.throughputEvery, (v) =>
            setDraft({ ...draft, throughputEvery: v }), true)}

          {message && <ThemedText type="small">{message}</ThemedText>}

          <Pressable style={styles.button} onPress={save}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              Guardar
            </ThemedText>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setDraft(toDraft(DEFAULT_SETTINGS))}>
            <ThemedText type="smallBold">Restaurar valores por defecto</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
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
  field: { gap: Spacing.one },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    fontSize: 16,
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
