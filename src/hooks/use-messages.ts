import { useCallback, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
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
        media_url: null,
        media_type: null,
        media_size_bytes: null,
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
      if (!target || target.status !== 'failed' || target.text === null) return;

      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, status: 'pending' } : m)));
      await insertAndResolve(localId, target.text);
    },
    [messages, insertAndResolve]
  );

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

      const { error: uploadError } = await supabase.storage.from('message-media').upload(path, blob, { contentType });

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

  return { messages, loading, error, sendText, retry, sendMedia };
}
