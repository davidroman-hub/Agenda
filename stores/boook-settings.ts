import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ViewMode = 'normal' | 'expanded' | 'single';

interface BookSettingsState {
  daysToShow: number;
  viewMode: ViewMode;
  setDaysToShow: (days: number) => void;
  setViewMode: (mode: ViewMode) => void;
}

const useBookSettingsStore = create<BookSettingsState>()(
  persist(
    (set) => ({
      daysToShow: 3,
      viewMode: 'normal' as const,
      setDaysToShow: (days: number) => set({ daysToShow: days }),
      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
    }),
    {
      name: "book-settings-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useBookSettingsStore;