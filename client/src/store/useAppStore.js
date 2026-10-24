import { create } from "zustand";

export const useAppStore = create((set) => ({
  currentRole: "STUDENT",
  isBackendOnline: null,
  backendMessage: "Checking API health...",
  unreadNotifications: 3,
  sidebarCollapsed: false,
  setCurrentRole: (role) => set({ currentRole: role }),
  setBackendStatus: (isOnline, message) => set({ isBackendOnline: isOnline, backendMessage: message }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  decrementNotifications: () =>
    set((state) => ({
      unreadNotifications: Math.max(0, state.unreadNotifications - 1),
    })),
}));
