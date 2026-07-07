import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { Palette } from '@/constants/theme';

const NAV_ROWS: { key: string; label: string; icon: keyof typeof Feather.glyphMap; onPress?: () => void }[] = [
  { key: 'add-contact', label: 'Add contact', icon: 'user-plus', onPress: () => router.push('/contacts/add') },
  { key: 'account', label: 'Account', icon: 'user', onPress: () => router.push('/settings/account') },
  { key: 'privacy', label: 'Privacy', icon: 'lock', onPress: () => router.push('/settings/privacy') },
  { key: 'notifications', label: 'Notifications', icon: 'bell', onPress: () => router.push('/settings/notifications') },
  { key: 'storage', label: 'Storage & Data', icon: 'database', onPress: () => router.push('/settings/storage') },
  { key: 'appearance', label: 'Appearance', icon: 'aperture' },
  { key: 'help', label: 'Help', icon: 'help-circle', onPress: () => router.push('/settings/help') },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.profileCard}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{profile?.display_name.charAt(0) ?? '?'}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile?.display_name ?? 'Loading…'}</Text>
        {profile?.status_message && <Text style={styles.status}>{profile.status_message}</Text>}
        <TouchableOpacity style={styles.viewProfileBtn} onPress={() => router.push('/settings/profile')}>
          <Text style={styles.viewProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navGroup}>
        {NAV_ROWS.map((row) => (
          <TouchableOpacity key={row.key} style={styles.navRow} onPress={row.onPress} activeOpacity={row.onPress ? 0.7 : 1}>
            <View style={styles.navIcon}>
              <Feather name={row.icon} size={20} color={Palette.primary} />
            </View>
            <Text style={styles.navLabel}>{row.label}</Text>
            <Feather name="chevron-right" size={18} color={Palette.outlineVariant} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutRow} onPress={signOut}>
        <Feather name="log-out" size={18} color={Palette.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Palette.onSurface },
  profileCard: { alignItems: 'center', marginVertical: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: Palette.surfaceContainerHigh },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: '700', color: Palette.onPrimaryContainer },
  name: { fontSize: 22, fontWeight: '700', color: Palette.onSurface, marginTop: 12 },
  status: { fontSize: 13, color: Palette.onSurfaceVariant, marginTop: 4 },
  viewProfileBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: Palette.primary,
    borderRadius: 20,
  },
  viewProfileText: { fontSize: 14, fontWeight: '600', color: Palette.onPrimary },
  navGroup: {
    marginHorizontal: 24,
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 4,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Palette.champagneSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  navLabel: { fontSize: 15, fontWeight: '600', color: Palette.onSurface, flex: 1 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
  },
  logoutText: { color: Palette.error, fontWeight: '600', fontSize: 14 },
});
