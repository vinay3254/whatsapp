import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useContacts } from './use-contacts';
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

describe('useContacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ session: { user: { id: 'me' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
  });

  it('searchByUsername queries profiles with an ilike filter, excluding the current user', async () => {
    const neq = jest.fn().mockResolvedValue({
      data: [{ id: 'them', username: 'sarah', display_name: 'Sarah Jenkins' }],
      error: null,
    });
    const ilike = jest.fn().mockReturnValue({ neq });
    mockFrom.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('profiles');
      return { select: jest.fn().mockReturnThis(), ilike };
    });

    const { result } = await renderHook(() => useContacts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let found: unknown;
    await act(async () => {
      found = await result.current.searchByUsername('sar');
    });

    expect(ilike).toHaveBeenCalledWith('username', '%sar%');
    expect(neq).toHaveBeenCalledWith('id', 'me');
    expect(found).toEqual([{ id: 'them', username: 'sarah', display_name: 'Sarah Jenkins' }]);
  });

  it('addContact inserts an owner_id/contact_id row', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }), insert };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const { result } = await renderHook(() => useContacts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: string | null } | undefined;
    await act(async () => {
      response = await result.current.addContact('them');
    });

    expect(insert).toHaveBeenCalledWith({ owner_id: 'me', contact_id: 'them' });
    expect(response?.error).toBeNull();
  });
});
