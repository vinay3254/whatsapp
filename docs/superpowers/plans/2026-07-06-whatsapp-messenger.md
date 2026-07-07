# WhatsApp-style Messenger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `whatsapp-app` as a real Expo Router app (login/signup, 4-tab shell: Chats/Calls/Updates/Settings, a real conversation screen) wired to a Supabase backend for genuine 1:1 messaging, call history, and update posts — replacing the current single-file `src/app/index.tsx` prototype that fakes navigation with local state.

**Architecture:** Expo Router file-based routes gate on a Supabase auth session via a React Context (`AuthProvider`). Each domain (chats, contacts, messages, calls, updates) gets one hook that owns its Supabase queries + Realtime subscription, consumed by one screen. All screens share one color palette (`Palette` in `src/constants/theme.ts`) lifted verbatim from the existing prototype and the Stitch design mockups.

**Tech Stack:** Expo SDK ~57, Expo Router ~57.0.3, React Native 0.86, TypeScript, `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, Jest (`jest-expo` preset) + `@testing-library/react-native` for tests.

## Global Constraints

- Expo SDK version is `~57.0.2` — always install native-code packages with `npx expo install <pkg>` (not plain `npm install`) so versions match this SDK. Read `https://docs.expo.dev/versions/v57.0.0/` before adding any Expo API not already used in this plan (per `AGENTS.md`).
- Path alias `@/*` maps to `./src/*` (see `tsconfig.json`) — use it in every import instead of relative paths like `../../`.
- Color values must come from `Palette` in `src/constants/theme.ts` (Task 2) — never hardcode a hex color in a screen/component file.
- No mock/seeded data ships in any screen after its corresponding task lands — every screen reads from Supabase.
- Non-goals (do not build): live voice/video calling, group chats, Updates expiry/cleanup, push notifications, photo upload in Updates (the `image_url` column exists in the schema for future use only), dark mode.
- Every task that adds logic (hooks) needs a Jest test proving its behavior with a mocked `@/lib/supabase`. Schema-only tasks are verified with the Supabase MCP tools instead (`list_tables`, `get_advisors`) since SQL migrations aren't unit-testable the same way.

---

### Task 1: Testing infrastructure

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `src/components/themed-text.test.tsx`

**Interfaces:**
- Consumes: existing `ThemedText` component (`src/components/themed-text.tsx`), unchanged.
- Produces: a working `npm test` command every later task's tests rely on.

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev jest jest-expo @testing-library/react-native @types/jest
```

- [ ] **Step 2: Add Jest config**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEach: [],
};
```

- [ ] **Step 3: Add the `test` script**

In `package.json`, inside `"scripts"`, add:

```json
"test": "jest"
```

- [ ] **Step 4: Write a failing smoke test**

Create `src/components/themed-text.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { ThemedText } from './themed-text';

describe('ThemedText', () => {
  it('renders its children', () => {
    render(<ThemedText>Hello WhatsApp</ThemedText>);
    expect(screen.getByText('Hello WhatsApp')).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run it and confirm it fails for the right reason first (no test runner wired yet), then passes**

Run: `npm test`
Expected: Jest runs (no "command not found" / config errors) and `ThemedText renders its children` **passes**, since `ThemedText` already exists. This step is validating the harness itself, not TDD-ing new logic — confirm the single test in the suite is green.

- [ ] **Step 6: Commit**

```bash
git add package.json jest.config.js src/components/themed-text.test.tsx package-lock.json
git commit -m "test: add Jest + React Native Testing Library harness"
```

---

### Task 2: Theme palette (Champagne & Thyme)

**Files:**
- Modify: `src/constants/theme.ts`

**Interfaces:**
- Produces: `Palette` (a `const` object of hex strings) and `PaletteColor` (its key type), imported by every screen/component from Task 6 onward as `import { Palette } from '@/constants/theme'`.
- Preserves: `Colors`, `ThemeColor`, `Fonts`, `Spacing`, `BottomTabInset`, `MaxContentWidth` — existing exports consumed by `src/components/themed-text.tsx`, `src/components/themed-view.tsx`, `src/hooks/use-theme.ts` must keep working unchanged.

- [ ] **Step 1: Write a failing test for the new export**

Create `src/constants/theme.test.ts`:

```ts
import { Palette, Colors } from './theme';

describe('theme palette', () => {
  it('exposes the Champagne & Thyme colors used across the app', () => {
    expect(Palette.primary).toBe('#3c4429');
    expect(Palette.primaryContainer).toBe('#535c3f');
    expect(Palette.secondary).toBe('#8c4b55');
    expect(Palette.peachBubble).toBe('#E5BCA9');
    expect(Palette.background).toBe('#fff8f3');
  });

  it('still exposes the light/dark Colors map used by ThemedText/ThemedView', () => {
    expect(Colors.light.background).toBe(Palette.background);
    expect(Colors.dark.background).toBe(Palette.background);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- theme.test.ts`
Expected: FAIL — `Palette` is not exported from `./theme`.

- [ ] **Step 3: Update `src/constants/theme.ts`**

Replace the file's contents with:

```ts
/**
 * Champagne & Thyme palette, lifted from the Stitch design mockups
 * (../../../stitch_mobile_application_framework*/screen.png) and the
 * original src/app/index.tsx prototype.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  background: '#fff8f3',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f9f2ed',
  surfaceContainer: '#f3ede8',
  surfaceContainerHigh: '#eee7e2',
  surfaceContainerHighest: '#e8e1dc',
  onSurface: '#1d1b18',
  onSurfaceVariant: '#46483f',
  outline: '#76786e',
  outlineVariant: '#c7c7bc',
  primary: '#3c4429',
  onPrimary: '#ffffff',
  primaryContainer: '#535c3f',
  onPrimaryContainer: '#cad4af',
  secondary: '#8c4b55',
  secondaryContainer: '#fdabb5',
  onSecondaryContainer: '#793c46',
  error: '#ba1a1a',
  champagneSurface: '#FCEBD7',
  peachBubble: '#E5BCA9',
  statusActive: '#535C3F',
} as const;

export type PaletteColor = keyof typeof Palette;

export const Colors = {
  light: {
    text: Palette.onSurface,
    background: Palette.background,
    backgroundElement: Palette.surfaceContainerLow,
    backgroundSelected: Palette.surfaceContainerHigh,
    textSecondary: Palette.onSurfaceVariant,
  },
  dark: {
    text: Palette.onSurface,
    background: Palette.background,
    backgroundElement: Palette.surfaceContainerLow,
    backgroundSelected: Palette.surfaceContainerHigh,
    textSecondary: Palette.onSurfaceVariant,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
```

Note: this is a light-only palette by design (the mockups only show a light theme); `Colors.dark` intentionally mirrors `Colors.light` rather than introducing a real dark theme.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- theme.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/constants/theme.ts src/constants/theme.test.ts
git commit -m "feat: extract Champagne & Thyme color palette into theme constants"
```

---

### Task 3: Supabase backend — schema and RLS

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`

**Interfaces:**
- Produces: the Postgres schema (`profiles`, `contacts`, `conversations`, `conversation_participants`, `messages`, `calls`, `updates_posts`) every later hook queries by exact table/column name below. Column names are locked here — do not rename in later tasks.

- [ ] **Step 1: Find or create the Supabase project**

Call the Supabase MCP tool `list_projects`. If a project intended for this app already exists, use its `id`. Otherwise:
1. Call `list_organizations` and pick the organization to create the project in (ask the user if more than one).
2. Call `get_cost` with `type: "project"` and the chosen `organization_id`, read the cost back to the user.
3. Call `confirm_cost` with the same `type`, the `amount`/`recurrence` from `get_cost`, to get a `confirm_id`.
4. Call `create_project` with `name: "whatsapp-messenger"`, the `organization_id`, and the `confirm_id`.
5. Poll `get_project` until `status` is `ACTIVE_HEALTHY`.

Record the resulting `project_id` — every later `apply_migration`/`execute_sql` call in this plan uses it.

- [ ] **Step 2: Write the migration file**

Create `supabase/migrations/0001_init_schema.sql`:

```sql
create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  status_message text,
  read_receipts_enabled boolean not null default true,
  last_seen_visibility text not null default 'contacts'
    check (last_seen_visibility in ('everyone', 'contacts', 'nobody')),
  profile_photo_visibility text not null default 'everyone'
    check (profile_photo_visibility in ('everyone', 'contacts', 'nobody')),
  created_at timestamptz not null default now()
);

create table contacts (
  owner_id uuid not null references profiles (id) on delete cascade,
  contact_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  check (owner_id <> contact_id)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references profiles (id) on delete cascade,
  callee_id uuid not null references profiles (id) on delete cascade,
  direction text not null check (direction in ('incoming', 'outgoing', 'missed')),
  created_at timestamptz not null default now()
);

create table updates_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  text text,
  image_url text,
  created_at timestamptz not null default now(),
  check (text is not null or image_url is not null)
);

create or replace function public.is_conversation_participant(conv_id uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = conv_id and user_id = uid
  );
$$;

create or replace function public.is_contact(owner uuid, other uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from contacts where owner_id = owner and contact_id = other
  );
$$;

alter table profiles enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table calls enable row level security;
alter table updates_posts enable row level security;

create policy "profiles are readable by authenticated users"
  on profiles for select to authenticated using (true);

create policy "users can insert their own profile"
  on profiles for insert to authenticated with check (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update to authenticated using (auth.uid() = id);

create policy "users can read their own contacts"
  on contacts for select to authenticated using (auth.uid() = owner_id);

create policy "users can add their own contacts"
  on contacts for insert to authenticated with check (auth.uid() = owner_id);

create policy "users can remove their own contacts"
  on contacts for delete to authenticated using (auth.uid() = owner_id);

create policy "participants can read their conversations"
  on conversations for select to authenticated
  using (is_conversation_participant(id, auth.uid()));

create policy "authenticated users can create conversations"
  on conversations for insert to authenticated with check (true);

create policy "participants can read participant rows"
  on conversation_participants for select to authenticated
  using (is_conversation_participant(conversation_id, auth.uid()));

create policy "users can add themselves or a contact as a participant"
  on conversation_participants for insert to authenticated
  with check (user_id = auth.uid() or is_contact(auth.uid(), user_id));

create policy "participants can read messages"
  on messages for select to authenticated
  using (is_conversation_participant(conversation_id, auth.uid()));

create policy "participants can send messages"
  on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_conversation_participant(conversation_id, auth.uid()));

create policy "participants can mark messages read"
  on messages for update to authenticated
  using (is_conversation_participant(conversation_id, auth.uid()))
  with check (is_conversation_participant(conversation_id, auth.uid()));

create policy "users can read their own calls"
  on calls for select to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "users can log calls they place"
  on calls for insert to authenticated with check (auth.uid() = caller_id);

create policy "users can read own and contacts updates"
  on updates_posts for select to authenticated
  using (auth.uid() = user_id or is_contact(auth.uid(), user_id));

create policy "users can create their own updates"
  on updates_posts for insert to authenticated with check (auth.uid() = user_id);

create policy "users can delete their own updates"
  on updates_posts for delete to authenticated using (auth.uid() = user_id);

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table calls;
```

- [ ] **Step 3: Apply the migration**

Call the Supabase MCP tool `apply_migration` with the `project_id` from Step 1, `name: "init_schema"`, and `query` set to the full file contents above.

Expected: the tool returns success with no SQL errors.

- [ ] **Step 4: Verify the schema**

Call `list_tables` with the `project_id`.
Expected: the result includes `profiles`, `contacts`, `conversations`, `conversation_participants`, `messages`, `calls`, `updates_posts`, each with `rls_enabled: true`.

Call `get_advisors` with `project_id` and `type: "security"`.
Expected: no advisories about RLS being disabled on any of the seven tables above (advisories about `auth.users` itself or unrelated defaults are fine to leave).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_init_schema.sql
git commit -m "feat: add Supabase schema and RLS policies for chats/calls/updates"
```

---

### Task 4: Supabase client, env config, and database types

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/supabase.test.ts`
- Create: `src/types/database.ts`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `jest.config.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `project_id`'s API URL and anon key from Task 3 (via Supabase MCP tools `get_project_url` and `get_publishable_keys`).
- Produces: `supabase` (a configured `SupabaseClient`) from `@/lib/supabase`, and the row types `Profile`, `Contact`, `ContactWithProfile`, `Conversation`, `Message`, `Call`, `UpdatePost`, `ChatListItem` from `@/types/database` — every hook from Task 5 onward imports both.

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install @supabase/supabase-js
npx expo install @react-native-async-storage/async-storage react-native-url-polyfill
```

- [ ] **Step 2: Fetch the real project URL and anon key**

Call the Supabase MCP tool `get_project_url` and `get_publishable_keys` with the `project_id` from Task 3. Use the returned values in the next step (do not invent placeholder-looking values that aren't the real ones — this file must contain the actual project's connection info for local development).

- [ ] **Step 3: Add env files**

Create `.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Create `.env` with the real values returned in Step 2 (this file is local-only, see Step 4).

Add to `.gitignore` (append, do not remove existing entries):

```
# Supabase local env
.env
```

- [ ] **Step 4: Write the database row types**

Create `src/types/database.ts`:

```ts
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status_message: string | null;
  read_receipts_enabled: boolean;
  last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
  profile_photo_visibility: 'everyone' | 'contacts' | 'nobody';
  created_at: string;
}

export interface Contact {
  owner_id: string;
  contact_id: string;
  created_at: string;
}

export interface ContactWithProfile extends Contact {
  profile: Profile;
}

export interface Conversation {
  id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read_at: string | null;
}

export interface Call {
  id: string;
  caller_id: string;
  callee_id: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  created_at: string;
}

export interface UpdatePost {
  id: string;
  user_id: string;
  text: string | null;
  image_url: string | null;
  created_at: string;
}

export interface ChatListItem {
  conversationId: string;
  contact: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}
```

- [ ] **Step 5: Write a failing test for the client module**

Create `src/lib/supabase.test.ts`:

```ts
describe('supabase client', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('throws a clear error when credentials are missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => require('./supabase')).toThrow(/Missing EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('creates a client when credentials are present', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    const { supabase } = require('./supabase');
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- supabase.test.ts`
Expected: FAIL — `src/lib/supabase.ts` doesn't exist yet.

- [ ] **Step 7: Write the client**

Create `src/lib/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project credentials.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 8: Add the AsyncStorage Jest mock**

In `jest.config.js`, add a `setupFiles` array:

```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFiles: ['@react-native-async-storage/async-storage/jest/async-storage-mock'],
};
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test -- supabase.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 10: Commit**

```bash
git add src/lib/supabase.ts src/lib/supabase.test.ts src/types/database.ts .env.example .gitignore jest.config.js package.json package-lock.json
git commit -m "feat: add Supabase client, env config, and database row types"
```

---

### Task 5: Auth hook and provider

**Files:**
- Create: `src/hooks/use-auth.ts`
- Create: `src/hooks/use-auth.test.ts`
- Create: `src/providers/auth-provider.tsx`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase`, `Profile` from `@/types/database`.
- Produces: `useAuthState()` (raw hook, `@/hooks/use-auth`) returning `AuthContextValue = { session: Session | null; profile: Profile | null; loading: boolean; signUp; signIn; signOut; refreshProfile }`. `AuthProvider` and `useAuth()` (`@/providers/auth-provider`) — every screen from Task 6 onward calls `useAuth()` to read `session`, `profile`, or call `signIn`/`signUp`/`signOut`.

- [ ] **Step 1: Write failing tests**

Create `src/hooks/use-auth.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuthState } from './use-auth';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as unknown as {
  auth: {
    getSession: jest.Mock;
    onAuthStateChange: jest.Mock;
    signUp: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
  };
  from: jest.Mock;
};

function mockNoSession() {
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
}

describe('useAuthState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves loading to false with no session when there is none stored', async () => {
    mockNoSession();
    const { result } = await renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('signUp returns the Supabase error message on failure', async () => {
    mockNoSession();
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    });
    const { result } = await renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } | undefined;
    await act(async () => {
      response = await result.current.signUp('a@b.com', 'password123', 'alice', 'Alice');
    });

    expect(response?.error).toBe('Email already registered');
  });

  it('signUp inserts a profiles row keyed to the new user id on success', async () => {
    mockNoSession();
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert });

    const { result } = await renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } | undefined;
    await act(async () => {
      response = await result.current.signUp('a@b.com', 'password123', 'alice', 'Alice');
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(insert).toHaveBeenCalledWith({ id: 'user-1', username: 'alice', display_name: 'Alice' });
    expect(response?.error).toBeNull();
  });

  it('signIn returns the Supabase error message on failure', async () => {
    mockNoSession();
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const { result } = await renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } | undefined;
    await act(async () => {
      response = await result.current.signIn('a@b.com', 'wrong-password');
    });

    expect(response?.error).toBe('Invalid login credentials');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-auth.test.ts`
Expected: FAIL — `./use-auth` doesn't exist yet.

- [ ] **Step 3: Write the hook**

Create `src/hooks/use-auth.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

export interface AuthActions {
  signUp: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export type AuthContextValue = AuthState & AuthActions;

export function useAuthState(): AuthContextValue {
  const [state, setState] = useState<AuthState>({ session: null, profile: null, loading: true });

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setState((s) => ({ ...s, profile: error ? null : (data as Profile) }));
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!active) return;
      setState((s) => ({ ...s, session: data.session, loading: false }));
      if (data.session) loadProfile(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, session, loading: false }));
      if (session) loadProfile(session.user.id);
      else setState((s) => ({ ...s, profile: null }));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback<AuthActions['signUp']>(
    async (email, password, username, displayName) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (!data.user) return { error: 'Signup failed. Please try again.' };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, username, display_name: displayName });
      if (profileError) return { error: profileError.message };

      return { error: null };
    },
    []
  );

  const signIn = useCallback<AuthActions['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (state.session) await loadProfile(state.session.user.id);
  }, [state.session, loadProfile]);

  return { ...state, signUp, signIn, signOut, refreshProfile };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-auth.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the provider (no test — thin context wiring, exercised end-to-end once screens exist in Task 7)**

Create `src/providers/auth-provider.tsx`:

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { useAuthState, type AuthContextValue } from '@/hooks/use-auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-auth.ts src/hooks/use-auth.test.ts src/providers/auth-provider.tsx
git commit -m "feat: add Supabase auth hook and AuthProvider context"
```

---

### Task 6: Empty state component, root layout auth gate, and the 4-tab shell

**Files:**
- Create: `src/components/empty-state.tsx`
- Create: `src/components/empty-state.test.tsx`
- Modify: `src/app/_layout.tsx`
- Create: `src/app/(auth)/_layout.tsx`
- Create: `src/app/(tabs)/_layout.tsx`
- Create: `src/app/(tabs)/index.tsx`
- Create: `src/app/(tabs)/calls.tsx`
- Create: `src/app/(tabs)/updates.tsx`
- Create: `src/app/(tabs)/settings.tsx`

**Interfaces:**
- Consumes: `AuthProvider`, `useAuth` from `@/providers/auth-provider`; `Palette` from `@/constants/theme`.
- Produces: `EmptyState` component (`@/components/empty-state`) reused by Tasks 9, 11, 12, 13. The 4 tab route files below are extended (not replaced) by later tasks — each keeps its own header and swaps its body from `EmptyState` to a real list once that task's hook exists.

- [ ] **Step 1: Write a failing test for `EmptyState`**

Create `src/components/empty-state.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the title and message', () => {
    render(<EmptyState icon="chatbubble-outline" title="No chats yet" message="Add a contact to start messaging." />);
    expect(screen.getByText('No chats yet')).toBeTruthy();
    expect(screen.getByText('Add a contact to start messaging.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- empty-state.test.tsx`
Expected: FAIL — `./empty-state` doesn't exist yet.

- [ ] **Step 3: Write `EmptyState`**

Create `src/components/empty-state.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={Palette.outline} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.onSurface,
  },
  message: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- empty-state.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Delete the old root screen so the new route groups can take over**

```bash
git rm src/app/index.tsx
```

(Its logic is superseded screen-by-screen through Task 15; the file is gone now so Expo Router doesn't have two competing `/` routes once `(tabs)/index.tsx` exists below.)

- [ ] **Step 6: Rewrite the root layout with the auth gate**

Replace `src/app/_layout.tsx`:

```tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, loading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 7: Add the auth stack layout**

Create `src/app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

(`login.tsx` and `signup.tsx` are added in Task 7 — this layout renders fine with no screens yet since Expo Router discovers them by filename.)

- [ ] **Step 8: Add the tabs layout**

Create `src/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Palette.primary,
        tabBarInactiveTintColor: Palette.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 248, 243, 0.95)',
          borderTopColor: 'rgba(199, 199, 188, 0.2)',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'call' : 'call-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'leaf' : 'leaf-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 9: Add a shared top app bar style and the 4 tab screens**

Create `src/app/(tabs)/index.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/empty-state';
import { Palette } from '@/constants/theme';

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <EmptyState
        icon="chatbubble-outline"
        title="No chats yet"
        message="Add a contact from Settings to start a conversation."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Palette.onSurface },
});
```

Create `src/app/(tabs)/calls.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/empty-state';
import { Palette } from '@/constants/theme';

export default function CallsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Calls</Text>
      </View>
      <EmptyState icon="call-outline" title="No calls yet" message="Calls you place or receive will show up here." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Palette.onSurface },
});
```

Create `src/app/(tabs)/updates.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/empty-state';
import { Palette } from '@/constants/theme';

export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Updates</Text>
      </View>
      <EmptyState
        icon="leaf-outline"
        title="No updates yet"
        message="Posts from you and your contacts will show up here."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Palette.onSurface },
});
```

Create `src/app/(tabs)/settings.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette } from '@/constants/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Palette.onSurface },
});
```

(`SettingsScreen`'s profile card and nav rows are built in Task 14 — left minimal here since Task 14 replaces the body entirely and an `EmptyState` doesn't fit a profile screen's shape.)

- [ ] **Step 10: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests from Tasks 1–6 green (no test targets `_layout.tsx` or the tab screens directly; they're covered by the manual verification pass in Task 17 since they depend on live navigation).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add auth-gated root layout and 4-tab Expo Router shell"
```

---

### Task 7: Login and signup screens

**Files:**
- Create: `src/app/(auth)/login.tsx`
- Create: `src/app/(auth)/signup.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `@/providers/auth-provider` (`signIn`, `signUp`, `loading`).
- Produces: reachable `/login` and `/signup` routes the root layout (Task 6) redirects to when there's no session.

- [ ] **Step 1: Write the login screen**

Create `src/app/(auth)/login.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { Palette } from '@/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Welcome back</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={Palette.outline}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={Palette.outline}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !email.trim() || !password}
      >
        <Text style={styles.buttonText}>{submitting ? 'Signing in...' : 'Sign in'}</Text>
      </TouchableOpacity>

      <Link href="/signup" style={styles.link}>
        <Text style={styles.linkText}>Don&apos;t have an account? Sign up</Text>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: Palette.onSurface, marginBottom: 12 },
  error: { color: Palette.error, fontSize: 13 },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: 16,
    color: Palette.onSurface,
  },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Palette.onPrimary, fontWeight: '600', fontSize: 15 },
  link: { alignSelf: 'center', marginTop: 16 },
  linkText: { color: Palette.secondary, fontSize: 13, fontWeight: '600' },
});
```

- [ ] **Step 2: Write the signup screen**

Create `src/app/(auth)/signup.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { Palette } from '@/constants/theme';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = displayName.trim() && username.trim() && email.trim() && password.length >= 6;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error: signUpError } = await signUp(
      email.trim(),
      password,
      username.trim().toLowerCase(),
      displayName.trim()
    );
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Create your account</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Display name"
        placeholderTextColor={Palette.outline}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={Palette.outline}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={Palette.outline}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min. 6 characters)"
        placeholderTextColor={Palette.outline}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, (submitting || !canSubmit) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !canSubmit}
      >
        <Text style={styles.buttonText}>{submitting ? 'Creating account...' : 'Sign up'}</Text>
      </TouchableOpacity>

      <Link href="/login" style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: Palette.onSurface, marginBottom: 12 },
  error: { color: Palette.error, fontSize: 13 },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: 16,
    color: Palette.onSurface,
  },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Palette.onPrimary, fontWeight: '600', fontSize: 15 },
  link: { alignSelf: 'center', marginTop: 16 },
  linkText: { color: Palette.secondary, fontSize: 13, fontWeight: '600' },
});
```

- [ ] **Step 3: Manually verify the auth flow**

Run the Preview tool against `expo start --web`. Confirm:
1. Loading the app with no session redirects to `/login`.
2. Tapping "Don't have an account? Sign up" navigates to `/signup`.
3. Submitting signup with a fresh email/username lands on the Chats tab (empty state from Task 6).
4. Signing out (once Task 14 adds a sign-out button — for now, verify by clearing the app's storage and reloading) returns to `/login`.

Expected: no console errors in `preview_console_logs`, no failed requests in `preview_network` other than expected 4xx if you intentionally re-test a duplicate signup.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/login.tsx src/app/\(auth\)/signup.tsx
git commit -m "feat: add login and signup screens"
```

---

### Task 8: Presence hook

**Files:**
- Create: `src/hooks/use-presence.ts`
- Create: `src/hooks/use-presence.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase`, `useAuth` from `@/providers/auth-provider`.
- Produces: `usePresence()` returning `{ onlineUserIds: Set<string>; isOnline: (userId: string) => boolean }`, consumed by Tasks 9 and 11.

- [ ] **Step 1: Write failing tests**

Create `src/hooks/use-presence.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { usePresence } from './use-presence';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockChannel = supabase.channel as jest.Mock;

function createFakeChannel() {
  const handlers: Record<string, () => void> = {};
  const presenceState: Record<string, unknown[]> = {};

  const channel = {
    on: jest.fn((_type: string, _filter: { event: string }, handler: () => void) => {
      handlers.sync = handler;
      return channel;
    }),
    subscribe: jest.fn((callback: (status: string) => void) => {
      callback('SUBSCRIBED');
      return channel;
    }),
    track: jest.fn().mockResolvedValue({}),
    presenceState: jest.fn(() => presenceState),
    __handlers: handlers,
    __presenceState: presenceState,
  };

  return channel;
}

describe('usePresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty online set when there is no session', async () => {
    mockUseAuth.mockReturnValue({ session: null });
    const { result } = await renderHook(() => usePresence());
    expect(result.current.isOnline('someone')).toBe(false);
  });

  it('tracks presence and reflects the synced state once subscribed', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'me' } } });
    const channel = createFakeChannel();
    channel.__presenceState['contact-1'] = [{ online_at: '2026-07-06T00:00:00Z' }];
    mockChannel.mockReturnValue(channel);

    const { result } = await renderHook(() => usePresence());

    await waitFor(() => {
      channel.__handlers.sync();
      expect(result.current.isOnline('contact-1')).toBe(true);
    });

    expect(channel.track).toHaveBeenCalledWith(expect.objectContaining({ online_at: expect.any(String) }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-presence.test.ts`
Expected: FAIL — `./use-presence` doesn't exist yet.

- [ ] **Step 3: Write the hook**

Create `src/hooks/use-presence.ts`:

```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const PRESENCE_CHANNEL = 'online-users';

export function usePresence() {
  const { session } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session) {
      setOnlineUserIds(new Set());
      return;
    }

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: session.user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlineUserIds(new Set(Object.keys(state)));
    });

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const isOnline = (userId: string) => onlineUserIds.has(userId);

  return { onlineUserIds, isOnline };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-presence.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-presence.ts src/hooks/use-presence.test.ts
git commit -m "feat: add Realtime presence hook for online/last-seen"
```

---

### Task 9: Chats list hook and screen

**Files:**
- Create: `src/hooks/use-chats.ts`
- Create: `src/hooks/use-chats.test.ts`
- Modify: `src/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `supabase`, `useAuth`, `usePresence`, `ChatListItem`/`Message`/`Profile` types.
- Produces: `useChats()` returning `{ chats: ChatListItem[]; loading: boolean; error: string | null; refresh: () => Promise<void> }`, consumed only by `(tabs)/index.tsx` here, and referenced by name in Task 11 (tapping a chat row navigates to `chat/[id]`).

- [ ] **Step 1: Write failing tests**

Create `src/hooks/use-chats.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useChats } from './use-chats';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe('useChats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ session: { user: { id: 'me' } } });
  });

  it('maps conversation_participants rows into ChatListItem entries', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_participants') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ conversation_id: 'conv-1' }],
            error: null,
          }),
        };
      }
      if (table === 'conversations') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'conv-1',
                conversation_participants: [
                  { user_id: 'me' },
                  {
                    user_id: 'them',
                    profiles: {
                      id: 'them',
                      username: 'sarah',
                      display_name: 'Sarah Jenkins',
                      avatar_url: null,
                      status_message: null,
                    },
                  },
                ],
                messages: [{ id: 'm1', conversation_id: 'conv-1', sender_id: 'them', text: 'Hey!', created_at: '2026-07-06T10:00:00Z', read_at: null }],
              },
            ],
            error: null,
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const { result } = await renderHook(() => useChats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chats).toHaveLength(1);
    expect(result.current.chats[0].conversationId).toBe('conv-1');
    expect(result.current.chats[0].contact.username).toBe('sarah');
    expect(result.current.chats[0].lastMessage?.text).toBe('Hey!');
  });

  it('surfaces an error message when the query fails', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'network error' } }),
    }));

    const { result } = await renderHook(() => useChats());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network error');
    expect(result.current.chats).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-chats.test.ts`
Expected: FAIL — `./use-chats` doesn't exist yet.

- [ ] **Step 3: Write the hook**

Create `src/hooks/use-chats.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { ChatListItem, Message, Profile } from '@/types/database';

interface ParticipantRow {
  user_id: string;
  profiles?: Profile;
}

interface ConversationRow {
  id: string;
  conversation_participants: ParticipantRow[];
  messages: Message[];
}

export function useChats() {
  const { session } = useAuth();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: participantRows, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', session.user.id);

    if (participantError) {
      setError(participantError.message);
      setChats([]);
      setLoading(false);
      return;
    }

    const conversationIds = (participantRows ?? []).map((row: { conversation_id: string }) => row.conversation_id);
    if (conversationIds.length === 0) {
      setChats([]);
      setLoading(false);
      return;
    }

    const { data, error: conversationsError } = await supabase
      .from('conversations')
      .select(
        'id, conversation_participants(user_id, profiles(*)), messages(id, conversation_id, sender_id, text, created_at, read_at)'
      )
      .in('id', conversationIds);

    if (conversationsError) {
      setError(conversationsError.message);
      setChats([]);
      setLoading(false);
      return;
    }

    const items: ChatListItem[] = (data as ConversationRow[]).map((conv) => {
      const other = conv.conversation_participants.find((p) => p.user_id !== session.user.id);
      const messages = [...conv.messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const unreadCount = messages.filter((m) => m.sender_id !== session.user.id && !m.read_at).length;

      return {
        conversationId: conv.id,
        contact: other?.profiles as Profile,
        lastMessage,
        unreadCount,
      };
    });

    setChats(items);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`chat-list-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, load]);

  return { chats, loading, error, refresh: load };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-chats.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire the screen to real data**

Replace `src/app/(tabs)/index.tsx`:

```tsx
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
```

- [ ] **Step 6: Manually verify**

With two test accounts signed up (via `/signup`) and a contact relationship + conversation created directly through `execute_sql` for now (Task 10 adds the UI for this), confirm in the Preview tool that the Chats tab lists the conversation with the right name, last message, and unread badge, and that sending a message from the other account (via `execute_sql` insert into `messages`) live-updates the row without a manual refresh.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-chats.ts src/hooks/use-chats.test.ts src/app/\(tabs\)/index.tsx
git commit -m "feat: wire Chats tab to Supabase conversations and Realtime updates"
```

---

### Task 10: Contacts hook and Add Contact screen

**Files:**
- Create: `src/hooks/use-contacts.ts`
- Create: `src/hooks/use-contacts.test.ts`
- Create: `src/app/contacts/add.tsx`

**Interfaces:**
- Consumes: `supabase`, `useAuth`, `Profile`/`ContactWithProfile` types.
- Produces: `useContacts()` returning `{ contacts: ContactWithProfile[]; loading: boolean; searchByUsername: (query: string) => Promise<Profile[]>; addContact: (contactId: string) => Promise<{ error: string | null }>; startConversation: (contactId: string) => Promise<{ conversationId: string | null; error: string | null }> }`. `startConversation` is reused nowhere else in this plan but is the function the Add Contact screen calls to jump straight into `chat/[id]`.

- [ ] **Step 1: Write failing tests**

Create `src/hooks/use-contacts.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useContacts } from './use-contacts';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe('useContacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ session: { user: { id: 'me' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
  });

  it('searchByUsername queries profiles with an ilike filter, excluding the current user', async () => {
    const neq = jest.fn().mockResolvedValue({
      data: [{ id: 'them', username: 'sarah', display_name: 'Sarah Jenkins' }],
      error: null,
    });
    const ilike = jest.fn().mockReturnValue({ neq });
    mockFrom.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('profiles');
      return { select: jest.fn().mockReturnThis(), ilike };
    });

    const { result } = await renderHook(() => useContacts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let found: unknown;
    await act(async () => {
      found = await result.current.searchByUsername('sar');
    });

    expect(ilike).toHaveBeenCalledWith('username', '%sar%');
    expect(neq).toHaveBeenCalledWith('id', 'me');
    expect(found).toEqual([{ id: 'them', username: 'sarah', display_name: 'Sarah Jenkins' }]);
  });

  it('addContact inserts an owner_id/contact_id row', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }), insert };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const { result } = await renderHook(() => useContacts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } | undefined;
    await act(async () => {
      response = await result.current.addContact('them');
    });

    expect(insert).toHaveBeenCalledWith({ owner_id: 'me', contact_id: 'them' });
    expect(response?.error).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-contacts.test.ts`
Expected: FAIL — `./use-contacts` doesn't exist yet.

- [ ] **Step 3: Write the hook**

Create `src/hooks/use-contacts.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { ContactWithProfile, Profile } from '@/types/database';

export function useContacts() {
  const { session } = useAuth();
  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('contacts')
      .select('owner_id, contact_id, created_at, profile:profiles!contacts_contact_id_fkey(*)')
      .eq('owner_id', session.user.id);
    setContacts((data ?? []) as unknown as ContactWithProfile[]);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const searchByUsername = useCallback(
    async (query: string): Promise<Profile[]> => {
      if (!session || !query.trim()) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query.trim()}%`)
        .neq('id', session.user.id);
      if (error) return [];
      return (data ?? []) as Profile[];
    },
    [session]
  );

  const addContact = useCallback(
    async (contactId: string): Promise<{ error: string | null }> => {
      if (!session) return { error: 'Not signed in.' };
      const { error } = await supabase.from('contacts').insert({ owner_id: session.user.id, contact_id: contactId });
      if (error) return { error: error.message };
      await load();
      return { error: null };
    },
    [session, load]
  );

  const startConversation = useCallback(
    async (contactId: string): Promise<{ conversationId: string | null; error: string | null }> => {
      if (!session) return { conversationId: null, error: 'Not signed in.' };

      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', session.user.id);

      const myConversationIds = (existing ?? []).map((row: { conversation_id: string }) => row.conversation_id);

      if (myConversationIds.length > 0) {
        const { data: shared } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', contactId)
          .in('conversation_id', myConversationIds);

        if (shared && shared.length > 0) {
          return { conversationId: shared[0].conversation_id, error: null };
        }
      }

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({})
        .select('id')
        .single();

      if (conversationError || !conversation) {
        return { conversationId: null, error: conversationError?.message ?? 'Could not start conversation.' };
      }

      const { error: participantsError } = await supabase.from('conversation_participants').insert([
        { conversation_id: conversation.id, user_id: session.user.id },
        { conversation_id: conversation.id, user_id: contactId },
      ]);

      if (participantsError) {
        return { conversationId: null, error: participantsError.message };
      }

      return { conversationId: conversation.id, error: null };
    },
    [session]
  );

  return { contacts, loading, searchByUsername, addContact, startConversation };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-contacts.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the Add Contact screen**

Create `src/app/contacts/add.tsx`:

```tsx
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
```

- [ ] **Step 6: Register the route with the root Stack**

`src/app/_layout.tsx`'s `<Slot />` already renders any file under `src/app/`, so `contacts/add.tsx` is reachable at `/contacts/add` with no further wiring — confirm this by navigating to it from the Preview tool once Task 14 adds the "Add contact" row in Settings (or navigate directly via the URL bar in the web preview for now).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-contacts.ts src/hooks/use-contacts.test.ts src/app/contacts/add.tsx
git commit -m "feat: add contact search/add hook and Add Contact screen"
```

---

### Task 11: Messages hook and conversation screen

**Files:**
- Create: `src/hooks/use-messages.ts`
- Create: `src/hooks/use-messages.test.ts`
- Create: `src/app/chat/[id].tsx`

**Interfaces:**
- Consumes: `supabase`, `useAuth`, `usePresence`, `Message` type.
- Produces: `useMessages(conversationId: string)` returning `{ messages: OptimisticMessage[]; loading: boolean; error: string | null; sendText: (text: string) => Promise<void>; retry: (localId: string) => Promise<void> }`, where `OptimisticMessage = Message & { status: 'sent' | 'pending' | 'failed' }`.

- [ ] **Step 1: Write failing tests**

Create `src/hooks/use-messages.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMessages } from './use-messages';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFrom = supabase.from as jest.Mock;
const mockChannel = supabase.channel as jest.Mock;

function fakeChannel() {
  return {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  };
}

describe('useMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ session: { user: { id: 'me' } } });
    mockChannel.mockReturnValue(fakeChannel());
  });

  it('loads messages for the given conversation ordered by created_at', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { id: 'm1', conversation_id: 'conv-1', sender_id: 'them', text: 'Hi', created_at: '2026-07-06T10:00:00Z', read_at: null },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order,
      insert: jest.fn(),
    });

    const { result } = await renderHook(() => useMessages('conv-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].status).toBe('sent');
  });

  it('sendText adds a pending message, then marks it sent on success', async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'm2', conversation_id: 'conv-1', sender_id: 'me', text: 'Hello', created_at: '2026-07-06T10:05:00Z', read_at: null },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order,
      insert,
    });

    const { result } = await renderHook(() => useMessages('conv-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.sendText('Hello');
    });

    expect(insert).toHaveBeenCalledWith({ conversation_id: 'conv-1', sender_id: 'me', text: 'Hello' });
    expect(result.current.messages.some((m) => m.text === 'Hello' && m.status === 'sent')).toBe(true);
  });

  it('retry resends a failed message and marks it sent again on success', async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const insert = jest
      .fn()
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'network error' } }),
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'm3', conversation_id: 'conv-1', sender_id: 'me', text: 'Retry me', created_at: '2026-07-06T10:06:00Z', read_at: null },
            error: null,
          }),
        }),
      });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order,
      insert,
    });

    const { result } = await renderHook(() => useMessages('conv-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.sendText('Retry me');
    });
    const failedId = result.current.messages.find((m) => m.text === 'Retry me')?.id;
    expect(result.current.messages.find((m) => m.text === 'Retry me')?.status).toBe('failed');

    await act(async () => {
      await result.current.retry(failedId as string);
    });

    expect(insert).toHaveBeenCalledTimes(2);
    expect(result.current.messages.find((m) => m.text === 'Retry me')?.status).toBe('sent');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-messages.test.ts`
Expected: FAIL — `./use-messages` doesn't exist yet.

- [ ] **Step 3: Write the hook**

Create `src/hooks/use-messages.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { Message } from '@/types/database';

export type OptimisticMessage = Message & { status: 'sent' | 'pending' | 'failed' };

export function useMessages(conversationId: string) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setMessages((data as Message[]).map((m) => ({ ...m, status: 'sent' as const })));
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: { new: Message }) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, { ...payload.new, status: 'sent' }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const insertAndResolve = useCallback(
    async (localId: string, text: string) => {
      if (!session) return;

      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: session.user.id, text })
        .select()
        .single();

      setMessages((prev) => {
        if (sendError || !data) {
          return prev.map((m) => (m.id === localId ? { ...m, status: 'failed' } : m));
        }
        return prev.map((m) => (m.id === localId ? { ...(data as Message), status: 'sent' } : m));
      });
    },
    [session, conversationId]
  );

  const sendText = useCallback(
    async (text: string) => {
      if (!session || !text.trim()) return;

      const localId = `local-${Date.now()}`;
      const pending: OptimisticMessage = {
        id: localId,
        conversation_id: conversationId,
        sender_id: session.user.id,
        text: text.trim(),
        created_at: new Date().toISOString(),
        read_at: null,
        status: 'pending',
      };
      setMessages((prev) => [...prev, pending]);
      await insertAndResolve(localId, text.trim());
    },
    [session, conversationId, insertAndResolve]
  );

  const retry = useCallback(
    async (localId: string) => {
      const target = messages.find((m) => m.id === localId);
      if (!target || target.status !== 'failed') return;

      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, status: 'pending' } : m)));
      await insertAndResolve(localId, target.text);
    },
    [messages, insertAndResolve]
  );

  return { messages, loading, error, sendText, retry };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-messages.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the conversation screen**

Create `src/app/chat/[id].tsx`:

```tsx
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
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests from Tasks 1–11.

- [ ] **Step 7: Manually verify realtime delivery**

With two accounts open in two Preview browser tabs (or one web tab + one Expo Go device) in the same conversation, confirm a message sent from one appears in the other within a second or two without reloading, and that the sending side shows "Sending…" then the bubble settles once the Realtime echo confirms the insert.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/use-messages.ts src/hooks/use-messages.test.ts src/app/chat/\[id\].tsx
git commit -m "feat: add Realtime messages hook and conversation screen"
```

---

### Task 12: Calls hook and screen

**Files:**
- Create: `src/hooks/use-calls.ts`
- Create: `src/hooks/use-calls.test.ts`
- Modify: `src/app/(tabs)/calls.tsx`

**Interfaces:**
- Consumes: `supabase`, `useAuth`, `Call`/`Profile` types.
- Produces: `useCalls()` returning `{ calls: (Call & { otherUser: Profile })[]; loading: boolean; error: string | null; logCall: (calleeId: string) => Promise<void> }`.

- [ ] **Step 1: Write failing tests**

Create `src/hooks/use-calls.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCalls } from './use-calls';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe('useCalls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ session: { user: { id: 'me' } } });
  });

  it('loads calls where the user is caller or callee, newest first', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'c1',
          caller_id: 'me',
          callee_id: 'them',
          direction: 'outgoing',
          created_at: '2026-07-06T10:00:00Z',
          callee: { id: 'them', display_name: 'Sarah Jenkins' },
          caller: { id: 'me', display_name: 'Me' },
        },
      ],
      error: null,
    });
    const or = jest.fn().mockReturnValue({ order });
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnThis(), or });

    const { result } = await renderHook(() => useCalls());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(or).toHaveBeenCalledWith('caller_id.eq.me,callee_id.eq.me');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.calls[0].otherUser.display_name).toBe('Sarah Jenkins');
  });

  it('logCall inserts an outgoing call row for the current user', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnValue({ order: jest.fn().mockResolvedValue({ data: [], error: null }) }),
      insert,
    });

    const { result } = await renderHook(() => useCalls());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logCall('them');
    });

    expect(insert).toHaveBeenCalledWith({ caller_id: 'me', callee_id: 'them', direction: 'outgoing' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-calls.test.ts`
Expected: FAIL — `./use-calls` doesn't exist yet.

- [ ] **Step 3: Write the hook**

Create `src/hooks/use-calls.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { Call, Profile } from '@/types/database';

type CallWithProfiles = Call & { caller: Profile; callee: Profile };
export type CallWithOtherUser = Call & { otherUser: Profile };

export function useCalls() {
  const { session } = useAuth();
  const [calls, setCalls] = useState<CallWithOtherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setCalls([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('calls')
      .select('*, caller:profiles!calls_caller_id_fkey(*), callee:profiles!calls_callee_id_fkey(*)')
      .or(`caller_id.eq.${session.user.id},callee_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setCalls([]);
      setLoading(false);
      return;
    }

    const mapped = (data as CallWithProfiles[]).map((row) => ({
      ...row,
      otherUser: row.caller_id === session.user.id ? row.callee : row.caller,
    }));
    setCalls(mapped);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const logCall = useCallback(
    async (calleeId: string) => {
      if (!session) return;
      await supabase.from('calls').insert({ caller_id: session.user.id, callee_id: calleeId, direction: 'outgoing' });
      await load();
    },
    [session, load]
  );

  return { calls, loading, error, logCall };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-calls.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire the screen**

Replace `src/app/(tabs)/calls.tsx`:

```tsx
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
```

`logCall` is exposed by the hook for a future "call" button (e.g. from a contact's profile) but this screen itself only ever displays history, per the spec's decision that the Calls tab is a real log with no live calling UI to trigger from here.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-calls.ts src/hooks/use-calls.test.ts src/app/\(tabs\)/calls.tsx
git commit -m "feat: wire Calls tab to a real call history log"
```

---

### Task 13: Updates hook and screen

**Files:**
- Create: `src/hooks/use-updates.ts`
- Create: `src/hooks/use-updates.test.ts`
- Modify: `src/app/(tabs)/updates.tsx`

**Interfaces:**
- Consumes: `supabase`, `useAuth`, `useContacts` (for the contact-id list used in the visibility filter is enforced server-side by RLS, so the hook simply selects `updates_posts` and lets Postgres return only rows the signed-in user is allowed to see), `UpdatePost`/`Profile` types.
- Produces: `useUpdates()` returning `{ posts: (UpdatePost & { author: Profile })[]; loading: boolean; error: string | null; createPost: (text: string) => Promise<{ error: string | null }> }`.

Scope note: this task builds a **text-only** composer. The `image_url` column exists in the schema for future use but no image picker/upload is built in this plan (kept out per the Global Constraints' non-goals).

- [ ] **Step 1: Write failing tests**

Create `src/hooks/use-updates.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUpdates } from './use-updates';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe('useUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ session: { user: { id: 'me' } } });
  });

  it('loads posts newest first with the author profile joined', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'p1',
          user_id: 'them',
          text: 'Excited for the launch!',
          image_url: null,
          created_at: '2026-07-06T09:00:00Z',
          author: { id: 'them', display_name: 'Sarah Jenkins' },
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnThis(), order });

    const { result } = await renderHook(() => useUpdates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.posts[0].author.display_name).toBe('Sarah Jenkins');
  });

  it('createPost inserts a text-only post for the current user', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert,
    });

    const { result } = await renderHook(() => useUpdates());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } | undefined;
    await act(async () => {
      response = await result.current.createPost('Shipped it!');
    });

    expect(insert).toHaveBeenCalledWith({ user_id: 'me', text: 'Shipped it!' });
    expect(response?.error).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-updates.test.ts`
Expected: FAIL — `./use-updates` doesn't exist yet.

- [ ] **Step 3: Write the hook**

Create `src/hooks/use-updates.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { Profile, UpdatePost } from '@/types/database';

export type UpdatePostWithAuthor = UpdatePost & { author: Profile };

export function useUpdates() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<UpdatePostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('updates_posts')
      .select('*, author:profiles!updates_posts_user_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setPosts([]);
      setLoading(false);
      return;
    }

    setPosts(data as UpdatePostWithAuthor[]);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const createPost = useCallback(
    async (text: string): Promise<{ error: string | null }> => {
      if (!session || !text.trim()) return { error: 'Write something first.' };
      const { error: insertError } = await supabase.from('updates_posts').insert({ user_id: session.user.id, text: text.trim() });
      if (insertError) return { error: insertError.message };
      await load();
      return { error: null };
    },
    [session, load]
  );

  return { posts, loading, error, createPost };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-updates.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire the screen**

Replace `src/app/(tabs)/updates.tsx`:

```tsx
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
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-updates.ts src/hooks/use-updates.test.ts src/app/\(tabs\)/updates.tsx
git commit -m "feat: wire Updates tab to persistent text posts"
```

---

### Task 14: Settings screen and Edit Profile screen

**Files:**
- Modify: `src/app/(tabs)/settings.tsx`
- Create: `src/app/settings/profile.tsx`

**Interfaces:**
- Consumes: `useAuth` (`profile`, `signOut`, `refreshProfile`), `supabase`.
- Produces: the Settings screen's profile card, nav rows (Account/Privacy/Notifications/Storage & Data/Appearance/Help — the last four are non-functional rows this phase, matching the mockup's visual structure without over-building screens nobody asked for), an "Add contact" row that pushes `/contacts/add`, and a working "Log out" action. `settings/profile.tsx` lets the user edit `display_name` and `status_message`.

- [ ] **Step 1: Replace the Settings screen**

Replace `src/app/(tabs)/settings.tsx`:

```tsx
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { Palette } from '@/constants/theme';

const NAV_ROWS: { key: string; label: string; icon: keyof typeof Feather.glyphMap; onPress?: () => void }[] = [
  { key: 'add-contact', label: 'Add contact', icon: 'user-plus', onPress: () => router.push('/contacts/add') },
  { key: 'account', label: 'Account', icon: 'user' },
  { key: 'privacy', label: 'Privacy', icon: 'lock', onPress: () => router.push('/settings/privacy') },
  { key: 'notifications', label: 'Notifications', icon: 'bell' },
  { key: 'storage', label: 'Storage & Data', icon: 'database' },
  { key: 'appearance', label: 'Appearance', icon: 'aperture' },
  { key: 'help', label: 'Help', icon: 'help-circle' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.profileCard}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{profile?.display_name.charAt(0) ?? '?'}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile?.display_name ?? 'Loading…'}</Text>
        {profile?.status_message && <Text style={styles.status}>{profile.status_message}</Text>}
        <TouchableOpacity style={styles.viewProfileBtn} onPress={() => router.push('/settings/profile')}>
          <Text style={styles.viewProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navGroup}>
        {NAV_ROWS.map((row) => (
          <TouchableOpacity key={row.key} style={styles.navRow} onPress={row.onPress} activeOpacity={row.onPress ? 0.7 : 1}>
            <View style={styles.navIcon}>
              <Feather name={row.icon} size={20} color={Palette.primary} />
            </View>
            <Text style={styles.navLabel}>{row.label}</Text>
            <Feather name="chevron-right" size={18} color={Palette.outlineVariant} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutRow} onPress={signOut}>
        <Feather name="log-out" size={18} color={Palette.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: Palette.onSurface },
  profileCard: { alignItems: 'center', marginVertical: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: Palette.surfaceContainerHigh },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: '700', color: Palette.onPrimaryContainer },
  name: { fontSize: 22, fontWeight: '700', color: Palette.onSurface, marginTop: 12 },
  status: { fontSize: 13, color: Palette.onSurfaceVariant, marginTop: 4 },
  viewProfileBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: Palette.primary,
    borderRadius: 20,
  },
  viewProfileText: { fontSize: 14, fontWeight: '600', color: Palette.onPrimary },
  navGroup: {
    marginHorizontal: 24,
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 4,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Palette.champagneSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  navLabel: { fontSize: 15, fontWeight: '600', color: Palette.onSurface, flex: 1 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
  },
  logoutText: { color: Palette.error, fontWeight: '600', fontSize: 14 },
});
```

- [ ] **Step 2: Write the Edit Profile screen**

Create `src/app/settings/profile.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Palette } from '@/constants/theme';

export default function EditProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [statusMessage, setStatusMessage] = useState(profile?.status_message ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), status_message: statusMessage.trim() || null })
      .eq('id', session.user.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshProfile();
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit Profile' }} />

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />

      <Text style={styles.label}>Status message</Text>
      <TextInput
        style={styles.input}
        value={statusMessage}
        onChangeText={setStatusMessage}
        placeholder="Hey there! I'm using WhatsApp."
        placeholderTextColor={Palette.outline}
      />

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background, padding: 24, gap: 8 },
  error: { color: Palette.error },
  label: { fontSize: 12, fontWeight: '700', color: Palette.onSurfaceVariant, marginTop: 12 },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: 16,
    color: Palette.onSurface,
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Palette.onPrimary, fontWeight: '600', fontSize: 15 },
});
```

- [ ] **Step 3: Manually verify**

In the Preview tool: open Settings, confirm the signed-in profile's name/status render, tap "Edit Profile", change the display name, save, and confirm the Settings screen reflects the new name immediately. Tap "Logout" and confirm you're redirected to `/login`.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(tabs\)/settings.tsx src/app/settings/profile.tsx
git commit -m "feat: wire Settings screen to the real profile, add Edit Profile screen"
```

---

### Task 15: Privacy & Security screen

**Files:**
- Create: `src/app/settings/privacy.tsx`

**Interfaces:**
- Consumes: `useAuth` (`profile`, `refreshProfile`), `supabase`. Writes to the `read_receipts_enabled`, `last_seen_visibility`, `profile_photo_visibility` columns added on `profiles` in Task 3.

- [ ] **Step 1: Write the screen**

Create `src/app/settings/privacy.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Palette } from '@/constants/theme';
import type { Profile } from '@/types/database';

const VISIBILITY_CYCLE: Profile['last_seen_visibility'][] = ['everyone', 'contacts', 'nobody'];

function nextVisibility(current: Profile['last_seen_visibility']) {
  const index = VISIBILITY_CYCLE.indexOf(current);
  return VISIBILITY_CYCLE[(index + 1) % VISIBILITY_CYCLE.length];
}

function labelFor(value: Profile['last_seen_visibility']) {
  if (value === 'everyone') return 'Everyone';
  if (value === 'contacts') return 'My Contacts';
  return 'Nobody';
}

export default function PrivacyScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!session) return;
    setSaving(true);
    await supabase.from('profiles').update(patch).eq('id', session.user.id);
    await refreshProfile();
    setSaving(false);
  };

  if (!profile) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Privacy & Security' }} />

      <Text style={styles.sectionTitle}>Privacy</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrapper}>
            <MaterialIcons name="done-all" size={20} color={Palette.onSecondaryContainer} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Read Receipts</Text>
            <Text style={styles.rowSub}>If turned off, you won&apos;t send or receive Read Receipts.</Text>
          </View>
          <Switch
            value={profile.read_receipts_enabled}
            disabled={saving}
            onValueChange={(value) => updateProfile({ read_receipts_enabled: value })}
            trackColor={{ false: Palette.outlineVariant, true: Palette.primaryContainer }}
            thumbColor={profile.read_receipts_enabled ? Palette.primary : Palette.onPrimary}
          />
        </View>

        <TouchableOpacity
          style={styles.row}
          disabled={saving}
          onPress={() => updateProfile({ last_seen_visibility: nextVisibility(profile.last_seen_visibility) })}
        >
          <View style={styles.iconWrapper}>
            <Feather name="clock" size={20} color={Palette.onSecondaryContainer} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Last Seen</Text>
            <Text style={styles.rowSub}>{labelFor(profile.last_seen_visibility)}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={Palette.outlineVariant} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          disabled={saving}
          onPress={() => updateProfile({ profile_photo_visibility: nextVisibility(profile.profile_photo_visibility) })}
        >
          <View style={styles.iconWrapper}>
            <Feather name="user" size={20} color={Palette.onSecondaryContainer} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Profile Photo visibility</Text>
            <Text style={styles.rowSub}>{labelFor(profile.profile_photo_visibility)}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={Palette.outlineVariant} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  card: { backgroundColor: Palette.surfaceContainerLow, borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.outlineVariant,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.champagneSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rowText: { flex: 1, paddingRight: 8 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Palette.onSurface },
  rowSub: { fontSize: 12, color: Palette.onSurfaceVariant, marginTop: 2 },
});
```

Note: "Two-Step Verification" and "Blocked Contacts" from the mockup are left out of this pass — they're non-functional rows with no backing data model, and per YAGNI they're deferred until a task actually needs them rather than shipping dead UI. The three rows above (Read Receipts, Last Seen, Profile Photo visibility) are the only ones with a real column to back them.

- [ ] **Step 2: Manually verify**

In the Preview tool, navigate Settings → Privacy, toggle Read Receipts and confirm it persists after reloading the app, and tap Last Seen / Profile Photo visibility a few times to confirm they cycle through Everyone → My Contacts → Nobody and persist too.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/privacy.tsx
git commit -m "feat: add Privacy & Security screen backed by real profile columns"
```

---

### Task 16: Remove superseded template files

**Files:**
- Delete: `src/app/explore.tsx`
- Delete: `src/components/app-tabs.tsx`
- Delete: `src/components/app-tabs.web.tsx`
- Delete: `src/components/animated-icon.tsx`
- Delete: `src/components/animated-icon.web.tsx`
- Delete: `src/components/animated-icon.module.css`
- Delete: `src/components/web-badge.tsx`
- Delete: `src/components/external-link.tsx`
- Delete: `src/components/hint-row.tsx`
- Modify: `app.json`

**Interfaces:**
- No interfaces produced — this is dead-code removal made possible by the Task 6 router restructure (these files were the default Expo template's tab bar and its "Explore" tab, both fully superseded by `(tabs)/_layout.tsx`).

- [ ] **Step 1: Confirm nothing still imports the files being removed**

Run: `git grep -l "app-tabs\|animated-icon\|web-badge\|external-link\|hint-row\|from '@/app/explore'" -- 'src/**/*.tsx' 'src/**/*.ts'`
Expected: no output (if anything still references these files, stop and investigate before deleting).

- [ ] **Step 2: Delete the files**

```bash
git rm src/app/explore.tsx
git rm src/components/app-tabs.tsx src/components/app-tabs.web.tsx
git rm src/components/animated-icon.tsx src/components/animated-icon.web.tsx src/components/animated-icon.module.css
git rm src/components/web-badge.tsx src/components/external-link.tsx src/components/hint-row.tsx
```

- [ ] **Step 3: Update app branding**

In `app.json`, change the `"name"` field from `"whatsapp-app"` to a display name, and update `"description"` if one exists. Update:

```json
"name": "Messenger"
```

(Leave `"slug"` and `"scheme"` untouched — changing them would break the existing `whatsappapp://` deep link scheme other tasks assume. Icon/splash asset replacement is out of scope for this plan — flag it to the user as a follow-up if they want custom branding assets.)

- [ ] **Step 4: Run the full test suite and typecheck**

Run: `npm test`
Expected: PASS — no test referenced the deleted files.

Run: `npx tsc --noEmit`
Expected: no errors (confirms no remaining import of a deleted file).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove superseded default-template files, update app display name"
```

---

### Task 17: Manual end-to-end verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Start the app**

Use the Preview tool's `preview_start` against the `web` launch config (add one to `.claude/launch.json` if missing: `{ "name": "web", "runtimeExecutable": "npm", "runtimeArgs": ["run", "web"], "port": 8081 }`).

- [ ] **Step 2: Walk the full golden path with two accounts**

1. Sign up as Account A, sign up as Account B (second browser tab or Expo Go device).
2. From Account A's Settings, add Account B by username; confirm it navigates straight into a conversation.
3. Send a message from A, confirm it appears live on B without reloading; reply from B, confirm it appears live on A.
4. From A, use `logCall` indirectly isn't wired to a UI button in this plan — instead confirm the Calls tab is empty until you call the Supabase MCP `execute_sql` tool to insert one test row, then confirm it shows up (real backend, not mock).
5. Post an Update from A, confirm it's visible in B's Updates feed (since B added A as a contact via the mutual add in step 2 — check both directions: does `contacts` need a row in both directions for both to see each other's posts? The RLS policy on `updates_posts` checks `is_contact(auth.uid(), user_id)`, i.e. **the viewer** must have added the poster as a contact — confirm B explicitly added A as a contact too, not just A adding B, otherwise B's Updates feed won't include A's posts).
6. In Settings, edit the profile display name and confirm it updates; toggle Privacy settings and confirm they persist across a reload; log out and confirm redirect to `/login`.

- [ ] **Step 3: Check for runtime errors**

Run `preview_console_logs` with `level: "error"` and `preview_network` with `filter: "failed"` throughout the walkthrough above.
Expected: no unexpected errors (RLS-denied requests you intentionally triggered while testing, like step 5's one-directional-contact case, are expected and fine).

- [ ] **Step 4: Device-only checks (not coverable via the web preview)**

Talk the user through, or perform via an emulator/Expo Go if available:
1. Android hardware back button from a conversation screen returns to the Chats tab, not out of the app.
2. Opening a `whatsappapp://chat/<id>` deep link (if a conversation id is known) opens directly into that conversation.

- [ ] **Step 5: Report results to the user**

Summarize what was verified end-to-end vs. what still needs the user's own device/emulator check, and list any bugs found for follow-up (do not silently fix major issues found here — surface them and confirm scope before making further changes).
