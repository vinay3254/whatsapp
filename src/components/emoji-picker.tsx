import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Palette } from '@/constants/theme';
import { COMMON_EMOJI } from '@/constants/emoji';

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ visible, onClose, onSelect }: EmojiPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.scrim}
        activeOpacity={1}
        onPress={onClose}
        testID="emoji-picker-scrim"
      />
      <View style={styles.sheet}>
        <FlatList
          data={COMMON_EMOJI as unknown as string[]}
          keyExtractor={(item, index) => `${item}-${index}`}
          numColumns={8}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.cell} onPress={() => onSelect(item)}>
              <Text style={styles.emoji}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'transparent' },
  sheet: {
    height: 300,
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
});
