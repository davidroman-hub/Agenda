import { mmkvStorage } from "@/lib/mmkv";
import { notificationService } from "@/services/notifications/notification-service";
import {
  migrateDateKey,
  needsDateMigration,
  normalizeISOStringToLocal,
  normalizeToLocalMidnight
} from "@/utils/date-utils";
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
  repeat?: string; // 'none' | 'daily' | 'weekly' | 'monthly'
  isRepeatingTask?: boolean; // Flag para identificar tareas repetidas
  repeatingTaskId?: string; // ID de la tarea repetida original
  repeatingPatternId?: string; // ID del patrón de repetición
}

export interface DayTasks {
  [lineNumber: number]: AgendaTask | null;
}

export interface AgendaTasksState {
  // Almacena tareas por fecha en formato YYYY-MM-DD
  tasksByDate: Record<string, DayTasks>;
  
  // Acciones
  addTask: (date: string, lineNumber: number, text: string, reminder?: string | null, repeat?: string) => Promise<void>;
  updateTask: (date: string, lineNumber: number, updates: Partial<AgendaTask>) => Promise<void>;
  deleteTask: (date: string, lineNumber: number) => Promise<void>;
  toggleTaskCompletion: (date: string, lineNumber: number) => void;
  getTasksForDate: (date: string) => DayTasks;
  getTaskForLine: (date: string, lineNumber: number) => AgendaTask | null;
  getAllTasks: () => Record<string, DayTasks>;
  // Nueva función para migrar datos existentes
  migrateTaskDates: () => void;
}

const useAgendaTasksStore = create<AgendaTasksState>()(
  persist(
    (set, get) => ({
      tasksByDate: {},
      
      addTask: async (date: string, lineNumber: number, text: string, reminder?: string | null, repeat?: string) => {
        // Normalizar fechas para evitar problemas de zona horaria
        const normalizedDate = normalizeToLocalMidnight(new Date()).toISOString();
        
        const newTask: AgendaTask = {
          id: `${date}-${lineNumber}-${Date.now()}`,
          text: text.trim(),
          completed: false,
          createdAt: normalizedDate,
          updatedAt: normalizedDate,
          reminder: reminder || null,
          notificationId: null,
          repeat: repeat || 'none',
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
            updatedAt: normalizeToLocalMidnight(new Date()).toISOString(),
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
      
      getAllTasks: () => {
        return get().tasksByDate;
      },

      // Función para migrar tareas existentes a formato de fecha normalizado
      migrateTaskDates: () => {
        console.log('🔄 Iniciando migración de fechas de tareas...');
        
        set((state) => {
          const migratedTasksByDate: Record<string, DayTasks> = {};
          let migratedCount = 0;
          let totalTasks = 0;
          
          // Iterar sobre todas las fechas y tareas
          for (const [dateKey, dayTasks] of Object.entries(state.tasksByDate)) {
            // Migrar la clave de fecha si es necesario
            const newDateKey = migrateDateKey(dateKey);
            
            if (!migratedTasksByDate[newDateKey]) {
              migratedTasksByDate[newDateKey] = {};
            }
            
            // Migrar cada tarea en el día
            for (const [lineNumber, task] of Object.entries(dayTasks)) {
              if (task) {
                totalTasks++;
                let needsMigration = false;
                const migratedTask = { ...task };
                
                // Migrar createdAt si necesita normalización
                if (needsDateMigration(task.createdAt)) {
                  migratedTask.createdAt = normalizeISOStringToLocal(task.createdAt);
                  needsMigration = true;
                }
                
                // Migrar updatedAt si necesita normalización
                if (needsDateMigration(task.updatedAt)) {
                  migratedTask.updatedAt = normalizeISOStringToLocal(task.updatedAt);
                  needsMigration = true;
                }
                
                if (needsMigration) {
                  migratedCount++;
                  console.log(`📝 Migrando tarea: ${task.text} (${dateKey} → ${newDateKey})`);
                }
                
                const lineNum = Number(lineNumber);
                migratedTasksByDate[newDateKey][lineNum] = migratedTask;
              }
            }
          }
          
          console.log(`✅ Migración completada: ${migratedCount}/${totalTasks} tareas migradas`);
          console.log(`📅 Fechas en el nuevo formato:`, Object.keys(migratedTasksByDate));
          
          return {
            tasksByDate: migratedTasksByDate
          };
        });
      },
    }),
    {
      name: "agenda-tasks-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default useAgendaTasksStore;
