import { mmkvStorage } from "@/lib/mmkv";
import useAgendaTasksStore, { AgendaTask } from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import WidgetStore from "@/stores/widget-store";
import { getCurrentLocalDateString } from "@/utils/date-utils";
import { buildDayTasks } from "@/utils/day-tasks";
import { useCallback, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

// Hook para sincronizar datos del widget
export const useWidgetSync = () => {
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const repeatingPatterns = useRepeatingTasksStore(
    (state) => state.repeatingPatterns
  );
  const repeatingCompletions = useRepeatingTasksStore(
    (state) => state.repeatingTaskCompletions
  );

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
        // Tareas del día (normales + instancias de tareas repetidas). La lógica vive en
        // utils/day-tasks.ts y es la misma que usan el libro y el calendario
        const { normalTasks, repeatedTasks } = buildDayTasks(
          date,
          tasksByDate,
          repeatingPatterns,
          repeatingCompletions
        );

        const finalTasks = [
          ...Object.values(normalTasks)
            .filter((task): task is AgendaTask => Boolean(task?.text))
            .map((task) => ({
              text: task.text,
              completed: task.completed,
              isRepeating: false,
            })),
          ...repeatedTasks.map((task) => ({
            text: task.text,
            completed: task.completed,
            isRepeating: true,
          })),
        ];

        // Crear array de tareas pendientes para el widget
        const pendingTasksList = [];
        let totalTasks = finalTasks.length;
        let completedTasks = 0;

        for (const task of finalTasks) {
          if (task.completed) {
            completedTasks++;
          } else {
            // Agregar indicador visual para tareas repetidas
            const taskText = task.isRepeating ? `🔄 ${task.text}` : task.text;
            pendingTasksList.push(taskText);
          }
        }

        // Actualizar Widget Store con datos reales
        await WidgetStore.updateWidgetData({
          tasks: pendingTasksList,
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
    [tasksByDate, repeatingPatterns, repeatingCompletions]
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

    // Siempre usar la función de datos reales ya que ahora maneja todos los casos
    await syncRealDataToWidget(today);
  }, [syncRealDataToWidget]);

  // Función para forzar sincronización manual (útil para debugging)
  const forceSyncWidget = useCallback(async () => {
    await syncTodayWidget();
    await forceWidgetUpdate();
  }, [syncTodayWidget, forceWidgetUpdate]);

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
