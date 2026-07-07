import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuthState } from './use-auth';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as unknown as {
  auth: {
    getSession: jest.Mock;
    onAuthStateChange: jest.Mock;
    signUp: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
  };
  from: jest.Mock;
};

function mockNoSession() {
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
}

describe('useAuthState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves loading to false with no session when there is none stored', async () => {
    mockNoSession();
    const { result } = await renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('signUp returns the Supabase error message on failure', async () => {
    mockNoSession();
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    });
    const { result } = await renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } | undefined;
    await act(async () => {
      response = await result.current.signUp('a@b.com', 'password123', 'alice', 'Alice');
    });

    expect(response?.error).toBe('Email already registered');
  });

  it('signUp passes username/display_name as auth user metadata for the handle_new_user trigger to consume', async () => {
    mockNoSession();
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { result } = await renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } | undefined;
    await act(async () => {
      response = await result.current.signUp('a@b.com', 'password123', 'alice', 'Alice');
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'password123',
      options: { data: { username: 'alice', display_name: 'Alice' } },
    });
    expect(response?.error).toBeNull();
  });

  it('signIn returns the Supabase error message on failure', async () => {
    mockNoSession();
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const { result } = await renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } | undefined;
    await act(async () => {
      response = await result.current.signIn('a@b.com', 'wrong-password');
    });

    expect(response?.error).toBe('Invalid login credentials');
  });
});
