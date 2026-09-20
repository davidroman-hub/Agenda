import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import { dateToLocalDateString } from "@/utils/date-utils";
import {
  planRepeatedNotifications,
  PlannedNotification,
} from "@/utils/repeat-notification-plan";
import { notificationTexts } from "@/utils/notification-texts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
} from "expo-notifications";
import type { NotificationRequest } from "expo-notifications";
import i18n from "i18next";
import { AppState, Platform } from "react-native";

// Marca de los avisos de tareas repetidas (los recordatorios normales llevan "task-reminder")
const NOTIFICATION_TYPE = "repeated-task-reminder";

// Clave que usaba el sistema antiguo (un chequeo al día); ya no se usa y se borra
const LEGACY_CHECK_KEY = "DAILY_NOTIFICATION_CHECK";

// iOS admite como máximo 64 notificaciones locales pendientes en total; se deja margen
const MAX_PENDING_NOTIFICATIONS = 60;

// Espera antes de sincronizar tras un cambio, para juntar varios cambios seguidos en una sola pasada
const AUTO_SYNC_DEBOUNCE_MS = 800;

interface NotificationData {
  type?: string;
  isRepeatedTask?: boolean;
  originalTaskId?: string;
  taskId?: string; // solo los avisos del sistema antiguo
  occurrenceDate?: string;
  signature?: string;
}

const dataOf = (request: NotificationRequest) =>
  (request.content.data ?? {}) as NotificationData;

const isRepeatedRequest = (request: NotificationRequest) => {
  const data = dataOf(request);
  return data.type === NOTIFICATION_TYPE || data.isRepeatedTask === true;
};

const occurrenceKey = (taskId: string, date: string) => `${taskId}|${date}`;

// El aviso lleva el título en el idioma en que se programó: si el idioma cambia, la firma
// deja de coincidir y la sincronización lo sustituye por uno en el idioma nuevo
const signatureOf = (item: PlannedNotification) =>
  `${notificationTexts.language()}|${item.signature}`;

// Los stores se cargan de forma asíncrona desde AsyncStorage. Sincronizar antes de que
// terminen vería "ninguna tarea" y cancelaría todos los avisos.
const whenHydrated = (store: {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
}) =>
  new Promise<void>((resolve) => {
    if (store.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });

/**
 * Avisos de las tareas repetidas con recordatorio.
 *
 * Se programan por adelantado los próximos días (ver NOTIFICATION_HORIZON_DAYS), no solo hoy,
 * para que suenen aunque no abras la app. Cada sincronización compara lo que debería haber con
 * lo que el sistema tiene programado y corrige la diferencia, así que se puede llamar las veces
 * que haga falta: al abrir la app, al volver a ella y cuando cambian las tareas.
 */
export class RepeatedTaskNotificationService {
  private static syncing: Promise<void> | null = null;
  private static resyncRequested = false;
  private static lastSyncDate = "";
  private static legacyStateRemoved = false;
  private static autoSyncUsers = 0;
  private static stopAutoSync: (() => void) | null = null;

  /**
   * Deja programados exactamente los avisos que deben existir ahora mismo.
   * Si ya hay una sincronización en marcha no lanza otra en paralelo (habría avisos duplicados):
   * pide una más al terminar, con los datos ya actualizados, y ambas llamadas esperan a la misma.
   */
  static syncScheduledNotifications(): Promise<void> {
    if (this.syncing) {
      this.resyncRequested = true;
      return this.syncing;
    }

    this.syncing = (async () => {
      try {
        do {
          this.resyncRequested = false;
          await this.runSync();
        } while (this.resyncRequested);
      } finally {
        this.syncing = null;
      }
    })();

    return this.syncing;
  }

  private static async runSync(): Promise<void> {
    try {
      await Promise.all([
        whenHydrated(useAgendaTasksStore),
        whenHydrated(useRepeatingTasksStore),
      ]);
      await this.removeLegacyState();

      const now = new Date();
      const scheduled = await getAllScheduledNotificationsAsync();
      const ours = scheduled.filter(isRepeatedRequest);
      // Lo que ya ocupan los recordatorios normales cuenta para el tope del sistema
      const othersCount = scheduled.length - ours.length;

      const planned = planRepeatedNotifications({
        now,
        tasksByDate: useAgendaTasksStore.getState().tasksByDate,
        patterns: useRepeatingTasksStore.getState().repeatingPatterns,
        completions: useRepeatingTasksStore.getState().repeatingTaskCompletions,
        maxNotifications: Math.max(0, MAX_PENDING_NOTIFICATIONS - othersCount),
      });
      const plannedByKey = new Map(
        planned.map((item) => [occurrenceKey(item.originalTaskId, item.date), item])
      );

      // 1. Cancelar lo que sobra o ha cambiado: serie borrada, fecha saltada, otra hora u
      //    otro texto, duplicados, y los avisos del sistema antiguo (no llevan fecha de ocurrencia)
      const upToDate = new Set<string>();
      for (const request of ours) {
        const { type, originalTaskId, occurrenceDate, signature } = dataOf(request);
        const key =
          type === NOTIFICATION_TYPE && originalTaskId && occurrenceDate
            ? occurrenceKey(originalTaskId, occurrenceDate)
            : null;
        const wanted = key ? plannedByKey.get(key) : undefined;

        if (key && wanted && !upToDate.has(key) && signature === signatureOf(wanted)) {
          upToDate.add(key);
        } else {
          await this.cancel(request.identifier);
        }
      }

      // 2. Programar lo que falta
      for (const item of planned) {
        if (!upToDate.has(occurrenceKey(item.originalTaskId, item.date))) {
          await this.schedule(item);
        }
      }

      this.lastSyncDate = dateToLocalDateString(now);
    } catch (error) {
      console.error("Error syncing repeated task notifications:", error);
    }
  }

  private static async schedule(item: PlannedNotification): Promise<void> {
    try {
      await scheduleNotificationAsync({
        content: {
          title: notificationTexts.repeatedTaskTitle(item.text),
          body: notificationTexts.repeatedTaskBody(),
          // Sin `taskId` a propósito: cancelTaskReminder(taskId), al editar la tarea original,
          // cancela todo lo que lleve ese campo, y estos avisos los gestiona esta clase
          data: {
            type: NOTIFICATION_TYPE,
            isRepeatedTask: true,
            originalTaskId: item.originalTaskId,
            occurrenceDate: item.date,
            signature: signatureOf(item),
            repeatOption: item.repeatOption,
            startDate: item.startDate,
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: item.fireAt,
          channelId: Platform.OS === "android" ? "task-reminders" : undefined,
        },
      });
    } catch (error) {
      console.error(
        `Error scheduling notification for repeated task ${item.originalTaskId} (${item.date}):`,
        error
      );
    }
  }

  private static async cancel(identifier: string): Promise<void> {
    try {
      await cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error(`Error cancelling notification ${identifier}:`, error);
    }
  }

  // El sistema antiguo guardaba aquí la lista de avisos de hoy; con el nuevo ya no hace falta
  private static async removeLegacyState(): Promise<void> {
    if (this.legacyStateRemoved) return;
    this.legacyStateRemoved = true;

    try {
      await AsyncStorage.removeItem(LEGACY_CHECK_KEY);
    } catch (error) {
      console.error("Error removing legacy notification state:", error);
    }
  }

  /**
   * Cancela ya los avisos programados de una tarea repetida, entre dos fechas (ambas incluidas,
   * en hora local; sin límite si no se indica). Se usa al borrar una ocurrencia o una serie para
   * que no llegue a sonar; la sincronización posterior lo confirmaría igualmente.
   */
  static async cancelNotificationsForTask(
    taskId: string,
    range: { from?: string; to?: string } = {}
  ): Promise<void> {
    try {
      const scheduled = await getAllScheduledNotificationsAsync();

      for (const request of scheduled) {
        if (!isRepeatedRequest(request)) continue;

        const data = dataOf(request);
        if ((data.originalTaskId ?? data.taskId) !== taskId) continue;

        // Los del sistema antiguo no llevan fecha de ocurrencia: se cancelan siempre
        const day = data.occurrenceDate;
        const inRange =
          !day ||
          ((!range.from || day >= range.from) && (!range.to || day <= range.to));

        if (inRange) await this.cancel(request.identifier);
      }
    } catch (error) {
      console.error("Error cancelling repeated task notifications:", error);
    }
  }

  /**
   * Mantiene los avisos al día mientras la app está en uso: sincroniza al empezar, al volver a
   * primer plano y (juntando cambios seguidos) cuando cambian tareas, patrones o completados.
   * Varias pantallas pueden pedirlo a la vez; hay una sola suscripción compartida.
   * Devuelve la función para dejar de pedirlo.
   */
  static startAutoSync(debounceMs: number = AUTO_SYNC_DEBOUNCE_MS): () => void {
    this.autoSyncUsers++;
    if (this.autoSyncUsers === 1) {
      this.stopAutoSync = this.createAutoSync(debounceMs);
    }

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      this.autoSyncUsers--;
      if (this.autoSyncUsers === 0) {
        this.stopAutoSync?.();
        this.stopAutoSync = null;
      }
    };
  }

  private static createAutoSync(debounceMs: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const requestSync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void RepeatedTaskNotificationService.syncScheduledNotifications();
      }, debounceMs);
    };

    // Al abrir la app
    void RepeatedTaskNotificationService.syncScheduledNotifications();

    // Al cambiar de idioma (o cuando i18next termina de arrancar) hay que reescribir los textos
    i18n.on("languageChanged", requestSync);
    i18n.on("initialized", requestSync);

    const stopAgenda = useAgendaTasksStore.subscribe((state, previous) => {
      if (state.tasksByDate !== previous.tasksByDate) requestSync();
    });
    const stopRepeating = useRepeatingTasksStore.subscribe((state, previous) => {
      if (
        state.repeatingPatterns !== previous.repeatingPatterns ||
        state.repeatingTaskCompletions !== previous.repeatingTaskCompletions
      ) {
        requestSync();
      }
    });
    const appState = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void RepeatedTaskNotificationService.syncScheduledNotifications();
      }
    });

    return () => {
      clearTimeout(timer);
      i18n.off("languageChanged", requestSync);
      i18n.off("initialized", requestSync);
      stopAgenda();
      stopRepeating();
      appState.remove();
    };
  }

  /**
   * Fuerza una sincronización (útil para comprobar desde Ajustes)
   */
  static async forceNewCheck(): Promise<void> {
    await this.syncScheduledNotifications();
  }

  /**
   * Obtiene estadísticas del sistema de notificaciones
   */
  static async getNotificationStats() {
    const repeated = (await getAllScheduledNotificationsAsync()).filter(
      isRepeatedRequest
    );

    return {
      lastCheckDate: this.lastSyncDate,
      activeNotifications: repeated.length,
      notifications: repeated.map((request) => {
        const data = dataOf(request);
        return {
          notificationId: request.identifier,
          taskId: data.originalTaskId ?? data.taskId ?? "",
          date: data.occurrenceDate ?? "",
        };
      }),
    };
  }
}
