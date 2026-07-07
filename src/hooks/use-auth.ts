import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  // Distinguishes "profile row hasn't been fetched yet" from "profile is
  // genuinely absent" (profile stays null in both cases) so screens can
  // render a loading state instead of treating an in-flight fetch as a
  // permanently missing profile.
  profileLoading: boolean;
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
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
    profileLoading: false,
  });

  const loadProfile = useCallback(async (userId: string) => {
    setState((s) => ({ ...s, profileLoading: true }));
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setState((s) => ({ ...s, profile: error ? null : (data as Profile), profileLoading: false }));
  }, []);

  useEffect(() => {
    let active = true;
    // Tracks the last session token this effect has already acted on. Supabase's
    // onAuthStateChange can fire more than once for what is functionally the same
    // session (observed here immediately after signInWithPassword, causing an
    // unguarded effect to re-run loadProfile/subscriptions in a tight loop). This
    // makes the handler idempotent per distinct token instead of per event firing.
    let lastToken: string | null = null;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!active) return;
      lastToken = data.session?.access_token ?? null;
      setState((s) => ({ ...s, session: data.session, loading: false }));
      if (data.session) loadProfile(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;
      if (token === lastToken) return;
      lastToken = token;

      setState((s) => ({ ...s, session, loading: false }));
      if (session) loadProfile(session.user.id);
      else setState((s) => ({ ...s, profile: null, profileLoading: false }));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback<AuthActions['signUp']>(
    async (email, password, username, displayName) => {
      // Profile creation happens atomically in a DB trigger (handle_new_user,
      // see supabase/migrations/0003_atomic_signup.sql) keyed off this metadata,
      // rather than as a separate client-side insert after signUp resolves. If
      // the profile insert fails (e.g. a duplicate username), the trigger's
      // exception rolls back the whole transaction, including this auth user —
      // so signup either fully succeeds or leaves no trace, never a half-created
      // account with no profile.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, display_name: displayName } },
      });
      if (error) return { error: error.message };
      if (!data.user) return { error: 'Signup failed. Please try again.' };

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
