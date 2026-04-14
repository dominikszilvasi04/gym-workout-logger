import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/api', () => ({
  authAPI: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
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

  it('stores the registered user on successful register', async () => {
    vi.mocked(authAPI.register).mockResolvedValue({
      _id: 'user-4',
      email: 'new@example.com',
      display_name: 'New Athlete',
      created_at: '2026-01-04T00:00:00Z',
    });

    await useAuthStore.getState().register('new@example.com', 'password123', 'New Athlete');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.display_name).toBe('New Athlete');
    expect(state.error).toBeNull();
  });

  it('clears the user on successful logout', async () => {
    useAuthStore.setState({
      user: {
        _id: 'user-5',
        email: 'logout@example.com',
        created_at: '2026-01-05T00:00:00Z',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    vi.mocked(authAPI.logout).mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.error).toBeNull();
  });

  it('updates the profile on successful profile update', async () => {
    useAuthStore.setState({
      user: {
        _id: 'user-6',
        email: 'profile@example.com',
        display_name: 'Profile One',
        created_at: '2026-01-06T00:00:00Z',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    vi.mocked(authAPI.updateProfile).mockResolvedValue({
      _id: 'user-6',
      email: 'profile@example.com',
      display_name: 'Profile Two',
      created_at: '2026-01-06T00:00:00Z',
    });

    await useAuthStore.getState().updateProfile('Profile Two');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.display_name).toBe('Profile Two');
    expect(state.error).toBeNull();
  });

  it('surfaces a profile update error message when updateProfile fails', async () => {
    vi.mocked(authAPI.updateProfile).mockRejectedValue(new Error('Profile update failed upstream'));

    await expect(useAuthStore.getState().updateProfile('Bad Name')).rejects.toThrow('Profile update failed upstream');

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Profile update failed upstream');
  });
});
