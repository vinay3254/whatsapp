# Photo/Video Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick a photo or video from their library (or camera) and send it as a message, stored in Supabase Storage and rendered inline in the conversation thread.

**Architecture:** A private `message-media` Storage bucket with RLS mirroring the `messages` table's own participant-scoped access; `messages` gains nullable `media_url`/`media_type`/`media_size_bytes` columns (a message has text OR media, never neither); `useMessages` gains a `sendMedia` function following the same optimistic pending/sent/failed pattern as the existing `sendText`.

**Tech Stack:** Supabase Storage, `expo-image-picker`, `expo-video`, `expo-image` (already installed). Uploads read the picked file via `fetch(uri).then(r => r.blob())` — React Native's `fetch`/`Blob` support local `file://` URIs, and this avoids `atob`/`btoa`, which do not exist in React Native's JS runtime (only in browsers) — do not use them.

## Global Constraints

- Color values come from `Palette` in `src/constants/theme.ts` — no hardcoded hex colors.
- Path alias `@/*` → `./src/*`.
- `@testing-library/react-native`'s `render`/`renderHook` are async in this project's installed version (`14.0.1`) — always await them.
- Supabase project id: `cpcnljwmbvkdxadyrubu`.
- Native-code packages must be installed with `npx expo install`, not `npm install`.
- This project has a real git repo on branch `main` — commit directly to `main` after every task.

---

### Task 1: Schema, storage bucket, and RLS

**Files:**
- Create: `supabase/migrations/0004_message_media.sql`
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces: `messages.media_url`, `messages.media_type` (`'image' | 'video'`), `messages.media_size_bytes` columns; a `message-media` Storage bucket with RLS; `profiles.notifications_enabled` column (bundled in here per the spec, used by the settings-functionality plan). Updated `Message` interface in `@/types/database` — every later task in this plan and the settings plan relies on these exact field names.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_message_media.sql`:

```sql
alter table messages
  add column media_url text,
  add column media_type text check (media_type in ('image', 'video')),
  add column media_size_bytes bigint;

alter table messages
  alter column text drop not null;
alter table messages
  add constraint messages_text_or_media_check
    check (text is not null or media_url is not null);

alter table profiles
  add column notifications_enabled boolean not null default true;

insert into storage.buckets (id, name, public)
values ('message-media', 'message-media', false)
on conflict (id) do nothing;

create policy "participants can upload message media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-media'
    and is_conversation_participant((storage.foldername(name))[1]::uuid, auth.uid())
  );

create policy "participants can read message media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-media'
    and is_conversation_participant((storage.foldername(name))[1]::uuid, auth.uid())
  );
```

- [ ] **Step 2: Apply the migration**

Call the Supabase MCP tool `apply_migration` with `project_id: cpcnljwmbvkdxadyrubu`, `name: message_media`, and the SQL above as `query`.

Expected: `{"success": true}`, no SQL errors.

- [ ] **Step 3: Verify**

Call `list_tables` (project_id `cpcnljwmbvkdxadyrubu`) and confirm `messages` now has `media_url`, `media_type`, `media_size_bytes` columns and `profiles` has `notifications_enabled`.

Call `execute_sql` with `select id, public from storage.buckets where id = 'message-media';` and confirm one row, `public: false`.

Call `get_advisors` (type: `security`) and confirm no new RLS-disabled warnings on `messages`, `profiles`, or `storage.objects`.

- [ ] **Step 4: Update the `Message` type**

In `src/types/database.ts`, update the `Message` interface:

```ts
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  media_size_bytes: number | null;
  created_at: string;
  read_at: string | null;
}
```

Also add `notifications_enabled: boolean;` to the `Profile` interface, next to the other visibility/preference fields.

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npm test`
Expected: some existing tests that construct a `Message` or `Profile` object literal directly (not via a mock spread) may now show `tsc` errors for missing new fields — if so, add the new fields with sensible defaults (`media_url: null, media_type: null, media_size_bytes: null` / `notifications_enabled: true`) to those literals. Jest itself won't fail on this (types aren't checked at runtime), but `tsc --noEmit` will.

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npx tsc --noEmit`
Expected: zero errors — fix any literal-object type errors as described above.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0004_message_media.sql src/types/database.ts
git commit -m "feat: add message media schema, storage bucket, and RLS"
```

---

### Task 2: `sendMedia` in `useMessages`

**Files:**
- Modify: `src/hooks/use-messages.ts`
- Modify: `src/hooks/use-messages.test.ts`

**Interfaces:**
- Consumes: `Message` type from `@/types/database` (Task 1), `Crypto.randomUUID()` from `expo-crypto` (already installed).
- Produces: `useMessages(conversationId)` gains `sendMedia: (uri: string, type: 'image' | 'video', sizeBytes: number) => Promise<void>` alongside the existing `sendText`/`retry` — Task 3's screen calls this exact signature.

- [ ] **Step 1: Write the failing test**

Add to `src/hooks/use-messages.test.ts` (inside the existing `describe('useMessages', ...)` block, alongside the existing tests):

```ts
  it('sendMedia uploads to the message-media bucket and inserts a media message', async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const upload = jest.fn().mockResolvedValue({ error: null });
    const getPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: 'https://cpcnljwmbvkdxadyrubu.supabase.co/storage/v1/object/public/message-media/conv-1/file.jpg' },
    });
    const insertSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'm4',
          conversation_id: 'conv-1',
          sender_id: 'me',
          text: null,
          media_url: 'https://cpcnljwmbvkdxadyrubu.supabase.co/storage/v1/object/public/message-media/conv-1/file.jpg',
          media_type: 'image',
          media_size_bytes: 1024,
          created_at: '2026-07-07T10:00:00Z',
          read_at: null,
        },
        error: null,
      }),
    });
    const insert = jest.fn().mockReturnValue({ select: insertSelect });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order,
      insert,
    });
    mockSupabase.storage = {
      from: jest.fn().mockReturnValue({ upload, getPublicUrl }),
    };
    const fakeBlob = { size: 1024 };
    global.fetch = jest.fn().mockResolvedValue({ blob: jest.fn().mockResolvedValue(fakeBlob) });

    const { result } = await renderHook(() => useMessages('conv-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.sendMedia('file:///tmp/photo.jpg', 'image', 1024);
    });

    expect(global.fetch).toHaveBeenCalledWith('file:///tmp/photo.jpg');
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('message-media');
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^conv-1\/[a-f0-9-]+\.jpg$/),
      fakeBlob,
      expect.objectContaining({ contentType: 'image/jpeg' })
    );
    expect(insert).toHaveBeenCalledWith({
      conversation_id: 'conv-1',
      sender_id: 'me',
      media_url: 'https://cpcnljwmbvkdxadyrubu.supabase.co/storage/v1/object/public/message-media/conv-1/file.jpg',
      media_type: 'image',
      media_size_bytes: 1024,
    });
    expect(result.current.messages.some((m) => m.media_type === 'image' && m.status === 'sent')).toBe(true);
  });
```

Add `storage: { from: jest.fn() }` to the `jest.mock('@/lib/supabase', ...)` factory at the top of the file, alongside the existing `from` mock.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npm test -- use-messages.test.ts`
Expected: FAIL — `sendMedia` is not a function yet.

- [ ] **Step 3: Implement `sendMedia`**

In `src/hooks/use-messages.ts`, add near the top:

```ts
import * as Crypto from 'expo-crypto';
```

Add this function inside `useMessages`, alongside `sendText`/`retry` (after `insertAndResolve`):

```ts
  const sendMedia = useCallback(
    async (uri: string, type: 'image' | 'video', sizeBytes: number) => {
      if (!session) return;

      const extension = type === 'image' ? 'jpg' : 'mp4';
      const contentType = type === 'image' ? 'image/jpeg' : 'video/mp4';
      const path = `${conversationId}/${Crypto.randomUUID()}.${extension}`;

      const localId = `local-${Date.now()}`;
      const pending: OptimisticMessage = {
        id: localId,
        conversation_id: conversationId,
        sender_id: session.user.id,
        text: null,
        media_url: uri,
        media_type: type,
        media_size_bytes: sizeBytes,
        created_at: new Date().toISOString(),
        read_at: null,
        status: 'pending',
      };
      setMessages((prev) => [...prev, pending]);

      // React Native's fetch/Blob support local file:// URIs, so this reads the
      // picked asset without any base64 conversion — do NOT use atob/btoa, they
      // don't exist in React Native's JS runtime (only in browsers).
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('message-media')
        .upload(path, blob, { contentType });

      if (uploadError) {
        setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, status: 'failed' } : m)));
        return;
      }

      const { data: urlData } = supabase.storage.from('message-media').getPublicUrl(path);

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: session.user.id,
          media_url: urlData.publicUrl,
          media_type: type,
          media_size_bytes: sizeBytes,
        })
        .select()
        .single();

      setMessages((prev) => {
        if (insertError || !data) {
          return prev.map((m) => (m.id === localId ? { ...m, status: 'failed' } : m));
        }
        return prev.map((m) => (m.id === localId ? { ...(data as Message), status: 'sent' } : m));
      });
    },
    [session, conversationId]
  );
```

Update the hook's return statement to include `sendMedia`:

```ts
  return { messages, loading, error, sendText, retry, sendMedia };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npm test -- use-messages.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full suite and typecheck**

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npm test && npx tsc --noEmit`
Expected: all suites pass, zero tsc errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-messages.ts src/hooks/use-messages.test.ts
git commit -m "feat: add sendMedia to useMessages for photo/video uploads"
```

---

### Task 3: Attach button, picker, and media message rendering

**Files:**
- Modify: `src/app/chat/[id].tsx`

**Interfaces:**
- Consumes: `sendMedia` from `useMessages` (Task 2).

- [ ] **Step 1: Install the picker and video packages**

```bash
npx expo install expo-image-picker expo-video
```

- [ ] **Step 2: Add imports and the attach handler**

In `src/app/chat/[id].tsx`, add:

```tsx
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
```

Destructure `sendMedia` alongside the existing hook fields:

```tsx
const { messages, loading, error, sendText, retry, sendMedia } = useMessages(id);
```

Add a handler function inside the component, near `handleSend`:

```tsx
  const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
  const [mediaError, setMediaError] = useState<string | null>(null);

  const handlePickMedia = async () => {
    setMediaError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMediaError('Permission to access your photo library was denied.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const sizeBytes = asset.fileSize ?? 0;
    if (sizeBytes > MAX_MEDIA_BYTES) {
      setMediaError('That file is larger than 25MB. Pick a smaller one.');
      return;
    }

    const type = asset.type === 'video' ? 'video' : 'image';
    await sendMedia(asset.uri, type, sizeBytes);
  };
```

- [ ] **Step 3: Add the attach button to the input bar**

In the `inputBar` `View`, add a new button immediately after the emoji button (from the emoji-picker plan) and before the `TextInput`:

```tsx
<TouchableOpacity style={styles.emojiBtn} onPress={handlePickMedia}>
  <Ionicons name="attach-outline" size={22} color={Palette.outline} />
</TouchableOpacity>
```

Add the error display near the existing `{error && ...}` line:

```tsx
{mediaError && <Text style={styles.error}>{mediaError}</Text>}
```

- [ ] **Step 4: Render media bubbles in the `FlatList`'s `renderItem`**

Replace the `bubble` definition inside `renderItem` with a version that branches on `media_type`:

```tsx
          const bubble = (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              {item.media_type === 'image' && item.media_url && (
                <Image source={{ uri: item.media_url }} style={styles.mediaImage} contentFit="cover" />
              )}
              {item.media_type === 'video' && item.media_url && (
                <VideoBubble uri={item.media_url} />
              )}
              {item.text && <Text style={isMe ? styles.textMe : styles.textThem}>{item.text}</Text>}
              {item.status === 'pending' && <Text style={styles.statusText}>Sending…</Text>}
              {item.status === 'failed' && <Text style={styles.statusTextFailed}>Failed to send — tap to retry</Text>}
            </View>
          );
```

Add the `Image` import from `expo-image` at the top of the file:

```tsx
import { Image } from 'expo-image';
```

Add a small `VideoBubble` helper component at the bottom of the file, above the `styles` definition (a separate component is required here because `useVideoPlayer` is a hook and cannot be called conditionally inside `renderItem`):

```tsx
function VideoBubble({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.mediaVideo} allowsFullscreen nativeControls />;
}
```

- [ ] **Step 5: Add the new styles**

Add to the `StyleSheet.create` block:

```ts
  mediaImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 4 },
  mediaVideo: { width: 220, height: 220, borderRadius: 12, marginBottom: 4 },
```

- [ ] **Step 6: Run the full test suite and typecheck**

Run: `cd "C:\Users\Admin\Downloads\whatsapp designs\whatsapp-app" && npm test && npx tsc --noEmit`
Expected: all suites pass, zero tsc errors.

- [ ] **Step 7: Manually verify via the Preview tool**

Start the `web` launch config, sign in, open a conversation, tap the attach icon, pick an image from the library (the web file picker stands in for the native library), confirm it uploads and renders as an image bubble in the thread, confirm the message persists after a page reload (query `messages` via `execute_sql` to confirm `media_url`/`media_type` are set on the new row).

- [ ] **Step 8: Commit**

```bash
git add src/app/chat/\[id\].tsx package.json package-lock.json
git commit -m "feat: add photo/video picker and media message rendering to the conversation screen"
```
