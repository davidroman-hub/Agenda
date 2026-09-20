import { RepeatedTaskNotificationService } from "@/services/repeated-task-notification-service";
import { useEffect } from "react";

/**
 * Mantiene programados los avisos de las tareas repetidas con recordatorio.
 * Se programan por adelantado los próximos días, así que suenan aunque no abras la app.
 * Se sincronizan:
 * - Al iniciar la app
 * - Cuando la app vuelve del background (foreground)
 * - Cuando cambian las tareas, los patrones de repetición o los completados
 */
export const useRepeatedTaskNotifications = () => {
  useEffect(() => RepeatedTaskNotificationService.startAutoSync(), []);

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
