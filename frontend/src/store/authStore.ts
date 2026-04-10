import { create } from "zustand";
import type { AxiosError } from "axios";
import type { User } from "../types";
import { authAPI } from "../services/api";

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authAPI.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Failed to verify session",
      });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authAPI.login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string }>;
      const errorMessage =
        axiosError.response?.data?.error ||
        (error instanceof Error ? error.message : "Login failed");
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  register: async (email: string, password: string, displayName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authAPI.register(email, password, displayName);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string }>;
      const errorMessage =
        axiosError.response?.data?.error ||
        (error instanceof Error ? error.message : "Registration failed");
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Logout failed";
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
