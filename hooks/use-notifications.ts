import { handleNotificationResponse } from "@/services/notification-navigation";
import { notificationService } from "@/services/notifications/notification-service";
import * as Notifications from "expo-notifications";
import i18n from "i18next";
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

    // Listener para cuando el usuario toca una notificación: lleva el libro al día de la tarea
    responseListener.current =
      notificationService.addNotificationResponseListener(
        handleNotificationResponse
      );

    // Si la app se ha abierto tocando una notificación, ese toque ya ocurrió antes de que existiera
    // el listener: se recupera aquí (si llega por las dos vías, se cuenta como uno)
    try {
      const launchResponse = Notifications.getLastNotificationResponse();
      if (launchResponse) handleNotificationResponse(launchResponse);
    } catch (error) {
      console.warn("No se pudo leer la notificación que abrió la app:", error);
    }

    // El nombre del canal de Android va en el idioma del usuario; se actualiza si cambia
    // (o cuando i18next termina de arrancar)
    const refreshChannelName = () => {
      void notificationService.refreshChannelName();
    };
    i18n.on("languageChanged", refreshChannelName);
    i18n.on("initialized", refreshChannelName);

    return () => {
      // Limpiar listeners al desmontar
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      i18n.off("languageChanged", refreshChannelName);
      i18n.off("initialized", refreshChannelName);
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
