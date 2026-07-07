import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Palette } from '@/constants/theme';

export default function AccountScreen() {
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = password.length >= 6 && password === confirmPassword;

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setSuccess(true);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Account' }} />

      <Text style={styles.label}>Email</Text>
      <View style={styles.readonlyField}>
        <Text style={styles.readonlyText}>{session?.user.email}</Text>
      </View>

      <Text style={[styles.label, { marginTop: 24 }]}>Change password</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>Password updated.</Text>}

      <TextInput
        style={styles.input}
        placeholder="New password (min. 6 characters)"
        placeholderTextColor={Palette.outline}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm new password"
        placeholderTextColor={Palette.outline}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity
        style={[styles.saveBtn, (!canSubmit || saving) && styles.saveBtnDisabled]}
        onPress={handleChangePassword}
        disabled={!canSubmit || saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Updating…' : 'Update Password'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background, padding: 24, gap: 8 },
  error: { color: Palette.error },
  success: { color: Palette.primary },
  label: { fontSize: 12, fontWeight: '700', color: Palette.onSurfaceVariant, marginTop: 12 },
  readonlyField: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  readonlyText: { color: Palette.onSurfaceVariant, fontSize: 14 },
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
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Palette.onPrimary, fontWeight: '600', fontSize: 15 },
});
