import { mmkvStorage } from "@/lib/mmkv";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import WidgetStore from "@/stores/widget-store";
import { useCallback, useEffect } from "react";

// Hook para sincronizar datos del widget
export const useWidgetSync = () => {
  const { tasksByDate } = useAgendaTasksStore();

  // Función para crear datos estáticos de prueba
  const createStaticWidgetData = useCallback(async () => {
    await WidgetStore.createStaticTestData();

    // Verificar que se guardaron
    const savedData = await WidgetStore.getWidgetData();
    console.log("📱 Datos guardados verificados:", savedData);
  }, []);

  // Función para sincronizar datos reales desde Zustand store
  const syncRealDataToWidget = useCallback(
    async (date: string) => {
      try {
        const dayTasks = tasksByDate[date] || {};

        // Crear un array simple de las tareas del día
        const tasksList = [];
        let totalTasks = 0;
        let completedTasks = 0;

        for (const [, task] of Object.entries(dayTasks)) {
          if (task?.text) {
            totalTasks++;
            if (task.completed) {
              completedTasks++;
            } else if (tasksList.length < 3) {
              // Solo agregar tareas no completadas al widget (máximo 3)
              tasksList.push(task.text);
            }
          }
        }

        // Actualizar Widget Store con datos reales
        await WidgetStore.updateWidgetData({
          tasks: tasksList,
          totalTasks,
          completedTasks,
          date,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("❌ Error sincronizando datos reales:", error);
      }
    },
    [tasksByDate]
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

    // Verificar si hay tareas para hoy en Zustand
    const todayTasks = tasksByDate[today] || {};

    if (Object.keys(todayTasks).length > 0) {
      // Si hay datos reales, usarlos
      await syncRealDataToWidget(today);
    } else {
      // Si no hay datos reales, usar datos estáticos

      await createStaticWidgetData();
    }
  }, [tasksByDate, syncRealDataToWidget, createStaticWidgetData]);

  // Función para forzar sincronización manual (útil para debugging)
  const forceSyncWidget = useCallback(async () => {
    await syncTodayWidget();
    await forceWidgetUpdate();
  }, [syncTodayWidget, forceWidgetUpdate]);

  // Sincronizar automáticamente cuando cambien las tareas O al inicio
  useEffect(() => {
    syncTodayWidget();
  }, [tasksByDate, syncTodayWidget]);

  return {
    syncRealDataToWidget,
    syncTodayWidget,
    forceSyncWidget,
    forceWidgetUpdate,
    createStaticWidgetData,
  };
};
