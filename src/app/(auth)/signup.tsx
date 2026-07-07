import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { Palette } from '@/constants/theme';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = displayName.trim() && username.trim() && email.trim() && password.length >= 6;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error: signUpError } = await signUp(
      email.trim(),
      password,
      username.trim().toLowerCase(),
      displayName.trim()
    );
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Create your account</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Display name"
        placeholderTextColor={Palette.outline}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={Palette.outline}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={Palette.outline}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min. 6 characters)"
        placeholderTextColor={Palette.outline}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, (submitting || !canSubmit) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !canSubmit}
      >
        <Text style={styles.buttonText}>{submitting ? 'Creating account...' : 'Sign up'}</Text>
      </TouchableOpacity>

      <Link href="/login" style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: Palette.onSurface, marginBottom: 12 },
  error: { color: Palette.error, fontSize: 13 },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: 16,
    color: Palette.onSurface,
  },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Palette.onPrimary, fontWeight: '600', fontSize: 15 },
  link: { alignSelf: 'center', marginTop: 16 },
  linkText: { color: Palette.secondary, fontSize: 13, fontWeight: '600' },
});
