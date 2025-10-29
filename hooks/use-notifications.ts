import { notificationService } from "@/services/notifications/notification-service";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

export function useNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Inicializar el servicio de notificaciones
    notificationService.initialize();

    // Listener para notificaciones recibidas mientras la app está abierta
    notificationListener.current =
      notificationService.addNotificationReceivedListener((notification) => {
        console.log("Notificación recibida:", notification);
        // Aquí puedes agregar lógica adicional como mostrar un toast
      });

    // Listener para cuando el usuario toca una notificación
    responseListener.current =
      notificationService.addNotificationResponseListener((response) => {
        console.log("Notificación tocada:", response);
        const data = response.notification.request.content.data;

        // Aquí puedes agregar navegación o acciones específicas
        if (data?.type === "task-reminder") {
          // Ejemplo: navigation.navigate('TaskDetail', { taskId: data.taskId });
        }
      });

    return () => {
      // Limpiar listeners al desmontar
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    // Funciones auxiliares que puedes usar en componentes
    scheduleTaskReminder:
      notificationService.scheduleTaskReminder.bind(notificationService),
    cancelTaskReminder:
      notificationService.cancelTaskReminder.bind(notificationService),
    getScheduledNotifications:
      notificationService.getScheduledNotifications.bind(notificationService),
  };
}
