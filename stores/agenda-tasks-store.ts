import { mmkvStorage } from "@/lib/mmkv";
import { notificationService } from "@/services/notifications/notification-service";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AgendaTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  reminder?: string | null; // ISO string for reminder date/time
  notificationId?: string | null; // ID de la notificación programada
}

export interface DayTasks {
  [lineNumber: number]: AgendaTask | null;
}

export interface AgendaTasksState {
  // Almacena tareas por fecha en formato YYYY-MM-DD
  tasksByDate: Record<string, DayTasks>;
  
  // Acciones
  addTask: (date: string, lineNumber: number, text: string, reminder?: string | null) => Promise<void>;
  updateTask: (date: string, lineNumber: number, updates: Partial<AgendaTask>) => Promise<void>;
  deleteTask: (date: string, lineNumber: number) => Promise<void>;
  toggleTaskCompletion: (date: string, lineNumber: number) => void;
  getTasksForDate: (date: string) => DayTasks;
  getTaskForLine: (date: string, lineNumber: number) => AgendaTask | null;
}

const useAgendaTasksStore = create<AgendaTasksState>()(
  persist(
    (set, get) => ({
      tasksByDate: {},
      
      addTask: async (date: string, lineNumber: number, text: string, reminder?: string | null) => {
        const newTask: AgendaTask = {
          id: `${date}-${lineNumber}-${Date.now()}`,
          text: text.trim(),
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reminder: reminder || null,
          notificationId: null,
        };

        // Programar notificación si hay recordatorio
        if (reminder) {
          const reminderDate = new Date(reminder);
          const notificationId = await notificationService.scheduleTaskReminder(
            newTask.id,
            newTask.text,
            `Tarea programada para: ${date}`,
            reminderDate,
            date
          );
          newTask.notificationId = notificationId;
        }
        
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
      
      updateTask: async (date: string, lineNumber: number, updates: Partial<AgendaTask>) => {
        const existingTask = get().tasksByDate[date]?.[lineNumber];
        if (!existingTask) return;

        // Si se actualiza el recordatorio, manejar notificaciones
        if ('reminder' in updates) {
          // Cancelar notificación anterior si existe
          if (existingTask.notificationId) {
            await notificationService.cancelTaskReminder(existingTask.id);
          }

          // Si hay nuevo recordatorio, programar nueva notificación
          let notificationId = null;
          if (updates.reminder) {
            const reminderDate = new Date(updates.reminder);
            notificationId = await notificationService.scheduleTaskReminder(
              existingTask.id,
              updates.text || existingTask.text,
              `Tarea programada para: ${date}`,
              reminderDate,
              date
            );
          }
          updates.notificationId = notificationId;
        }
        
        set((state) => {
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
      
      deleteTask: async (date: string, lineNumber: number) => {
        const existingTask = get().tasksByDate[date]?.[lineNumber];
        
        // Cancelar notificación si existe
        if (existingTask?.notificationId) {
          await notificationService.cancelTaskReminder(existingTask.id);
        }
        
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
