import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useContacts } from '@/hooks/use-contacts';
import { Palette } from '@/constants/theme';
import type { Profile } from '@/types/database';

export default function AddContactScreen() {
  const { searchByUsername, addContact, startConversation } = useContacts();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (text: string) => {
    setQuery(text);
    setError(null);
    setResults(await searchByUsername(text));
  };

  const handleAdd = async (profile: Profile) => {
    const { error: addError } = await addContact(profile.id);
    if (addError) {
      setError(addError);
      return;
    }
    const { conversationId, error: convError } = await startConversation(profile.id);
    if (convError || !conversationId) {
      setError(convError ?? 'Could not start a conversation.');
      return;
    }
    router.replace(`/chat/${conversationId}`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Add contact', headerShown: true }} />

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Palette.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username"
          placeholderTextColor={Palette.outline}
          autoCapitalize="none"
          value={query}
          onChangeText={handleSearch}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handleAdd(item)}>
            <Text style={styles.name}>{item.display_name}</Text>
            <Text style={styles.username}>@{item.username}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background, padding: 24 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: Palette.onSurface },
  error: { color: Palette.error, marginBottom: 8 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Palette.outlineVariant },
  name: { fontSize: 15, fontWeight: '600', color: Palette.onSurface },
  username: { fontSize: 13, color: Palette.onSurfaceVariant, marginTop: 2 },
});
