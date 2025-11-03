import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface LoginState {
  isLoggedIn: boolean;
  userValues: { username: string; password: string } | null;
  login: () => void;
  logout: () => void;
  setUserValues: (username: string, password: string) => void;
}

const useLoginStore = create<LoginState>()(
  persist(
    (set) => ({
      isLoggedIn: true, // Ya logueado por defecto
      userValues: { username: "test", password: "123" },
      login: () => set({ isLoggedIn: true }),
      logout: () => set({ isLoggedIn: false, userValues: null }),
      setUserValues: (username: string, password: string) =>
        set({ userValues: { username, password } }),
    }),
    {
      name: "login-storage", // nombre único para este store
      storage: createJSONStorage(() => mmkvStorage), // usar createJSONStorage con nuestro adaptador MMKV
    }
  )
);

export default useLoginStore;
