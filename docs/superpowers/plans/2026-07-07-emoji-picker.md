# Emoji Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tappable emoji picker to the chat input bar so users can insert emoji into their messages without leaving the app's own UI.

**Architecture:** A static Unicode emoji list feeds a reusable `EmojiPicker` modal component; the conversation screen owns the show/hide state and appends the tapped emoji to its existing draft-text state.

**Tech Stack:** React Native `Modal` + `FlatList`, no new dependency (emoji render via the system font).

## Global Constraints

- Color values come from `Palette` in `src/constants/theme.ts` — no hardcoded hex colors.
- Path alias `@/*` → `./src/*`.
- `@testing-library/react-native`'s `render`/`renderHook` are async in this project's installed version (`14.0.1`) — always `await render(...)`.
- This project has no automated CI gate beyond `npm test` and `npx tsc --noEmit` — both must stay clean after every task.

---

### Task 1: Emoji list and `EmojiPicker` component

**Files:**
- Create: `src/constants/emoji.ts`
- Create: `src/components/emoji-picker.tsx`
- Test: `src/components/emoji-picker.test.tsx`

**Interfaces:**
- Produces: `COMMON_EMOJI: readonly string[]` (`@/constants/emoji`) and `EmojiPicker` (`@/components/emoji-picker`), a component with props `{ visible: boolean; onClose: () => void; onSelect: (emoji: string) => void }` — Task 2 imports and renders this component.

- [ ] **Step 1: Write the emoji list**

Create `src/constants/emoji.ts`:

```ts
export const COMMON_EMOJI = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤑', '🤗', '🤭', '🤫', '🤔',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😴', '😷',
  '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯',
  '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮',
  '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢',
  '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤',
  '😡', '😠', '🤬', '😈', '👿', '💀',
  '👋', '🤚', '✋', '👌', '🤏', '✌️', '🤞', '🤟', '🤘',
  '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '👏',
  '🙌', '👐', '🤲', '🤝', '🙏', '💅', '💪',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵',
  '🍏', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑',
  '🍍', '🥑', '🍕', '🍔', '🍟', '🌭', '🍿', '🎂', '🍩', '🍪',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🎮', '🎲',
  '⭐', '🌟', '✨', '⚡', '🔥', '🎉', '🎊', '🎈', '🎁',
  '✅', '❌', '❓', '❗', '💯', '👀',
] as const;
```

- [ ] **Step 2: Write the failing test**

Create `src/components/emoji-picker.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmojiPicker } from './emoji-picker';
import { COMMON_EMOJI } from '@/constants/emoji';

describe('EmojiPicker', () => {
  it('renders nothing interactive when not visible', async () => {
    await render(<EmojiPicker visible={false} onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.queryByText(COMMON_EMOJI[0])).toBeNull();
  });

  it('calls onSelect with the tapped emoji and stays open', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<EmojiPicker visible onClose={onClose} onSelect={onSelect} />);

    fireEvent.press(screen.getByText(COMMON_EMOJI[0]));

    expect(onSelect).toHaveBeenCalledWith(COMMON_EMOJI[0]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the scrim behind the sheet is pressed', async () => {
    const onClose = jest.fn();
    await render(<EmojiPicker visible onClose={onClose} onSelect={jest.fn()} />);

    fireEvent.press(screen.getByTestId('emoji-picker-scrim'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npm test -- emoji-picker.test.tsx`
Expected: FAIL — `./emoji-picker` doesn't exist yet.

- [ ] **Step 4: Write the component**

Create `src/components/emoji-picker.tsx`:

```tsx
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npm test -- emoji-picker.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/constants/emoji.ts src/components/emoji-picker.tsx src/components/emoji-picker.test.tsx
git commit -m "feat: add EmojiPicker component and common-emoji list"
```

---

### Task 2: Wire the picker into the conversation screen

**Files:**
- Modify: `src/app/chat/[id].tsx`

**Interfaces:**
- Consumes: `EmojiPicker` (`@/components/emoji-picker`), the screen's existing `input`/`setInput` state.

- [ ] **Step 1: Add the toggle state, import, and icon button**

In `src/app/chat/[id].tsx`, add the import:

```tsx
import { EmojiPicker } from '@/components/emoji-picker';
```

Add state alongside the existing `input` state:

```tsx
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
```

In the `inputBar` `View`, add a new button immediately before the existing `TextInput`, so the row reads emoji-button, text-input, send-button:

```tsx
<TouchableOpacity style={styles.emojiBtn} onPress={() => setShowEmojiPicker((v) => !v)}>
  <Ionicons name={showEmojiPicker ? 'happy' : 'happy-outline'} size={22} color={Palette.outline} />
</TouchableOpacity>
```

Add the picker itself as a sibling of the `inputBar` (inside the `KeyboardAvoidingView`, after the `inputBar` block):

```tsx
<EmojiPicker
  visible={showEmojiPicker}
  onClose={() => setShowEmojiPicker(false)}
  onSelect={(emoji) => setInput((prev) => prev + emoji)}
/>
```

- [ ] **Step 2: Add the button's style**

In the `StyleSheet.create` block in the same file, add:

```ts
emojiBtn: {
  width: 36,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
},
```

- [ ] **Step 3: Run the full test suite to confirm no regressions**

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npm test`
Expected: PASS — all suites green (no test targets `chat/[id].tsx` directly; it's covered by manual verification below).

- [ ] **Step 4: Run the typecheck**

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Manually verify via the Preview tool**

Start the `web` launch config, sign in, open any conversation, tap the smiley icon, confirm the emoji sheet slides up, tap two or three emoji and confirm they append to the draft text in order, tap the scrim to close the sheet, confirm the draft text is preserved after closing.

- [ ] **Step 6: Commit**

```bash
git add src/app/chat/\[id\].tsx
git commit -m "feat: wire EmojiPicker into the conversation screen's input bar"
```
