import { create } from "zustand";

interface LoginState {
  isLoggedIn: boolean;
  userValues: { username: string; password: string } | null;
  login: () => void;
  logout: () => void;
  setUserValues: (username: string, password: string) => void;
}

const useLoginStore = create<LoginState>((set) => ({
  isLoggedIn: false,
  userValues: null,
  login: () => set({ isLoggedIn: true }),
  logout: () => set({ isLoggedIn: false }),
  setUserValues: (username: string, password: string) =>
    set({ userValues: { username, password } }),
}));

export default useLoginStore;
