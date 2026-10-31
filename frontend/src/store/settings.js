import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * App-level settings, persisted to localStorage.
 */
export const useSettingsStore = create(
  persist(
    (set) => ({
      demoMode: false,         // use bundled fixtures instead of live API
      apiUrl: import.meta.env.VITE_API_URL || '',
      toggleDemoMode: () => set((s) => ({ demoMode: !s.demoMode })),
      setApiUrl: (url) => set({ apiUrl: url }),
    }),
    { name: 'labtwin-settings' }
  )
);
