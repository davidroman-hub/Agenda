import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ViewMode = 'normal' | 'expanded' | 'single';

interface BookSettingsState {
  daysToShow: number;
  viewMode: ViewMode;
  linesPerPage: number;
  setDaysToShow: (days: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setLinesPerPage: (lines: number) => void;
}

const useBookSettingsStore = create<BookSettingsState>()(
  persist(
    (set) => ({
      daysToShow: 3,
      viewMode: 'normal' as const,
      linesPerPage: 12,
      setDaysToShow: (days: number) => set({ daysToShow: days }),
      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
      setLinesPerPage: (lines: number) => set({ linesPerPage: lines }),
    }),
    {
      name: "book-settings-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useBookSettingsStore;