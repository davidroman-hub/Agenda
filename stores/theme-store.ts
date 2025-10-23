import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ThemeState {
  colorScheme: "light" | "dark";
  toggleColorScheme: () => void;
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorScheme: "light",
      toggleColorScheme: () =>
        set({
          colorScheme: get().colorScheme === "light" ? "dark" : "light",
        }),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useThemeStore;
