import { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Palette } from '@/constants/theme';
import type { Profile } from '@/types/database';

const VISIBILITY_CYCLE: Profile['last_seen_visibility'][] = ['everyone', 'contacts', 'nobody'];

function nextVisibility(current: Profile['last_seen_visibility']) {
  const index = VISIBILITY_CYCLE.indexOf(current);
  return VISIBILITY_CYCLE[(index + 1) % VISIBILITY_CYCLE.length];
}

function labelFor(value: Profile['last_seen_visibility']) {
  if (value === 'everyone') return 'Everyone';
  if (value === 'contacts') return 'My Contacts';
  return 'Nobody';
}

export default function PrivacyScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!session) return;
    setSaving(true);
    await supabase.from('profiles').update(patch).eq('id', session.user.id);
    await refreshProfile();
    setSaving(false);
  };

  if (!profile) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Privacy & Security' }} />

      <Text style={styles.sectionTitle}>Privacy</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrapper}>
            <MaterialIcons name="done-all" size={20} color={Palette.onSecondaryContainer} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Read Receipts</Text>
            <Text style={styles.rowSub}>If turned off, you won&apos;t send or receive Read Receipts.</Text>
          </View>
          <Switch
            value={profile.read_receipts_enabled}
            disabled={saving}
            onValueChange={(value) => updateProfile({ read_receipts_enabled: value })}
            trackColor={{ false: Palette.outlineVariant, true: Palette.primaryContainer }}
            thumbColor={profile.read_receipts_enabled ? Palette.primary : Palette.onPrimary}
          />
        </View>

        <TouchableOpacity
          style={styles.row}
          disabled={saving}
          onPress={() => updateProfile({ last_seen_visibility: nextVisibility(profile.last_seen_visibility) })}
        >
          <View style={styles.iconWrapper}>
            <Feather name="clock" size={20} color={Palette.onSecondaryContainer} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Last Seen</Text>
            <Text style={styles.rowSub}>{labelFor(profile.last_seen_visibility)}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={Palette.outlineVariant} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          disabled={saving}
          onPress={() => updateProfile({ profile_photo_visibility: nextVisibility(profile.profile_photo_visibility) })}
        >
          <View style={styles.iconWrapper}>
            <Feather name="user" size={20} color={Palette.onSecondaryContainer} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Profile Photo visibility</Text>
            <Text style={styles.rowSub}>{labelFor(profile.profile_photo_visibility)}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={Palette.outlineVariant} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  card: { backgroundColor: Palette.surfaceContainerLow, borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.outlineVariant,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.champagneSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rowText: { flex: 1, paddingRight: 8 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Palette.onSurface },
  rowSub: { fontSize: 12, color: Palette.onSurfaceVariant, marginTop: 2 },
});
