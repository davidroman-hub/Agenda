import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ExactAlarmState {
  // Ya se le explicó al usuario que puede activar las alarmas exactas (el aviso sale una sola vez)
  promptShown: boolean;
  markPromptShown: () => void;
}

const useExactAlarmStore = create<ExactAlarmState>()(
  persist(
    (set) => ({
      promptShown: false,
      markPromptShown: () => set({ promptShown: true }),
    }),
    {
      name: "exact-alarm-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useExactAlarmStore;
