import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/api', () => ({
  authAPI: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authAPI } from '../services/api';
import { useAuthStore } from './authStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  });

  it('marks user authenticated when checkAuth succeeds', async () => {
    vi.mocked(authAPI.getCurrentUser).mockResolvedValue({
      _id: 'user-1',
      email: 'user@example.com',
      created_at: '2026-01-01T00:00:00Z',
    });

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('user@example.com');
    expect(state.error).toBeNull();
  });

  it('does not set auth error when checkAuth fails for unauthenticated visitors', async () => {
    vi.mocked(authAPI.getCurrentUser).mockRejectedValue(new Error('No active session'));

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.error).toBeNull();
  });

  it('stores login error message when login fails', async () => {
    vi.mocked(authAPI.login).mockRejectedValue(new Error('Invalid credentials'));

    await expect(useAuthStore.getState().login('user@example.com', 'wrong')).rejects.toThrow('Invalid credentials');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('authenticates and stores user on successful login', async () => {
    vi.mocked(authAPI.login).mockResolvedValue({
      _id: 'user-2',
      email: 'athlete@example.com',
      created_at: '2026-01-02T00:00:00Z',
    });

    await useAuthStore.getState().login('athlete@example.com', 'secure-pass');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?._id).toBe('user-2');
    expect(state.error).toBeNull();
  });

  it('sets logout error when logout request fails', async () => {
    useAuthStore.setState({
      user: {
        _id: 'user-3',
        email: 'persist@example.com',
        created_at: '2026-01-03T00:00:00Z',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    vi.mocked(authAPI.logout).mockRejectedValue(new Error('Logout failed upstream'));

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?._id).toBe('user-3');
    expect(state.error).toBe('Logout failed upstream');
  });

  it('clears store error via clearError', () => {
    useAuthStore.setState({ error: 'Some auth error' });

    useAuthStore.getState().clearError();

    expect(useAuthStore.getState().error).toBeNull();
  });
});
