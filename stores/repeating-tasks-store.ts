import { RepeatOption } from "@/components/agendaComponents/bookFragments/TaskRepeat";
import { mmkvStorage } from "@/lib/mmkv";
import { addDaysToDateKey, patternOccursOn } from "@/utils/repeat-utils";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface RepeatingTaskPattern {
  id: string;
  originalTaskId: string; // ID de la tarea original que se repite
  repeatOption: RepeatOption; // 'daily' | 'weekly' | 'monthly'
  startDate: string; // Fecha en que se creó el patrón de repetición (YYYY-MM-DD)
  createdAt: string;
  isActive: boolean; // Para poder pausar/activar patrones de repetición
  // La serie deja de repetirse después de esta fecha (incluida). Sin valor, no termina.
  endDate?: string | null;
  // Fechas concretas que se han saltado ("borrar solo esta")
  excludedDates?: string[];
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// Quita de `completions` las entradas de una tarea cuya fecha cumpla `shouldRemove`.
// Las claves son `${idTarea}-${YYYY-MM-DD}`; el id ya lleva guiones, así que se compara por prefijo.
// Devuelve el mismo objeto si no había nada que quitar.
function pruneCompletions(
  completions: Record<string, boolean>,
  taskId: string,
  shouldRemove: (date: string) => boolean
): Record<string, boolean> {
  const prefix = `${taskId}-`;
  const kept: Record<string, boolean> = {};
  let removedAny = false;

  for (const [key, value] of Object.entries(completions)) {
    const date = key.startsWith(prefix) ? key.slice(prefix.length) : null;
    if (date && DATE_KEY.test(date) && shouldRemove(date)) {
      removedAny = true;
    } else {
      kept[key] = value;
    }
  }

  return removedAny ? kept : completions;
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
  // "Borrar solo esta": la serie se salta esa fecha
  skipOccurrence: (originalTaskId: string, date: string) => void;
  // "Borrar esta y las siguientes": la serie termina el día anterior a esa fecha
  endSeriesBefore: (originalTaskId: string, date: string) => void;
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
                    // Si cambia la frecuencia es una serie nueva: el fin y las fechas
                    // saltadas de la anterior ya no tienen sentido
                    ...(pattern.repeatOption !== patternData.repeatOption
                      ? { endDate: null, excludedDates: [] }
                      : {}),
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
          // Los completados de una serie que ya no existe no sirven para nada
          repeatingTaskCompletions: pruneCompletions(
            state.repeatingTaskCompletions,
            originalTaskId,
            () => true
          ),
        }));
      },

      skipOccurrence: (originalTaskId, date) => {
        set((state) => ({
          repeatingPatterns: state.repeatingPatterns.map((pattern) =>
            pattern.originalTaskId === originalTaskId &&
            !pattern.excludedDates?.includes(date)
              ? { ...pattern, excludedDates: [...(pattern.excludedDates ?? []), date].sort() }
              : pattern
          ),
          repeatingTaskCompletions: pruneCompletions(
            state.repeatingTaskCompletions,
            originalTaskId,
            (completionDate) => completionDate === date
          ),
        }));
      },

      endSeriesBefore: (originalTaskId, date) => {
        const lastDate = addDaysToDateKey(date, -1);

        set((state) => ({
          repeatingPatterns: state.repeatingPatterns.map((pattern) =>
            pattern.originalTaskId === originalTaskId
              ? {
                  ...pattern,
                  // Si la serie ya terminaba antes, se queda como estaba
                  endDate:
                    pattern.endDate && pattern.endDate < lastDate
                      ? pattern.endDate
                      : lastDate,
                  excludedDates: (pattern.excludedDates ?? []).filter(
                    (skipped) => skipped <= lastDate
                  ),
                }
              : pattern
          ),
          repeatingTaskCompletions: pruneCompletions(
            state.repeatingTaskCompletions,
            originalTaskId,
            (completionDate) => completionDate > lastDate
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

        return patternOccursOn(pattern, targetDate);
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
