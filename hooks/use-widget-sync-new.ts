import { mmkvStorage } from "@/lib/mmkv";
import WidgetService from "@/services/widgets/widget-service";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import WidgetStore from "@/stores/widget-store";
import { useCallback, useEffect } from "react";

// Hook para sincronizar datos del widget
export const useWidgetSync = () => {
  const { tasksByDate } = useAgendaTasksStore();
  const { repeatingTaskCompletions } = useRepeatingTasksStore();

  // Función para crear datos estáticos de prueba
  const createStaticWidgetData = useCallback(async () => {
    await WidgetStore.createStaticTestData();

    // Verificar que se guardaron
    const savedData = await WidgetStore.getWidgetData();
    console.log("📱 Datos guardados verificados:", savedData);
  }, []);

  // Función para sincronizar datos reales usando el WidgetService
  const syncRealDataToWidget = useCallback(
    async (date: string) => {
      try {
        console.log("🔄 Sincronizando datos del widget para fecha:", date);

        // Usar el WidgetService que ya tiene la lógica de tareas repetidas
        const widgetData = WidgetService.getCurrentDayData();
        
        console.log("📊 Datos del widget generados:", widgetData);

        // Filtrar solo tareas no completadas para mostrar en el widget (máximo 3)
        const pendingTasksTexts = widgetData.todayTasks
          .filter(task => !task.completed)
          .slice(0, 3)
          .map(task => task.text);

        // Actualizar Widget Store con datos del servicio
        await WidgetStore.updateWidgetData({
          tasks: pendingTasksTexts,
          totalTasks: widgetData.tasksCount,
          completedTasks: widgetData.completedTasks,
          date: date,
          timestamp: Date.now(),
        });

        // Debugging: listar todas las claves guardadas
        await WidgetStore.debugListAllKeys();

        // Forzar actualización del widget
        await WidgetStore.forceWidgetUpdate();
      } catch (error) {
        console.error("❌ Error sincronizando datos reales:", error);
      }
    },
    [] // Sin dependencias ya que WidgetService maneja el estado internamente
  );

  const forceWidgetUpdate = useCallback(async () => {
    try {
      // Crear datos estáticos primero
      await createStaticWidgetData();

      // Actualizar timestamp para forzar cambios
      const timestamp = Date.now();
      await mmkvStorage.setItem("widget_force_update", timestamp.toString());
    } catch (error) {
      console.error("❌ Error forzando actualización del widget:", error);
    }
  }, [createStaticWidgetData]);

  const syncTodayWidget = useCallback(async () => {
    // Usar fecha actual dinámica
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD formato actual

    // Usar WidgetService que incluye tareas repetidas
    await syncRealDataToWidget(today);
  }, [syncRealDataToWidget]);

  // Función para forzar sincronización manual (útil para debugging)
  const forceSyncWidget = useCallback(async () => {
    await syncTodayWidget();
    await forceWidgetUpdate();
  }, [syncTodayWidget, forceWidgetUpdate]);

  // Sincronizar automáticamente cuando cambien las tareas O al inicio
  useEffect(() => {
    syncTodayWidget();
  }, [tasksByDate, repeatingTaskCompletions, syncTodayWidget]);

  return {
    syncRealDataToWidget,
    syncTodayWidget,
    forceSyncWidget,
    forceWidgetUpdate,
    createStaticWidgetData,
  };
};
