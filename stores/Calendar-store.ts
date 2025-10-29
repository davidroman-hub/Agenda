import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface CalendarSettingsState {
  calendarIsopen: boolean;
  setCalendarIsOpen: (isOpen: boolean) => void;
  selectDate: (date: string) => void;
  dateSelected: string | null;
}

const useCalendarSettingsStore = create<CalendarSettingsState>()(
  persist(
    (set) => ({
      calendarIsopen: false,
      setCalendarIsOpen: (isOpen: boolean) => set({ calendarIsopen: isOpen }),
      dateSelected: null,
      selectDate: (date: string) => set({ dateSelected: date }),
    }),
    {
      name: "calendar-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useCalendarSettingsStore;
