import { mmkvStorage } from "@/lib/mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AgendaTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DayTasks {
  [lineNumber: number]: AgendaTask | null;
}

export interface AgendaTasksState {
  // Almacena tareas por fecha en formato YYYY-MM-DD
  tasksByDate: Record<string, DayTasks>;
  
  // Acciones
  addTask: (date: string, lineNumber: number, text: string) => void;
  updateTask: (date: string, lineNumber: number, updates: Partial<AgendaTask>) => void;
  deleteTask: (date: string, lineNumber: number) => void;
  toggleTaskCompletion: (date: string, lineNumber: number) => void;
  getTasksForDate: (date: string) => DayTasks;
  getTaskForLine: (date: string, lineNumber: number) => AgendaTask | null;
}

const useAgendaTasksStore = create<AgendaTasksState>()(
  persist(
    (set, get) => ({
      tasksByDate: {},
      
      addTask: (date: string, lineNumber: number, text: string) => {
        const newTask: AgendaTask = {
          id: `${date}-${lineNumber}-${Date.now()}`,
          text: text.trim(),
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => ({
          tasksByDate: {
            ...state.tasksByDate,
            [date]: {
              ...state.tasksByDate[date],
              [lineNumber]: newTask,
            },
          },
        }));
      },
      
      updateTask: (date: string, lineNumber: number, updates: Partial<AgendaTask>) => {
        set((state) => {
          const existingTask = state.tasksByDate[date]?.[lineNumber];
          if (!existingTask) return state;
          
          const updatedTask: AgendaTask = {
            ...existingTask,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          
          return {
            tasksByDate: {
              ...state.tasksByDate,
              [date]: {
                ...state.tasksByDate[date],
                [lineNumber]: updatedTask,
              },
            },
          };
        });
      },
      
      deleteTask: (date: string, lineNumber: number) => {
        set((state) => {
          const dateTasks = { ...state.tasksByDate[date] };
          delete dateTasks[lineNumber];
          
          return {
            tasksByDate: {
              ...state.tasksByDate,
              [date]: dateTasks,
            },
          };
        });
      },
      
      toggleTaskCompletion: (date: string, lineNumber: number) => {
        const task = get().getTaskForLine(date, lineNumber);
        if (task) {
          get().updateTask(date, lineNumber, { completed: !task.completed });
        }
      },
      
      getTasksForDate: (date: string): DayTasks => {
        return get().tasksByDate[date] || {};
      },
      
      getTaskForLine: (date: string, lineNumber: number): AgendaTask | null => {
        return get().tasksByDate[date]?.[lineNumber] || null;
      },
    }),
    {
      name: "agenda-tasks-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useAgendaTasksStore;
