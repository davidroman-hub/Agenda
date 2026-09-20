import { notificationTexts } from "@/utils/notification-texts";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface NotificationData extends Record<string, unknown> {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  taskDate: string;
  type: string;
}

class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    // Configurar cómo se manejan las notificaciones cuando la app está en foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Solicitar permisos para notificaciones
    await this.requestPermissions();
  }

  private async requestPermissions() {
    if (!Device.isDevice) {
      return false;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return false;
    }

    // Configurar canal de notificaciones para Android
    if (Platform.OS === "android") {
      await this.configureAndroidChannel();
    }

    return true;
  }

  // El canal se crea con el nombre en el idioma del momento (es lo que ve el usuario en los
  // ajustes de Android); si cambia de idioma, refreshChannelName lo renombra
  private async configureAndroidChannel() {
    await Notifications.setNotificationChannelAsync("task-reminders", {
      name: notificationTexts.channelName(),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
      enableVibrate: true,
    });
  }

  /** Vuelve a poner el nombre del canal en el idioma actual (solo si el canal ya existe) */
  async refreshChannelName() {
    if (Platform.OS !== "android") return;

    try {
      const channel = await Notifications.getNotificationChannelAsync("task-reminders");
      if (channel) await this.configureAndroidChannel();
    } catch (error) {
      console.error("Error al actualizar el nombre del canal:", error);
    }
  }

  async scheduleTaskReminder(
    taskId: string,
    taskTitle: string,
    taskDescription: string,
    reminderDate: Date,
    taskDate: string
  ): Promise<string | null> {
    try {
      const now = new Date();

      // Verificar que la fecha del recordatorio sea en el futuro
      if (reminderDate <= now) {
        return null;
      }

      // Primero cancelar cualquier notificación existente para esta tarea
      await this.cancelTaskReminder(taskId);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationTexts.taskReminderTitle(),
          body: `${taskTitle}\n${taskDescription}`,
          data: {
            taskId,
            taskTitle,
            taskDescription,
            taskDate,
            type: "task-reminder",
          } as NotificationData,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          channelId: Platform.OS === "android" ? "task-reminders" : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error("Error al programar notificación:", error);
      return null;
    }
  }

  async cancelTaskReminder(taskId: string) {
    try {
      // Obtener todas las notificaciones programadas
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();

      // Encontrar y cancelar notificaciones para esta tarea
      for (const notification of scheduledNotifications) {
        const data = notification.content.data as unknown as NotificationData;
        if (data?.taskId === taskId) {
          await Notifications.cancelScheduledNotificationAsync(
            notification.identifier
          );
        }
      }
    } catch (error) {
      console.error("Error al cancelar notificación:", error);
    }
  }

  async cancelAllTaskReminders() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error al cancelar todas las notificaciones:", error);
    }
  }

  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error al obtener notificaciones programadas:", error);
      return [];
    }
  }

  // Listener para cuando se toca una notificación
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Listener para notificaciones recibidas mientras la app está abierta
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }
}

export const notificationService = NotificationService.getInstance();
