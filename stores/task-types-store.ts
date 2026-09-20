import { mmkvStorage } from "@/lib/mmkv";
import {
  FILTER_ALL,
  isTypeNameTaken,
  MAX_TASK_TYPES,
  nextTypeColor,
  normalizeTypeName,
  TASK_TYPE_COLORS,
  TypeFilter,
} from "@/utils/task-types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface TaskType {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export type TypeResult =
  | { ok: true; type: TaskType }
  | { ok: false; reason: "empty" | "taken" | "limit" | "notFound" };

interface TaskTypesState {
  types: TaskType[];
  // Pestaña activa. No se guarda: la app siempre abre en "Todas"
  activeFilter: TypeFilter;

  addType: (name: string, color?: string) => TypeResult;
  renameType: (id: string, name: string) => TypeResult;
  setTypeColor: (id: string, color: string) => void;
  // Solo quita el tipo; las tareas que lo usaban se limpian en services/task-types-service.ts
  removeType: (id: string) => void;
  setActiveFilter: (filter: TypeFilter) => void;
}

const newTypeId = () =>
  `type-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

const useTaskTypesStore = create<TaskTypesState>()(
  persist(
    (set, get) => ({
      types: [],
      activeFilter: FILTER_ALL,

      addType: (name, color) => {
        const cleanName = normalizeTypeName(name);
        const { types } = get();

        if (!cleanName) return { ok: false, reason: "empty" };
        if (types.length >= MAX_TASK_TYPES) return { ok: false, reason: "limit" };
        if (isTypeNameTaken(types, cleanName)) return { ok: false, reason: "taken" };

        const type: TaskType = {
          id: newTypeId(),
          name: cleanName,
          color: color ?? nextTypeColor(types),
          createdAt: new Date().toISOString(),
        };
        set({ types: [...types, type] });
        return { ok: true, type };
      },

      renameType: (id, name) => {
        const cleanName = normalizeTypeName(name);
        const { types } = get();
        const existing = types.find((type) => type.id === id);

        if (!existing) return { ok: false, reason: "notFound" };
        if (!cleanName) return { ok: false, reason: "empty" };
        if (isTypeNameTaken(types, cleanName, id)) return { ok: false, reason: "taken" };

        const renamed = { ...existing, name: cleanName };
        set({ types: types.map((type) => (type.id === id ? renamed : type)) });
        return { ok: true, type: renamed };
      },

      setTypeColor: (id, color) => {
        if (!TASK_TYPE_COLORS.includes(color as (typeof TASK_TYPE_COLORS)[number])) return;
        set((state) => ({
          types: state.types.map((type) => (type.id === id ? { ...type, color } : type)),
        }));
      },

      removeType: (id) => {
        set((state) => ({
          types: state.types.filter((type) => type.id !== id),
          activeFilter: state.activeFilter === id ? FILTER_ALL : state.activeFilter,
        }));
      },

      setActiveFilter: (filter) => set({ activeFilter: filter }),
    }),
    {
      name: "task-types-storage",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ types: state.types }),
    }
  )
);

export default useTaskTypesStore;
