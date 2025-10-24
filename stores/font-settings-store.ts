import { mmkvStorage } from "@/lib/mmkv";
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Tamaños de fuente disponibles
export const FONT_SIZES = {
  small: { label: 'Pequeño', multiplier: 0.9 },
  normal: { label: 'Normal', multiplier: 1.2 },
  large: { label: 'Grande', multiplier: 1.5 },
  veryLarge: { label: 'Muy Grande', multiplier: 1.8 },
  extraLarge: { label: 'Extra Grande', multiplier: 2.1 },
} as const;

export type FontSizeKey = keyof typeof FONT_SIZES;

interface FontSettingsState {
  taskFontSize: FontSizeKey;
  setTaskFontSize: (size: FontSizeKey) => void;
  getTaskFontMultiplier: () => number;
}

const useFontSettingsStore = create<FontSettingsState>()(
  persist(
    (set, get) => ({
      taskFontSize: 'large' as FontSizeKey, // Empezar con tamaño Grande por defecto
      
      setTaskFontSize: (size: FontSizeKey) => {
        set({ taskFontSize: size });
      },
      
      getTaskFontMultiplier: () => {
        const currentSize = get().taskFontSize;
        return FONT_SIZES[currentSize].multiplier;
      },
    }),
    {
      name: 'font-settings-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useFontSettingsStore;
