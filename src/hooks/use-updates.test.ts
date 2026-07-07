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
