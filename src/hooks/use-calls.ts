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
