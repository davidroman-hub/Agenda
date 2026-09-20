import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import WidgetStore from "@/stores/widget-store";
import { getCurrentLocalDateString } from "@/utils/date-utils";
import { buildWidgetPayload } from "@/utils/widget-data";
import { useCallback, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

// Mantiene el widget de Android al día: le manda hoy y los próximos días, así sigue mostrando el día
// correcto aunque la app no se abra (ver AgendaWidgetProvider.kt)
export const useWidgetSync = () => {
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const repeatingPatterns = useRepeatingTasksStore(
    (state) => state.repeatingPatterns
  );
  const repeatingCompletions = useRepeatingTasksStore(
    (state) => state.repeatingTaskCompletions
  );

  const syncWidget = useCallback(() => {
    void WidgetStore.updateWidgetData(
      buildWidgetPayload(
        getCurrentLocalDateString(),
        tasksByDate,
        repeatingPatterns,
        repeatingCompletions
      )
    );
  }, [tasksByDate, repeatingPatterns, repeatingCompletions]);

  // Al cargar y cuando cambian las tareas; el intervalo cubre que la app siga abierta al cambiar de día
  // (WidgetStore no reenvía si no hay cambios)
  useEffect(() => {
    const timeout = setTimeout(syncWidget, 1000);
    const interval = setInterval(syncWidget, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [syncWidget]);

  // Al pasar a segundo plano se deja el widget al día; al volver, una vez que los stores se estabilizan
  useEffect(() => {
    let resumeTimeout: ReturnType<typeof setTimeout> | undefined;

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "background" || nextAppState === "inactive") {
          syncWidget();
        } else if (nextAppState === "active") {
          clearTimeout(resumeTimeout);
          resumeTimeout = setTimeout(syncWidget, 2000);
        }
      }
    );

    return () => {
      clearTimeout(resumeTimeout);
      subscription.remove();
    };
  }, [syncWidget]);

  return { syncWidget };
};
