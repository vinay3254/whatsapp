import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Palette } from '@/constants/theme';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export default function StorageScreen() {
  const { session } = useAuth();
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [mediaBytes, setMediaBytes] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;

    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', session.user.id)
      .then(({ count }) => setMessageCount(count ?? 0));

    supabase
      .from('messages')
      .select('media_size_bytes')
      .eq('sender_id', session.user.id)
      .not('media_size_bytes', 'is', null)
      .then(({ data }) => {
        const total = (data ?? []).reduce((sum, row) => sum + (row.media_size_bytes ?? 0), 0);
        setMediaBytes(total);
      });
  }, [session]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Storage & Data' }} />

      <View style={styles.card}>
        <Text style={styles.statValue}>{messageCount ?? '—'}</Text>
        <Text style={styles.statLabel}>Messages sent</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.statValue}>{mediaBytes === null ? '—' : formatBytes(mediaBytes)}</Text>
        <Text style={styles.statLabel}>Media storage used</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background, padding: 24, gap: 16 },
  card: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '700', color: Palette.primary },
  statLabel: { fontSize: 13, color: Palette.onSurfaceVariant, marginTop: 4 },
});
