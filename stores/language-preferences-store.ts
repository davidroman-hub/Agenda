import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface LanguagePreferencesState {
  // Idioma seleccionado por el usuario (null = usar detección automática)
  userSelectedLanguage: string | null;
  
  // Acciones
  setUserLanguage: (language: string | null) => void;
  getUserLanguage: () => string | null;
  clearUserLanguage: () => void;
}

const useLanguagePreferencesStore = create<LanguagePreferencesState>()(
  persist(
    (set, get) => ({
      userSelectedLanguage: null,

      setUserLanguage: (language: string | null) => {
        console.log(`🌍 Guardando preferencia de idioma del usuario: ${language || 'automático'}`);
        set({ userSelectedLanguage: language });
      },

      getUserLanguage: () => {
        return get().userSelectedLanguage;
      },

      clearUserLanguage: () => {
        console.log('🌍 Limpiando preferencia de idioma del usuario (volver a automático)');
        set({ userSelectedLanguage: null });
      },
    }),
    {
      name: "language-preferences-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useLanguagePreferencesStore;
