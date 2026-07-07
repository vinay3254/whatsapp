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
