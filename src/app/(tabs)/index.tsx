import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useChats } from '@/hooks/use-chats';
import { usePresence } from '@/hooks/use-presence';
import { EmptyState } from '@/components/empty-state';
import { Palette } from '@/constants/theme';
import type { ChatListItem } from '@/types/database';

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { chats, loading, error } = useChats();
  const { isOnline } = usePresence();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && chats.length === 0 ? (
        <EmptyState
          icon="chatbubble-outline"
          title="No chats yet"
          message="Add a contact from Settings to start a conversation."
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.conversationId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: ChatListItem }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/chat/${item.conversationId}`)}
            >
              <View style={styles.avatarWrapper}>
                {item.contact.avatar_url ? (
                  <Image source={{ uri: item.contact.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{item.contact.display_name.charAt(0)}</Text>
                  </View>
                )}
                {isOnline(item.contact.id) && <View style={styles.onlineDot} />}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.contact.display_name}
                </Text>
                <Text style={styles.rowMessage} numberOfLines={1}>
                  {item.lastMessage?.text ?? 'Say hello!'}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Palette.onSurface },
  error: { color: Palette.error, paddingHorizontal: 24, paddingBottom: 8 },
  listContent: { paddingHorizontal: 24, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  avatarWrapper: { position: 'relative', marginRight: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Palette.surfaceContainerHigh },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 20, fontWeight: '700', color: Palette.onPrimaryContainer },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Palette.statusActive,
    borderWidth: 2,
    borderColor: Palette.onPrimary,
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: Palette.onSurface },
  rowMessage: { fontSize: 14, color: Palette.onSurfaceVariant, marginTop: 2 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Palette.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: Palette.onPrimary, fontSize: 11, fontWeight: '700' },
});
