import { create } from "zustand";
import { AuthUser } from "../types";
import authService from "../services/authService";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<AuthUser | null>;
  clearAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start in loading state until initial session is verified
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login(email, password);
      if (res.success && res.data?.user) {
        set({
          user: res.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return res.data.user;
      } else {
        const errorMsg = res.message || "Invalid email or password.";
        set({ isLoading: false, error: errorMsg });
        throw new Error(errorMsg);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Authentication failed";
      set({ isLoading: false, error: errorMsg });
      throw new Error(errorMsg);
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.register(name, email, password);
      if (res.success && res.data?.user) {
        set({
          user: res.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return res.data.user;
      } else {
        const errorMsg = res.message || "Registration failed.";
        set({ isLoading: false, error: errorMsg });
        throw new Error(errorMsg);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Registration failed";
      set({ isLoading: false, error: errorMsg });
      throw new Error(errorMsg);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  fetchCurrentUser: async () => {
    try {
      const res = await authService.getCurrentUser();
      if (res.success && res.data) {
        set({
          user: res.data,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return res.data;
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return null;
      }
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return null;
    }
  },

  clearAuth: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useAuthStore;
