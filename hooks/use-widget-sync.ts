import { mmkvStorage } from "@/lib/mmkv";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import WidgetStore from "@/stores/widget-store";
import { getCurrentLocalDateString } from "@/utils/date-utils";
import { useCallback, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

// Hook para sincronizar datos del widget
export const useWidgetSync = () => {
  const { tasksByDate } = useAgendaTasksStore();
  const {
    getAllRepeatingPatterns,
    shouldTaskRepeatOnDate,
    isRepeatingTaskCompleted,
  } = useRepeatingTasksStore();

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

        // Obtener tareas repetidas para esta fecha
        const allPatterns = getAllRepeatingPatterns();

        // Filtrar tareas normales que tienen patrones activos (para evitar duplicar)
        const tasksWithActivePatterns = new Set(
          allPatterns
            .filter((pattern) => pattern.isActive)
            .map((pattern) => pattern.originalTaskId)
        );

        // Crear array de tareas combinadas (normales + repetidas)
        const allTasks = [];

        // Agregar tareas normales (excluyendo las que tienen patrones activos)
        for (const [, task] of Object.entries(dayTasks)) {
          if (task?.text && !tasksWithActivePatterns.has(task.id)) {
            allTasks.push({
              id: task.id,
              text: task.text,
              completed: task.completed,
              isRepeating: false,
            });
          }
        }

        // Agregar tareas repetidas para esta fecha
        for (const pattern of allPatterns) {
          if (!pattern.isActive) continue;

          if (shouldTaskRepeatOnDate(pattern.originalTaskId, date)) {
            // Buscar la tarea original
            const originalTask = Object.values(tasksByDate)
              .flatMap((dayTasks) => Object.values(dayTasks))
              .find(
                (task) => task !== null && task.id === pattern.originalTaskId
              );

            if (originalTask) {
              const isCompleted = isRepeatingTaskCompleted(
                pattern.originalTaskId,
                date
              );
              allTasks.push({
                id: `${originalTask.id}-repeat-${date}`,
                text: originalTask.text,
                completed: isCompleted,
                isRepeating: true,
              });
            }
          }
        }

        // Crear un array simple de las tareas pendientes
        const pendingTasksList = []; // Solo tareas NO completadas
        let totalTasks = allTasks.length;
        let completedTasks = 0;

        for (const task of allTasks) {
          if (task.completed) {
            completedTasks++;
          } else {
            // Solo agregar tareas NO completadas al array, con indicador de repetición
            const taskText = task.isRepeating ? `🔄 ${task.text}` : task.text;
            pendingTasksList.push(taskText);
          }
        }

        // Actualizar Widget Store con datos reales
        await WidgetStore.updateWidgetData({
          tasks: pendingTasksList, // Array con solo las tareas pendientes
          totalTasks,
          completedTasks,
          date,
          timestamp: Date.now(),
        });

        // Debugging: listar todas las claves guardadas
        await WidgetStore.debugListAllKeys();
      } catch (error) {
        console.error("❌ Error sincronizando datos reales:", error);
      }
    },
    [
      tasksByDate,
      getAllRepeatingPatterns,
      shouldTaskRepeatOnDate,
      isRepeatingTaskCompleted,
    ]
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
    // Usar fecha actual local sin problemas de timezone
    const today = getCurrentLocalDateString();

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

  // Suscribirse a cambios en los stores de tareas repetidas para forzar actualizaciones
  const repeatingPatterns = useRepeatingTasksStore(
    (state) => state.repeatingPatterns
  );
  const repeatingCompletions = useRepeatingTasksStore(
    (state) => state.repeatingTaskCompletions
  );

  // Sincronizar automáticamente cuando cambien las tareas O al inicio
  useEffect(() => {
    // Sincronización inmediata al cargar (con delay para evitar interferencias)
    setTimeout(() => {
      syncTodayWidget();
    }, 1000);

    // Configurar un interval más conservador para sincronizar cada 30 segundos
    const interval = setInterval(() => {
      syncTodayWidget();
    }, 30000); // 30 segundos (menos agresivo)

    return () => clearInterval(interval);
  }, [tasksByDate, repeatingPatterns, repeatingCompletions, syncTodayWidget]);

  // Detectar cuando la app va al background y forzar actualización del widget
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        // Solo sincronizar cuando va al background, sin forzar actualizaciones
        syncTodayWidget();
      } else if (nextAppState === "active") {
        // NO hacer nada especial cuando la app se activa desde el widget
        // Los datos ya están en los stores, solo esperar un poco y sincronizar normalmente
        setTimeout(() => {
          console.log("📱 Sincronización suave después de activar app...");
          syncTodayWidget();
        }, 2000); // Esperar 2 segundos para que los stores se estabilicen
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [syncTodayWidget]); // Removido forceSyncWidget y handleStoreReload

  return {
    syncRealDataToWidget,
    syncTodayWidget,
    forceSyncWidget,
    forceWidgetUpdate,
    createStaticWidgetData,
    // Función de emergencia simplificada para debugging
    emergencyWidgetSync: async () => {
      await syncTodayWidget();
      await forceWidgetUpdate();
    },
  };
};
