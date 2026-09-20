import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface VersionState {
  // Última versión de la app que se abrió en este dispositivo (null hasta el primer arranque)
  currentVersion: string | null;
  // Versión que había antes de la última actualización (null si no ha habido ninguna)
  previousVersion: string | null;
  hasShownUpdateNotification: boolean;
  isFirstLaunch: boolean;
  updateVersion: (newVersion: string) => void;
  markNotificationShown: () => void;
  resetNotificationFlag: () => void;
  checkForVersionUpdate: () => boolean;
}

// Solo se persisten los datos, no las funciones
type PersistedVersionState = Pick<
  VersionState,
  | 'currentVersion'
  | 'previousVersion'
  | 'hasShownUpdateNotification'
  | 'isFirstLaunch'
>;

const INITIAL_DATA: PersistedVersionState = {
  currentVersion: null,
  previousVersion: null,
  hasShownUpdateNotification: false,
  isFirstLaunch: true,
};

// Versión del formato guardado. Sube este número (y ajusta `migrate`) si cambia.
const PERSIST_VERSION = 1;

export const useVersionStore = create<VersionState>()(
  persist(
    (set, get) => ({
      ...INITIAL_DATA,

      updateVersion: (newVersion: string) => {
        const { currentVersion } = get();
        if (currentVersion === newVersion) return;

        set({
          // En el primer arranque no hay versión anterior, así que no hay aviso
          previousVersion: currentVersion,
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
      partialize: (state): PersistedVersionState => ({
        currentVersion: state.currentVersion,
        previousVersion: state.previousVersion,
        hasShownUpdateNotification: state.hasShownUpdateNotification,
        isFirstLaunch: state.isFirstLaunch,
      }),
      version: PERSIST_VERSION,
      migrate: (persistedState, version) => {
        // Antes de la v1, currentVersion arrancaba en '1.4.0' aunque la app fuera otra,
        // así que ese dato no es fiable: se descarta y se vuelve a registrar en el
        // siguiente arranque (sin aviso, porque no se sabe de qué versión se viene).
        if (version < 1) return INITIAL_DATA;
        return persistedState as PersistedVersionState;
      },
    }
  )
);
