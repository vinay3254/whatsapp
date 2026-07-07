import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Palette } from '@/constants/theme';

export default function EditProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [statusMessage, setStatusMessage] = useState(profile?.status_message ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), status_message: statusMessage.trim() || null })
      .eq('id', session.user.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshProfile();
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit Profile' }} />

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />

      <Text style={styles.label}>Status message</Text>
      <TextInput
        style={styles.input}
        value={statusMessage}
        onChangeText={setStatusMessage}
        placeholder="Hey there! I'm using WhatsApp."
        placeholderTextColor={Palette.outline}
      />

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background, padding: 24, gap: 8 },
  error: { color: Palette.error },
  label: { fontSize: 12, fontWeight: '700', color: Palette.onSurfaceVariant, marginTop: 12 },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: 16,
    color: Palette.onSurface,
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Palette.onPrimary, fontWeight: '600', fontSize: 15 },
});
