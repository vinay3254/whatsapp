import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUpdates } from '@/hooks/use-updates';
import { EmptyState } from '@/components/empty-state';
import { Palette } from '@/constants/theme';
import type { UpdatePostWithAuthor } from '@/hooks/use-updates';

export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const { posts, loading, error, createPost } = useUpdates();
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    setPosting(true);
    const { error: postError } = await createPost(draft);
    setPosting(false);
    if (!postError) setDraft('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Updates</Text>
      </View>

      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          placeholder="Share an update..."
          placeholderTextColor={Palette.outline}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <TouchableOpacity
          style={[styles.postBtn, (!draft.trim() || posting) && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!draft.trim() || posting}
        >
          <Text style={styles.postBtnText}>{posting ? 'Posting…' : 'Post'}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && posts.length === 0 ? (
        <EmptyState
          icon="leaf-outline"
          title="No updates yet"
          message="Posts from you and your contacts will show up here."
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: UpdatePostWithAuthor }) => (
            <View style={styles.post}>
              <Text style={styles.postAuthor}>{item.author.display_name}</Text>
              <Text style={styles.postText}>{item.text}</Text>
              <Text style={styles.postTime}>{new Date(item.created_at).toLocaleString()}</Text>
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
  composer: { paddingHorizontal: 24, paddingBottom: 12, gap: 8 },
  composerInput: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Palette.onSurface,
  },
  postBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: Palette.onPrimary, fontWeight: '600', fontSize: 13 },
  error: { color: Palette.error, paddingHorizontal: 24, paddingBottom: 8 },
  listContent: { paddingHorizontal: 24, paddingBottom: 24 },
  post: {
    backgroundColor: Palette.champagneSurface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  postAuthor: { fontSize: 13, fontWeight: '700', color: Palette.primary },
  postText: { fontSize: 14, color: Palette.onSurface, marginTop: 4 },
  postTime: { fontSize: 11, color: Palette.onSurfaceVariant, marginTop: 8 },
});
