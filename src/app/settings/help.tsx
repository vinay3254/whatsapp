import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Palette } from '@/constants/theme';

const FAQ = [
  {
    q: 'How do I add a contact?',
    a: 'Go to Settings and tap "Add contact", then search by username. Adding a contact starts a conversation with them.',
  },
  {
    q: 'Why can’t I make a call yet?',
    a: 'Live voice/video calling is coming soon. The Calls tab currently shows your call history only.',
  },
  {
    q: 'Can I share photos and videos?',
    a: 'Yes — open a conversation and tap the paperclip icon next to the message box to attach a photo or video (up to 25MB).',
  },
  {
    q: 'How do I change my password?',
    a: 'Go to Settings → Account and use the "Update Password" form.',
  },
];

export default function HelpScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Help' }} />

      {FAQ.map((item) => (
        <View key={item.q} style={styles.card}>
          <Text style={styles.question}>{item.q}</Text>
          <Text style={styles.answer}>{item.a}</Text>
        </View>
      ))}

      <Text style={styles.contact}>Need more help? Reach us at support@example.com</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  card: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  question: { fontSize: 15, fontWeight: '700', color: Palette.onSurface },
  answer: { fontSize: 13, color: Palette.onSurfaceVariant, marginTop: 6, lineHeight: 18 },
  contact: { fontSize: 12, color: Palette.outline, textAlign: 'center', marginTop: 16 },
});
