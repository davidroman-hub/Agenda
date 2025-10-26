import { RepeatOption } from "@/components/agendaComponents/bookFragments/TaskRepeat";
import { mmkvStorage } from "@/lib/mmkv";
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
  addRepeatingPattern: (pattern: Omit<RepeatingTaskPattern, 'id' | 'createdAt' | 'isActive'>) => void;
  removeRepeatingPattern: (originalTaskId: string) => void;
  toggleRepeatingPattern: (id: string) => void;
  updateRepeatingPattern: (id: string, updates: Partial<RepeatingTaskPattern>) => void;
  getRepeatingPatternForTask: (originalTaskId: string) => RepeatingTaskPattern | null;
  shouldTaskRepeatOnDate: (originalTaskId: string, targetDate: string) => boolean;
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
        const newPattern: RepeatingTaskPattern = {
          ...patternData,
          id: `pattern-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date().toISOString(),
          isActive: true,
        };
        
        set((state) => ({
          repeatingPatterns: [...state.repeatingPatterns, newPattern],
        }));
      },
      
      removeRepeatingPattern: (originalTaskId) => {
        set((state) => ({
          repeatingPatterns: state.repeatingPatterns.filter((pattern) => pattern.originalTaskId !== originalTaskId),
        }));
      },
      
      toggleRepeatingPattern: (id) => {
        set((state) => ({
          repeatingPatterns: state.repeatingPatterns.map((pattern) =>
            pattern.id === id ? { ...pattern, isActive: !pattern.isActive } : pattern
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
        return repeatingPatterns.find((pattern) => pattern.originalTaskId === originalTaskId) || null;
      },
      
      shouldTaskRepeatOnDate: (originalTaskId, targetDate) => {
        const { repeatingPatterns } = get();
        const pattern = repeatingPatterns.find((p) => p.originalTaskId === originalTaskId);
        
        if (!pattern?.isActive) return false;
        
        const targetDateObj = new Date(targetDate);
        const startDateObj = new Date(pattern.startDate);
        
        // La tarea debe comenzar en o antes de la fecha objetivo
        if (startDateObj > targetDateObj) return false;
        
        // Calcular si la tarea debe aparecer en esta fecha según su patrón de repetición
        const daysDifference = Math.floor(
          (targetDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        switch (pattern.repeatOption) {
          case 'daily':
            return daysDifference >= 0; // Todos los días desde la fecha de inicio
            
          case 'weekly':
            return daysDifference >= 0 && daysDifference % 7 === 0; // Cada 7 días
            
          case 'monthly':
            // Mismo día del mes
            return (
              daysDifference >= 0 &&
              startDateObj.getDate() === targetDateObj.getDate()
            );
            
          default:
            return false;
        }
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
      name: 'repeating-tasks-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useRepeatingTasksStore;
