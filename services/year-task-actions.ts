import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useBookNavigationStore from "@/stores/book-navigation-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import type { YearEntry, YearSeries } from "@/utils/year-view";

/**
 * Acciones de la lista de la vista de año. Hacen lo mismo que el libro: una tarea propia se marca
 * en su línea, y una ocurrencia de una tarea repetida se marca en el store de repeticiones.
 */

export function toggleYearEntry(entry: YearEntry): void {
  if (entry.line === null) {
    useRepeatingTasksStore
      .getState()
      .toggleRepeatingTaskCompletion(entry.task.repeatingTaskId ?? entry.task.id, entry.dateKey);
  } else {
    useAgendaTasksStore.getState().toggleTaskCompletion(entry.dateKey, entry.line);
  }
}

// Llevar el libro a un día y abrir la tarea es lo mismo que hace tocar una notificación: se deja la
// petición en el store y el libro (que cambia solo a su vista) la atiende
export function openEntryInBook(entry: YearEntry): void {
  useBookNavigationStore
    .getState()
    .requestTarget(entry.dateKey, entry.task.repeatingTaskId ?? entry.task.id);
}

export function openSeriesInBook(series: YearSeries): void {
  useBookNavigationStore.getState().requestTarget(series.firstDateKey, series.originalId);
}

// Sin tarea que abrir: el id vacío no coincide con ninguna y el libro solo va a ese día
export function openDayInBook(dateKey: string): void {
  useBookNavigationStore.getState().requestTarget(dateKey, "");
}
