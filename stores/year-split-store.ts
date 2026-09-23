import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface YearSplitState {
  // Qué parte del ancho se lleva el calendario en la vista de año; null = la que toque por defecto
  calendarShare: number | null;
  setCalendarShare: (share: number | null) => void;
  // Lo mismo en vertical, con el calendario encima: qué parte del alto se lleva
  stackedShare: number | null;
  setStackedShare: (share: number | null) => void;
}

const useYearSplitStore = create<YearSplitState>()(
  persist(
    (set) => ({
      calendarShare: null,
      setCalendarShare: (share) => set({ calendarShare: share }),
      stackedShare: null,
      setStackedShare: (share) => set({ stackedShare: share }),
    }),
    {
      name: "year-split-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useYearSplitStore;
