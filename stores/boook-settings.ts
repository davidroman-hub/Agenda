import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Días por hoja y páginas una junto a otra (columnas) que admite el libro
export const DAYS_OPTIONS = [2, 4, 6, 7] as const;
export const COLUMN_OPTIONS = [1, 2] as const;

export type DaysToShow = (typeof DAYS_OPTIONS)[number];
export type Columns = (typeof COLUMN_OPTIONS)[number];

interface BookSettingsState {
  daysToShow: DaysToShow;
  columns: Columns;
  linesPerPage: number;
  setDaysToShow: (days: DaysToShow) => void;
  setColumns: (columns: Columns) => void;
  setLinesPerPage: (lines: number) => void;
}

const useBookSettingsStore = create<BookSettingsState>()(
  persist(
    (set) => ({
      daysToShow: 4,
      columns: 1,
      linesPerPage: 12,
      setDaysToShow: (days) => set({ daysToShow: days }),
      setColumns: (columns) => set({ columns }),
      setLinesPerPage: (lines: number) => set({ linesPerPage: lines }),
    }),
    {
      name: "book-settings-storage",
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
      // Antes: daysToShow 3 o 6 y viewMode "normal" | "expanded" | "single"
      migrate: (persisted: any) => {
        const state = persisted ?? {};
        return {
          ...state,
          daysToShow: (DAYS_OPTIONS as readonly number[]).includes(state.daysToShow)
            ? state.daysToShow
            : 4,
          columns: state.viewMode === "expanded" ? 2 : 1,
        };
      },
    }
  )
);

export default useBookSettingsStore;
