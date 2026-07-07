# WhatsApp-style Messenger — Design Spec

Date: 2026-07-06

## Background

The `whatsapp-app` Expo project already contains a single-file prototype
(`src/app/index.tsx`) that implements most of a WhatsApp-style messenger UI,
built to match five design mockups exported from Google Stitch
(`../stitch_mobile_application_framework*/`). The mockups use a warm
"Champagne & Thyme" palette: cream/blush backgrounds, dark olive green
primary, peach/blush message bubbles.

The prototype fakes navigation with local component state instead of Expo
Router, and is missing the fourth "Updates" tab shown in the mockups. This
spec covers rebuilding the app as a real Expo Router app and wiring it to a
Supabase backend for actual 1:1 messaging.

## Goals

- Faithfully reproduce the UI/UX of the five design mockups (chat list,
  conversation screen, calls, settings, privacy & security), plus a new
  Updates tab that fits the same design language.
- Replace fake state-based screen switching with real Expo Router routes,
  so Android back button and deep links behave like a native app.
- Wire the app to Supabase for real accounts, real 1:1 messaging, real call
  history, and real Updates posts — no mock/seeded data in the shipped app.

## Non-goals (explicitly deferred)

- Live voice/video calling (WebRTC). The Calls tab is a real history log;
  it does not connect actual audio/video.
- Group chats. Only 1:1 conversations this phase.
- Status/Updates expiry (24h auto-delete). Posts persist until deleted.
- Push notifications, message search, media/voice messages beyond the PDF
  file-attachment pattern already in the mockup.
- Dark mode (mockups only show a light theme).

## Architecture

### Navigation (Expo Router)

```
src/app/
  _layout.tsx                 - root: SafeAreaProvider, auth session gate
  (auth)/
    _layout.tsx
    login.tsx                 - email + password
    signup.tsx                - email + password + display name + username
  (tabs)/
    _layout.tsx                - bottom tab bar: Chats, Calls, Updates, Settings
    index.tsx                  - Chats list (was renderChatListScreen)
    calls.tsx                  - Calls list (was renderCallListScreen)
    updates.tsx                - NEW Updates tab
    settings.tsx                - Settings (was renderSettingsScreen)
  chat/[id].tsx                 - Conversation screen (was renderChatScreen)
  settings/
    privacy.tsx                 - Privacy & Security (was renderPrivacyScreen)
    profile.tsx                 - Edit own profile (username, display name, avatar)
```

The root layout reads the Supabase session; unauthenticated users are
redirected into `(auth)`, authenticated users into `(tabs)`.

### Theming

Move the `COLORS` object out of `index.tsx` into `src/constants/theme.ts`,
replacing the current unused default Expo blue theme. This becomes the one
source of truth for colors across all screens.

### Data model (Supabase / Postgres)

```
profiles
  id              uuid PK, references auth.users
  username        text unique not null
  display_name    text not null
  avatar_url      text
  status_message  text
  created_at      timestamptz default now()

contacts
  owner_id        uuid references profiles(id)
  contact_id      uuid references profiles(id)
  created_at      timestamptz default now()
  primary key (owner_id, contact_id)

conversations
  id              uuid PK default gen_random_uuid()
  created_at      timestamptz default now()

conversation_participants
  conversation_id uuid references conversations(id)
  user_id         uuid references profiles(id)
  primary key (conversation_id, user_id)

messages
  id              uuid PK default gen_random_uuid()
  conversation_id uuid references conversations(id)
  sender_id       uuid references profiles(id)
  text            text
  created_at      timestamptz default now()
  read_at         timestamptz

calls
  id              uuid PK default gen_random_uuid()
  caller_id       uuid references profiles(id)
  callee_id       uuid references profiles(id)
  direction       text check (direction in ('incoming','outgoing','missed'))
  created_at      timestamptz default now()

updates_posts
  id              uuid PK default gen_random_uuid()
  user_id         uuid references profiles(id)
  text            text
  image_url       text
  created_at      timestamptz default now()
```

Row-Level Security:
- `profiles`: readable by anyone authenticated (needed for username search);
  writable only by the owning user.
- `contacts`: a user can only read/write rows where they are `owner_id`.
- `conversations` / `conversation_participants` / `messages`: a user can
  only read/write rows for conversations they participate in.
- `calls`: a user can only read rows where they are `caller_id` or
  `callee_id`; can only insert with themselves as `caller_id`.
- `updates_posts`: a user can read their own posts and posts from users in
  their `contacts`; can only write their own.

### Realtime

- Per-conversation Postgres Changes subscription on `messages` filtered by
  `conversation_id`, appending new rows to the open chat screen.
- A Realtime Presence channel (keyed by user id) drives the "Active now" /
  last-seen indicator shown in the conversation header and chat list.
- A subscription on `messages` (scoped to the current user's
  conversations) updates the chat list's last-message preview and unread
  dot without a full refetch.

### Auth & contacts flow

1. Signup: email, password, display name, username → Supabase Auth
   `signUp`, then insert a `profiles` row keyed to the new user id.
2. Login: email + password via Supabase Auth `signInWithPassword`.
3. Add contact: search `profiles` by username, insert a `contacts` row.
   Starting a chat with a contact finds-or-creates a `conversations` row
   with both users in `conversation_participants`.

### Error handling

- Supabase call failures surface as an inline dismissible banner on the
  relevant screen — never silently fall back to stale/mock data.
- Sending a message is optimistic: the bubble renders immediately in a
  "pending" visual state, resolves to "sent" on the Realtime echo, and
  flips to "failed — tap to retry" if the insert errors.
- Auth form errors (duplicate username, wrong password, weak password)
  are shown inline under the relevant field, not as a generic alert.

## Screens carried over from the mockups (unchanged UI, new data source)

- **Chats list** — search bar, avatar + online dot, last message preview,
  unread dot, timestamp — now backed by `conversations` + `messages`.
- **Conversation** — header with avatar/name/active-now, message bubbles
  (olive green outgoing, peach incoming), file-attachment card pattern,
  typing indicator (driven by Presence), message input bar — now backed by
  `messages` with Realtime subscription.
- **Calls** — segmented All/Missed control, call history rows with
  direction icon — now backed by the `calls` table; "call" button inserts
  a `calls` row rather than connecting audio.
- **Settings** — profile card, Account/Privacy/Notifications/Storage &
  Data/Appearance/Help rows — profile card now reads the real `profiles`
  row for the signed-in user.
- **Privacy & Security** — Read Receipts toggle, Last Seen, Profile Photo
  visibility, Two-Step Verification, Blocked Contacts — visibility
  settings persist to new columns on `profiles` (e.g. `last_seen_visibility`,
  `read_receipts_enabled`).

## New screen: Updates tab

A simple persistent-post feed (no 24h expiry) matching the design
language: a top app bar consistent with the other tabs, a composer entry
point (text + optional photo), and a list of posts from the signed-in
user's contacts plus their own, newest first. Backed by `updates_posts`.

## Verification approach

- `expo start --web` in the Preview tool for fast iteration on layout,
  navigation, and data flows during development.
- Manual verification on Expo Go / an emulator for anything web can't
  cover: Android hardware back button behavior, deep linking via the
  `whatsappapp://` scheme already configured in `app.json`.
- No existing automated test setup in this project; adding one is out of
  scope for this spec unless the user asks for it separately.
