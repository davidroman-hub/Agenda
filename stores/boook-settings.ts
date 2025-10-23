import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface BookSettingsState {
  daysToShow: number;
  setDaysToShow: (days: number) => void;
}

const useBookSettingsStore = create<BookSettingsState>()(
  persist(
    (set) => ({
      daysToShow: 3,
      setDaysToShow: (days: number) => set({ daysToShow: days }),
    }),
    {
      name: "book-settings-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useBookSettingsStore;