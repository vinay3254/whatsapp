import { View, Text, Switch, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Palette } from '@/constants/theme';

export default function NotificationsScreen() {
  const { session, profile, refreshProfile } = useAuth();

  if (!profile) return null;

  const handleToggle = async (value: boolean) => {
    if (!session) return;
    await supabase.from('profiles').update({ notifications_enabled: value }).eq('id', session.user.id);
    await refreshProfile();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Notifications' }} />

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Message notifications</Text>
          <Text style={styles.rowSub}>
            Turn this off to stop new-message notifications. This app doesn&apos;t send push
            notifications yet even when this is on — it only remembers your preference.
          </Text>
        </View>
        <Switch
          value={profile.notifications_enabled}
          onValueChange={handleToggle}
          trackColor={{ false: Palette.outlineVariant, true: Palette.primaryContainer }}
          thumbColor={profile.notifications_enabled ? Palette.primary : Palette.onPrimary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background, padding: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Palette.onSurface },
  rowSub: { fontSize: 12, color: Palette.onSurfaceVariant, marginTop: 4 },
});
