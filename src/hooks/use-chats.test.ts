import { renderHook, waitFor } from '@testing-library/react-native';
import { useChats } from './use-chats';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe('useChats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ session: { user: { id: 'me' } } });
  });

  it('maps conversation_participants rows into ChatListItem entries', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_participants') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ conversation_id: 'conv-1' }],
            error: null,
          }),
        };
      }
      if (table === 'conversations') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'conv-1',
                conversation_participants: [
                  { user_id: 'me' },
                  {
                    user_id: 'them',
                    profiles: {
                      id: 'them',
                      username: 'sarah',
                      display_name: 'Sarah Jenkins',
                      avatar_url: null,
                      status_message: null,
                    },
                  },
                ],
                messages: [{ id: 'm1', conversation_id: 'conv-1', sender_id: 'them', text: 'Hey!', created_at: '2026-07-06T10:00:00Z', read_at: null }],
              },
            ],
            error: null,
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const { result } = await renderHook(() => useChats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chats).toHaveLength(1);
    expect(result.current.chats[0].conversationId).toBe('conv-1');
    expect(result.current.chats[0].contact.username).toBe('sarah');
    expect(result.current.chats[0].lastMessage?.text).toBe('Hey!');
  });

  it('surfaces an error message when the query fails', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'network error' } }),
    }));

    const { result } = await renderHook(() => useChats());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network error');
    expect(result.current.chats).toEqual([]);
  });
});
