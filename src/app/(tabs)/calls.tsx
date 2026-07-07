import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCalls } from '@/hooks/use-calls';
import { EmptyState } from '@/components/empty-state';
import { Palette } from '@/constants/theme';
import type { CallWithOtherUser } from '@/hooks/use-calls';

export default function CallsScreen() {
  const insets = useSafeAreaInsets();
  const { calls, loading, error } = useCalls();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Calls</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && calls.length === 0 ? (
        <EmptyState icon="call-outline" title="No calls yet" message="Calls you place or receive will show up here." />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: CallWithOtherUser }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.otherUser.display_name}</Text>
              <View style={styles.meta}>
                <MaterialIcons
                  name={
                    item.direction === 'missed'
                      ? 'call-missed'
                      : item.direction === 'outgoing'
                        ? 'call-made'
                        : 'call-received'
                  }
                  size={16}
                  color={item.direction === 'missed' ? Palette.error : Palette.onSurfaceVariant}
                />
                <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            </View>
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
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Palette.outlineVariant },
  name: { fontSize: 15, fontWeight: '600', color: Palette.onSurface },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  time: { fontSize: 12, color: Palette.onSurfaceVariant },
});
