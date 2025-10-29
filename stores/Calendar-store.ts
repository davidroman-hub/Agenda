import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface CalendarSettingsState {
  calendarIsopen: boolean;
  setCalendarIsOpen: (isOpen: boolean) => void;
}

const useCalendarSettingsStore = create<CalendarSettingsState>()(
  persist(
    (set) => ({
      calendarIsopen: false,
      setCalendarIsOpen: (isOpen: boolean) => set({ calendarIsopen: isOpen }),
    }),
    {
      name: "calendar-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useCalendarSettingsStore;
