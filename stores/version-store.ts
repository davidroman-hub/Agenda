import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface VersionState {
  currentVersion: string;
  previousVersion: string | null;
  hasShownUpdateNotification: boolean;
  isFirstLaunch: boolean;
  updateVersion: (newVersion: string) => void;
  markNotificationShown: () => void;
  resetNotificationFlag: () => void;
  checkForVersionUpdate: () => boolean;
}

export const useVersionStore = create<VersionState>()(
  persist(
    (set, get) => ({
      currentVersion: '1.4.0',
      previousVersion: null,
      hasShownUpdateNotification: false,
      isFirstLaunch: true,

      updateVersion: (newVersion: string) => {
        const state = get();
        set({
          previousVersion: state.currentVersion,
          currentVersion: newVersion,
          hasShownUpdateNotification: false,
          isFirstLaunch: false,
        });
      },

      markNotificationShown: () => {
        set({ hasShownUpdateNotification: true });
      },

      resetNotificationFlag: () => {
        set({ hasShownUpdateNotification: false });
      },

      checkForVersionUpdate: () => {
        const state = get();
        return !state.isFirstLaunch && 
               state.previousVersion !== null && 
               state.previousVersion !== state.currentVersion && 
               !state.hasShownUpdateNotification;
      },
    }),
    {
      name: 'version-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
