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
