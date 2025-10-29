import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cancelScheduledNotificationAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
} from "expo-notifications";
import { Platform } from "react-native";

export interface DailyNotificationCheck {
  lastCheckDate: string;
  scheduledNotifications: {
    notificationId: string;
    taskId: string;
    date: string;
  }[];
}

const DAILY_CHECK_KEY = "DAILY_NOTIFICATION_CHECK";

export class RepeatedTaskNotificationService {
  /**
   * Verifica diariamente si hay tareas repetidas que necesiten notificaciones
   */
  static async performDailyNotificationCheck(): Promise<void> {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

      // Verificar si ya se hizo el check hoy
      const lastCheck = await this.getLastDailyCheck();
      if (lastCheck.lastCheckDate === todayStr) {
        return;
      }

      // Limpiar notificaciones del día anterior
      await this.cancelPreviousDayNotifications(lastCheck);

      // Buscar tareas repetidas para hoy
      const todayRepeatedTasks = await this.findRepeatedTasksForToday(today);

      // Programar notificaciones para tareas repetidas de hoy que tengan reminder
      const scheduledNotifications = await this.scheduleNotificationsForToday(
        todayRepeatedTasks
      );

      // Guardar estado del check diario
      await this.saveDailyCheck({
        lastCheckDate: todayStr,
        scheduledNotifications,
      });
    } catch (error) {
      console.error("Error in daily notification check:", error);
    }
  }

  /**
   * Busca tareas repetidas que deberían ejecutarse hoy
   */
  private static async findRepeatedTasksForToday(today: Date) {
    const repeatingPatterns =
      useRepeatingTasksStore.getState().repeatingPatterns;
    const todayRepeatedTasks = [];

    for (const pattern of repeatingPatterns) {
      if (pattern.isActive && this.shouldTaskRepeatToday(pattern, today)) {
        todayRepeatedTasks.push(pattern);
      }
    }

    return todayRepeatedTasks;
  }

  /**
   * Determina si una tarea repetida debería ejecutarse hoy
   */
  private static shouldTaskRepeatToday(pattern: any, today: Date): boolean {
    const startDate = new Date(pattern.startDate);
    const daysDiff = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Solo repetir si la fecha de inicio ya pasó
    if (daysDiff < 0) return false;

    switch (pattern.repeatOption) {
      case "daily":
        return true; // Todos los días desde la fecha inicial

      case "weekly":
        return daysDiff % 7 === 0; // Cada 7 días

      case "monthly":
        // Mismo día del mes
        return today.getDate() === startDate.getDate();

      default:
        return false;
    }
  }

  /**
   * Programa notificaciones para las tareas repetidas de hoy que tengan reminder
   */
  private static async scheduleNotificationsForToday(
    todayRepeatedPatterns: any[]
  ) {
    const scheduledNotifications = [];
    const allTasks = useAgendaTasksStore.getState().getAllTasks();

    for (const pattern of todayRepeatedPatterns) {
      const originalTask = this.findOriginalTask(
        allTasks,
        pattern.originalTaskId
      );

      if (originalTask?.reminder) {
        const notification = await this.createNotificationForTask(
          originalTask,
          pattern
        );
        if (notification) {
          scheduledNotifications.push(notification);
        }
      }
    }

    return scheduledNotifications;
  }

  /**
   * Busca la tarea original en todas las fechas del store
   */
  private static findOriginalTask(allTasks: any, originalTaskId: string): any {
    for (const dayTasks of Object.values(allTasks)) {
      for (const task of Object.values(dayTasks as any)) {
        if (task && (task as any).id === originalTaskId) {
          return task as any;
        }
      }
    }
    return null;
  }

  /**
   * Crea una notificación para una tarea específica
   */
  private static async createNotificationForTask(
    originalTask: any,
    pattern: any
  ) {
    try {
      // Crear fecha de notificación para hoy con la hora del reminder original
      const reminderDate = new Date(originalTask.reminder);
      const todayReminder = new Date();
      todayReminder.setHours(reminderDate.getHours());
      todayReminder.setMinutes(reminderDate.getMinutes());
      todayReminder.setSeconds(0);
      todayReminder.setMilliseconds(0);

      // Solo programar si la hora aún no ha pasado
      if (todayReminder.getTime() <= Date.now()) {
        return null;
      }

      const notificationId = await scheduleNotificationAsync({
        content: {
          title: `📅 Tarea Repetida: ${originalTask.text}`,
          body: "Tienes una tarea repetida pendiente",
          data: {
            taskId: originalTask.id,
            isRepeatedTask: true,
            repeatOption: pattern.repeatOption,
            startDate: pattern.startDate,
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: todayReminder,
          channelId: Platform.OS === "android" ? "task-reminders" : undefined,
        },
      });

      return {
        notificationId,
        taskId: originalTask.id,
        date: todayReminder.toISOString(),
      };
    } catch (error) {
      console.error(
        `Error scheduling notification for repeated task ${pattern.originalTaskId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Cancela las notificaciones del día anterior
   */
  private static async cancelPreviousDayNotifications(
    lastCheck: DailyNotificationCheck
  ) {
    for (const notification of lastCheck.scheduledNotifications) {
      try {
        await cancelScheduledNotificationAsync(notification.notificationId);
      } catch (error) {
        console.error(
          `Error cancelling notification ${notification.notificationId}:`,
          error
        );
      }
    }
  }

  /**
   * Obtiene el último check diario realizado
   */
  private static async getLastDailyCheck(): Promise<DailyNotificationCheck> {
    try {
      const stored = await AsyncStorage.getItem(DAILY_CHECK_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error getting last daily check:", error);
    }

    return {
      lastCheckDate: "",
      scheduledNotifications: [],
    };
  }

  /**
   * Guarda el estado del check diario
   */
  private static async saveDailyCheck(checkData: DailyNotificationCheck) {
    try {
      await AsyncStorage.setItem(DAILY_CHECK_KEY, JSON.stringify(checkData));
    } catch (error) {
      console.error("Error saving daily check:", error);
    }
  }

  /**
   * Fuerza una nueva verificación (útil para testing)
   */
  static async forceNewCheck(): Promise<void> {
    await AsyncStorage.removeItem(DAILY_CHECK_KEY);
    await this.performDailyNotificationCheck();
  }

  /**
   * Obtiene estadísticas del sistema de notificaciones
   */
  static async getNotificationStats() {
    const lastCheck = await this.getLastDailyCheck();
    return {
      lastCheckDate: lastCheck.lastCheckDate,
      activeNotifications: lastCheck.scheduledNotifications.length,
      notifications: lastCheck.scheduledNotifications,
    };
  }
}
