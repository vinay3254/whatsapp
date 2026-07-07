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

    const items: ChatListItem[] = (data as unknown as ConversationRow[]).map((conv) => {
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
