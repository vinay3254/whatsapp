import { renderHook, waitFor } from '@testing-library/react-native';
import { usePresence } from './use-presence';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockChannel = supabase.channel as jest.Mock;

type FakeChannel = {
  on: jest.Mock;
  subscribe: jest.Mock;
  track: jest.Mock;
  presenceState: jest.Mock;
  __handlers: Record<string, () => void>;
  __presenceState: Record<string, unknown[]>;
};

function createFakeChannel(): FakeChannel {
  const handlers: Record<string, () => void> = {};
  const presenceState: Record<string, unknown[]> = {};

  const channel: FakeChannel = {
    on: jest.fn((_type: string, _filter: { event: string }, handler: () => void) => {
      handlers.sync = handler;
      return channel;
    }),
    subscribe: jest.fn((callback: (status: string) => void) => {
      callback('SUBSCRIBED');
      return channel;
    }),
    track: jest.fn().mockResolvedValue({}),
    presenceState: jest.fn(() => presenceState),
    __handlers: handlers,
    __presenceState: presenceState,
  };

  return channel;
}

describe('usePresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty online set when there is no session', async () => {
    mockUseAuth.mockReturnValue({ session: null });
    const { result } = await renderHook(() => usePresence());
    expect(result.current.isOnline('someone')).toBe(false);
  });

  it('tracks presence and reflects the synced state once subscribed', async () => {
    mockUseAuth.mockReturnValue({ session: { user: { id: 'me' } } });
    const channel = createFakeChannel();
    channel.__presenceState['contact-1'] = [{ online_at: '2026-07-06T00:00:00Z' }];
    mockChannel.mockReturnValue(channel);

    const { result } = await renderHook(() => usePresence());

    await waitFor(() => {
      channel.__handlers.sync();
      expect(result.current.isOnline('contact-1')).toBe(true);
    });

    expect(channel.track).toHaveBeenCalledWith(expect.objectContaining({ online_at: expect.any(String) }));
  });
});
