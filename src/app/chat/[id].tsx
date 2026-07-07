import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMessages } from '@/hooks/use-messages';
import { useAuth } from '@/providers/auth-provider';
import { Palette } from '@/constants/theme';
import type { OptimisticMessage } from '@/hooks/use-messages';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { messages, loading, error, sendText, retry } = useMessages(id);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    const text = input;
    setInput('');
    await sendText(text);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: true, title: 'Chat', headerTintColor: Palette.primary }} />

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.thread}
        renderItem={({ item }: { item: OptimisticMessage }) => {
          const isMe = item.sender_id === session?.user.id;
          const bubble = (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={isMe ? styles.textMe : styles.textThem}>{item.text}</Text>
              {item.status === 'pending' && <Text style={styles.statusText}>Sending…</Text>}
              {item.status === 'failed' && <Text style={styles.statusTextFailed}>Failed to send — tap to retry</Text>}
            </View>
          );
          return (
            <View style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
              {item.status === 'failed' ? (
                <TouchableOpacity onPress={() => retry(item.id)}>{bubble}</TouchableOpacity>
              ) : (
                bubble
              )}
            </View>
          );
        }}
      />

      {!loading && (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Palette.outline}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={18} color={Palette.onPrimary} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  error: { color: Palette.error, padding: 12 },
  thread: { padding: 16, gap: 8 },
  messageRow: { flexDirection: 'row' },
  bubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  bubbleMe: { backgroundColor: Palette.primaryContainer, borderTopRightRadius: 0 },
  bubbleThem: { backgroundColor: Palette.peachBubble, borderTopLeftRadius: 0 },
  textMe: { color: Palette.onPrimary, fontSize: 14.5, lineHeight: 20 },
  textThem: { color: Palette.onSurface, fontSize: 14.5, lineHeight: 20 },
  statusText: { fontSize: 10, color: Palette.onPrimaryContainer, marginTop: 4 },
  statusTextFailed: { fontSize: 10, color: Palette.onPrimary, marginTop: 4, fontWeight: '700' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.outlineVariant,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 20,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: 16,
    color: Palette.onSurface,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
