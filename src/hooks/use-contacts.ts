import { useCallback, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
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

      // Generate the id client-side and insert without .select(): a conversation row
      // is only readable (per RLS) once a conversation_participants row exists for
      // the caller, so requesting the inserted row back (which PostgREST's
      // insert+return does implicitly) fails with "new row violates row-level
      // security policy" for the brief instant between the two inserts.
      const conversationId = Crypto.randomUUID();

      const { error: conversationError } = await supabase
        .from('conversations')
        .insert({ id: conversationId });

      if (conversationError) {
        return { conversationId: null, error: conversationError.message };
      }

      const { error: participantsError } = await supabase.from('conversation_participants').insert([
        { conversation_id: conversationId, user_id: session.user.id },
        { conversation_id: conversationId, user_id: contactId },
      ]);

      if (participantsError) {
        return { conversationId: null, error: participantsError.message };
      }

      return { conversationId, error: null };
    },
    [session]
  );

  return { contacts, loading, searchByUsername, addContact, startConversation };
}
