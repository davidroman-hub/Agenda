import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounterStore = create<CounterState>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
      reset: () => set({ count: 0 }),
    }),
    {
      name: "counter-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useCounterStore;
