import { RepeatedTaskNotificationService } from "@/services/repeated-task-notification-service";
import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

/**
 * Hook que maneja la verificación automática de notificaciones para tareas repetidas
 * Se ejecuta:
 * - Al iniciar la app
 * - Cuando la app vuelve del background (foreground)
 * - Una vez al día como máximo
 */
export const useRepeatedTaskNotifications = () => {
  useEffect(() => {
    // Verificación inicial al cargar la app
    performInitialCheck();

    // Listener para cambios de estado de la app
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // La app está activa (foreground)
        performDailyCheckIfNeeded();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, []);

  const performInitialCheck = async () => {
    try {
      await RepeatedTaskNotificationService.performDailyNotificationCheck();
    } catch (error) {
      console.error("Error en verificación inicial de notificaciones:", error);
    }
  };

  const performDailyCheckIfNeeded = async () => {
    try {
      await RepeatedTaskNotificationService.performDailyNotificationCheck();
    } catch (error) {
      console.error("Error en verificación diaria de notificaciones:", error);
    }
  };

  // Función manual para forzar verificación (útil para debugging)
  const forceCheck = async () => {
    try {
      await RepeatedTaskNotificationService.forceNewCheck();
    } catch (error) {
      console.error("Error en verificación forzada:", error);
    }
  };

  // Función para obtener estadísticas
  const getStats = async () => {
    try {
      return await RepeatedTaskNotificationService.getNotificationStats();
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      return null;
    }
  };

  return {
    forceCheck,
    getStats,
  };
};
