import { RepeatOption } from "@/components/agendaComponents/bookFragments/TaskRepeat";
import { mmkvStorage } from "@/lib/mmkv";
import { shouldRepeatOnDate } from "@/utils/repeat-utils";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface RepeatingTaskPattern {
  id: string;
  originalTaskId: string; // ID de la tarea original que se repite
  repeatOption: RepeatOption; // 'daily' | 'weekly' | 'monthly'
  startDate: string; // Fecha en que se creó el patrón de repetición (YYYY-MM-DD)
  createdAt: string;
  isActive: boolean; // Para poder pausar/activar patrones de repetición
}

export interface RepeatingTasksState {
  // Almacena los patrones de repetición
  repeatingPatterns: RepeatingTaskPattern[];
  // Almacena el estado de completado de tareas repetidas: 'originalTaskId-date' -> boolean
  repeatingTaskCompletions: Record<string, boolean>;

  // Acciones
  addRepeatingPattern: (
    pattern: Omit<RepeatingTaskPattern, "id" | "createdAt" | "isActive">
  ) => void;
  removeRepeatingPattern: (originalTaskId: string) => void;
  toggleRepeatingPattern: (id: string) => void;
  updateRepeatingPattern: (
    id: string,
    updates: Partial<RepeatingTaskPattern>
  ) => void;
  getRepeatingPatternForTask: (
    originalTaskId: string
  ) => RepeatingTaskPattern | null;
  shouldTaskRepeatOnDate: (
    originalTaskId: string,
    targetDate: string
  ) => boolean;
  getAllRepeatingPatterns: () => RepeatingTaskPattern[];

  // Funciones para manejar el estado de completado de tareas repetidas
  toggleRepeatingTaskCompletion: (originalTaskId: string, date: string) => void;
  isRepeatingTaskCompleted: (originalTaskId: string, date: string) => boolean;
}

const useRepeatingTasksStore = create<RepeatingTasksState>()(
  persist(
    (set, get) => ({
      repeatingPatterns: [],
      repeatingTaskCompletions: {},

      addRepeatingPattern: (patternData) => {
        // Verificar si ya existe un patrón para esta tarea
        const existingPattern = get().repeatingPatterns.find(
          (pattern) => pattern.originalTaskId === patternData.originalTaskId
        );

        if (existingPattern) {
          // Si ya existe, actualizar el patrón existente en lugar de crear uno nuevo
          set((state) => ({
            repeatingPatterns: state.repeatingPatterns.map((pattern) =>
              pattern.originalTaskId === patternData.originalTaskId
                ? {
                    ...pattern,
                    repeatOption: patternData.repeatOption,
                    startDate: patternData.startDate,
                    isActive: true,
                  }
                : pattern
            ),
          }));
        } else {
          // Si no existe, crear uno nuevo
          const newPattern: RepeatingTaskPattern = {
            ...patternData,
            id: `pattern-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 11)}`,
            createdAt: new Date().toISOString(),
            isActive: true,
          };

          set((state) => ({
            repeatingPatterns: [...state.repeatingPatterns, newPattern],
          }));
        }
      },

      removeRepeatingPattern: (originalTaskId) => {
        set((state) => ({
          repeatingPatterns: state.repeatingPatterns.filter(
            (pattern) => pattern.originalTaskId !== originalTaskId
          ),
        }));
      },

      toggleRepeatingPattern: (id) => {
        set((state) => ({
          repeatingPatterns: state.repeatingPatterns.map((pattern) =>
            pattern.id === id
              ? { ...pattern, isActive: !pattern.isActive }
              : pattern
          ),
        }));
      },

      updateRepeatingPattern: (id, updates) => {
        set((state) => ({
          repeatingPatterns: state.repeatingPatterns.map((pattern) =>
            pattern.id === id ? { ...pattern, ...updates } : pattern
          ),
        }));
      },

      getRepeatingPatternForTask: (originalTaskId) => {
        const { repeatingPatterns } = get();
        return (
          repeatingPatterns.find(
            (pattern) => pattern.originalTaskId === originalTaskId
          ) || null
        );
      },

      shouldTaskRepeatOnDate: (originalTaskId, targetDate) => {
        const { repeatingPatterns } = get();
        const pattern = repeatingPatterns.find(
          (p) => p.originalTaskId === originalTaskId
        );

        if (!pattern?.isActive) return false;

        return shouldRepeatOnDate(
          pattern.repeatOption,
          pattern.startDate,
          targetDate
        );
      },

      getAllRepeatingPatterns: () => {
        return get().repeatingPatterns;
      },

      toggleRepeatingTaskCompletion: (originalTaskId: string, date: string) => {
        const completionKey = `${originalTaskId}-${date}`;
        set((state) => ({
          repeatingTaskCompletions: {
            ...state.repeatingTaskCompletions,
            [completionKey]: !state.repeatingTaskCompletions[completionKey],
          },
        }));
      },

      isRepeatingTaskCompleted: (originalTaskId: string, date: string) => {
        const completionKey = `${originalTaskId}-${date}`;
        return get().repeatingTaskCompletions[completionKey] || false;
      },
    }),
    {
      name: "repeating-tasks-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useRepeatingTasksStore;
