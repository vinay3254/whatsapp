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
