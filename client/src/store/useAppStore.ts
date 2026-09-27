import { create } from "zustand";
import { UserRole } from "../types";

interface AppState {
  currentRole: UserRole;
  isBackendOnline: boolean | null;
  backendMessage: string;
  unreadNotifications: number;
  sidebarCollapsed: boolean;
  setCurrentRole: (role: UserRole) => void;
  setBackendStatus: (isOnline: boolean, message: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  decrementNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentRole: "STUDENT",
  isBackendOnline: null,
  backendMessage: "Checking API health...",
  unreadNotifications: 3,
  sidebarCollapsed: false,
  setCurrentRole: (role) => set({ currentRole: role }),
  setBackendStatus: (isOnline, message) =>
    set({ isBackendOnline: isOnline, backendMessage: message }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  decrementNotifications: () =>
    set((state) => ({
      unreadNotifications: Math.max(0, state.unreadNotifications - 1),
    })),
}));
