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
