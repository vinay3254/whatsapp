# Messenger Phase 2 — Emoji, Media Sharing, Functional Settings, Real Calling

Date: 2026-07-07

## Background

The core messenger shipped in
`docs/superpowers/plans/2026-07-06-whatsapp-messenger.md` deliberately scoped
out several things the original design mockups implied: live calling
(Calls is a history log only), any media beyond a PDF-attachment pattern,
and most Settings rows were decorative. After using the shipped app, the
user asked for four of those gaps to be closed: an emoji picker, photo/video
sharing in chat, functional Settings rows, and real voice/video calling.

These are four independent subsystems of very different size. They are
specified together here (one document, reviewed once) but will be planned
and implemented as separate, independently-shippable phases, in this order:

1. Emoji picker (no backend changes)
2. Photo/video sharing (new storage + schema)
3. Functional Settings rows (Account, Storage & Data, Help; Notifications
   as a persisted preference only; Appearance stays static)
4. Real voice/video calling (Stream Video; requires moving off Expo Go /
   browser preview onto EAS dev builds to test)

## Global constraints carried over from Phase 1

- Color values come from `Palette` in `src/constants/theme.ts` — no
  hardcoded hex colors in new code.
- Path alias `@/*` → `./src/*`.
- Every hook needs a Jest test with a mocked `@/lib/supabase`; UI-only
  changes with no backend calls don't need a dedicated test file if there's
  nothing to assert beyond rendering (matches Phase 1's precedent for
  screens like the auth forms).
- `@testing-library/react-native`'s `renderHook` and `render` are both
  async in this project's installed version (`14.0.1`) — always
  `await renderHook(...)` / `await render(...)`.

---

## Feature 1: Emoji picker

Already designed and approved in conversation. Summary:

- `src/constants/emoji.ts` — a static array `COMMON_EMOJI: string[]` of
  ~150 common emoji Unicode characters.
- `src/components/emoji-picker.tsx` — `EmojiPicker({ visible, onClose,
  onSelect }: { visible: boolean; onClose: () => void; onSelect: (emoji:
  string) => void })`. Renders a `Modal` (`transparent`, `animationType:
  'slide'`) anchored to the bottom of the screen, containing a `FlatList`
  grid (`numColumns: 8`) of `TouchableOpacity` emoji buttons. Tapping an
  emoji calls `onSelect(emoji)` and does NOT close the picker (matches
  real WhatsApp: pick several in a row). Tapping the scrim outside the
  sheet, or the same toggle icon that opened it, calls `onClose()`.
- `src/app/chat/[id].tsx` — adds `const [showEmojiPicker, setShowEmojiPicker]
  = useState(false)`, a new icon button (`Ionicons`
  `happy-outline`/`happy`) to the left of the `TextInput`, toggling
  `showEmojiPicker`. `onSelect` appends to the current draft:
  `setInput((prev) => prev + emoji)`.

No backend changes. No new dependency (emoji are Unicode text rendered by
the system font on iOS/Android/web).

Non-goals: categories, search, recently-used tracking, message reactions
(a different feature — reacting to an existing message — not covered
here).

---

## Feature 2: Photo/video sharing

### Data model

Migration `0004_message_media.sql`:

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
```

A Supabase Storage bucket `message-media` (private, not public), with
storage RLS policies mirroring the `messages` table's own RLS: a user can
upload/read an object only if its path's leading segment (the
`conversation_id`) is a conversation they participate in — reusing the
existing `is_conversation_participant` helper function:

```sql
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

Objects are stored at `message-media/{conversation_id}/{uuid}.{ext}`.

### Client

- `src/hooks/use-messages.ts` gains `sendMedia(uri: string, type: 'image' |
  'video'): Promise<void>`, following the same optimistic
  pending/sent/failed pattern as `sendText`: reads the file at `uri` (via
  `expo-file-system`), uploads it to
  `message-media/{conversationId}/{randomUUID()}.{ext}` via
  `supabase.storage.from('message-media').upload(...)`, then inserts a
  `messages` row with `media_url` (the public/signed URL) and `media_type`
  set, `text: null`.
- `src/app/chat/[id].tsx` gains an attach button (`Ionicons`
  `attach-outline`) next to the emoji button. Tapping it uses
  `expo-image-picker`'s `launchImageLibraryAsync` (media type: Images and
  Videos) to let the user pick from their library; a long-press or a
  second button opens the camera via `launchCameraAsync`. A 25MB file size
  cap is enforced client-side before upload (Supabase Storage's own
  request size limit backs this up server-side); files over the cap show
  an inline error, matching the existing error-banner pattern used
  elsewhere in this screen.
- Message bubbles with `media_type: 'image'` render an `Image`
  (`expo-image`, already used implicitly by the design system's photo
  patterns) at a fixed max width/height with rounded corners matching the
  bubble; `media_type: 'video'` renders `expo-video`'s `VideoView` with
  play/pause controls, using `useVideoPlayer` for the player instance.

Non-goals: image compression/resizing beyond what the picker itself does,
multi-select (one photo/video per message), voice messages (a
conceptually separate feature from video — not requested).

---

## Feature 3: Functional Settings rows

### Account (`src/app/settings/account.tsx`)

Shows the signed-in user's email (`session.user.email`, read-only) and a
change-password form (current UX pattern: two password fields — new
password, confirm — matching signup's minimum-6-characters rule), calling
`supabase.auth.updateUser({ password })`. Errors surface the same way as
every other form in this app (`{error && <Text style={styles.error}>}`).

### Storage & Data (`src/app/settings/storage.tsx`)

A read-only stats screen. Two numbers, both genuinely computed via
Supabase queries scoped to the signed-in user (not fabricated):

- Total messages sent (`select count(*) from messages where sender_id =
  auth.uid()`, via a `useStorageStats()` hook).
- Total media storage used across their conversations (sum of message
  media file sizes) — this requires the Storage upload step in Feature 2
  to record file size; add a `media_size_bytes bigint` column to
  `messages` alongside `media_url`/`media_type` in migration
  `0004_message_media.sql`, populated at upload time from the picker
  asset's `fileSize` field (or via `expo-file-system`'s `getInfoAsync` if
  the picker doesn't report it).

### Notifications (`src/app/settings/notifications.tsx`)

A single `Switch` bound to a new `notifications_enabled boolean not null
default true` column on `profiles` (migration `0004_message_media.sql`
also adds this, despite the unrelated name — bundling both into the one
remaining schema migration for this phase rather than a separate empty
one). This is a genuinely persisted preference, not a fake toggle — but it
does not trigger any actual push notification (that delivery mechanism —
Expo push tokens, a server-side sender — is a distinct, larger feature not
requested in this pass; noting it here so it's an explicit, visible
non-goal rather than a silent gap).

### Appearance

Stays exactly as shipped in Phase 1: a static, non-interactive "Light
Theme" label. Not touched in this phase.

### Help (`src/app/settings/help.tsx`)

A static screen (no backend) with a short FAQ (3-4 entries: "How do I add
a contact?", "Why can't I make a call yet?" during the calling rollout,
etc.) and a support contact line. Content is hardcoded JSX, not
data-driven — there's nothing here that needs to be editable without a
code change at this app's current size.

---

## Feature 4: Real voice/video calling (Stream Video)

### Provider & why

Stream Video (`@stream-io/video-react-native-sdk`) was chosen over LiveKit
for its purpose-built chat-app call patterns (ring/accept/decline flows
are first-class, not something to hand-roll), a single cross-platform API
surface (iOS/Android/web), and a free tier sufficient for development and
early real usage.

### Prerequisite (user action required)

The user creates a free Stream account at getstream.io, creates an app,
and provides its **API key** and **API secret**. The secret is used
server-side only (to mint per-user call tokens) — it must never ship in
the client bundle. This mirrors how Supabase credentials were supplied
earlier in this project.

### Architecture

- A new Supabase Edge Function, `stream-token`, takes the caller's
  Supabase JWT (verified via Supabase's built-in Edge Function auth
  context), and returns a short-lived Stream user token minted
  server-side using the Stream API secret (`StreamClient.generateUserToken`
  from Stream's Node/Deno server SDK). This is the only place the Stream
  secret exists.
- `src/lib/stream-video.ts` — initializes the Stream Video client
  client-side using the public API key and the token fetched from the
  `stream-token` Edge Function, keyed to the signed-in user's id.
- `src/hooks/use-calls.ts` gains `startCall(calleeId: string): Promise<{
  callId: string | null; error: string | null }>`: creates a Stream
  "ring" call with the caller and callee as members, inserts a `calls` row
  (`direction: 'outgoing'`) as today, and returns the Stream call id.
- A new `src/app/call/[id].tsx` screen joins the Stream call by id, renders
  local/remote video tiles (or an audio-only avatar view for voice calls),
  and provides mute/camera-toggle/end-call controls via the Stream SDK's
  React Native components (`StreamCall`, `CallContent` and friends).
- Incoming calls: Stream's ring-call model pushes an event to the callee's
  subscribed client; while the app is foregrounded this surfaces as an
  in-app incoming-call screen with accept/decline (backed by a `calls` row
  insert with `direction: 'incoming'` on accept, `'missed'` if declined or
  timed out). **Background/killed-app incoming call notifications require
  push notification infrastructure and are explicitly out of scope for
  this pass** — calling only works reliably while the app is open, same
  caveat noted for Settings → Notifications above.
- `src/app/(tabs)/calls.tsx` gains a call button per history row
  (`Ionicons` `call`) that invokes `startCall` for that row's `otherUser`.

### Testing & verification

Unit tests mock the Stream SDK the same way other hooks mock Supabase.
Live verification of an actual audio/video call cannot happen through the
Preview tool's browser (no camera/mic access model that matches a real
device, and native modules don't run in a plain web bundle the way
`react-native-webrtc`-backed SDKs require) — this phase's manual
verification step happens via an EAS development build installed on a
real device or emulator, which is a genuinely different verification
path than every prior phase of this project.

### Non-goals

Group calls (only 1:1, matching the rest of this app's 1:1-only scope),
call recording, screen sharing, background/killed-app push notifications
for incoming calls (noted above).
