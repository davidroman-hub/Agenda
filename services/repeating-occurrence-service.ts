import useAgendaTasksStore, { DayTasks } from "../stores/agenda-tasks-store";
import useRepeatingTasksStore from "../stores/repeating-tasks-store";
import { hasOccurrencesAfterStart } from "../utils/repeat-utils";
import { RepeatedTaskNotificationService } from "./repeated-task-notification-service";

/**
 * Qué se borra al eliminar una ocurrencia de una tarea repetida:
 * - "this":      solo esa fecha; la serie sigue con normalidad en las demás
 * - "following": esa fecha y todas las siguientes; las anteriores se quedan
 * - "all":       la serie entera, incluida la tarea original del día en que empezó
 */
export type RepeatDeleteScope = "this" | "following" | "all";

// Día y línea donde está guardada una tarea (o null si ya no existe)
function findTaskLocation(
  tasksByDate: Record<string, DayTasks>,
  taskId: string
): { date: string; line: number } | null {
  for (const [date, dayTasks] of Object.entries(tasksByDate)) {
    for (const [line, task] of Object.entries(dayTasks)) {
      if (task?.id === taskId) return { date, line: Number.parseInt(line, 10) };
    }
  }
  return null;
}

// Si tras borrar ocurrencias la serie ya no se repite nunca más, la tarea original
// vuelve a ser una tarea normal (si no, seguiría marcada como repetida sin repetirse)
async function turnIntoNormalTaskIfSeriesIsOver(originalTaskId: string) {
  const pattern = useRepeatingTasksStore
    .getState()
    .getRepeatingPatternForTask(originalTaskId);
  if (!pattern || hasOccurrencesAfterStart(pattern)) return;

  useRepeatingTasksStore.getState().removeRepeatingPattern(originalTaskId);

  const location = findTaskLocation(
    useAgendaTasksStore.getState().tasksByDate,
    originalTaskId
  );
  if (location) {
    await useAgendaTasksStore
      .getState()
      .updateTask(location.date, location.line, { repeat: "none" });
  }
}

/**
 * Borra una ocurrencia de una serie repetida según el alcance elegido.
 *
 * @param originalTaskId  id de la tarea original de la serie
 * @param date            día (YYYY-MM-DD) de la ocurrencia sobre la que se ha pulsado borrar
 */
export async function deleteRepeatingOccurrence(
  scope: RepeatDeleteScope,
  originalTaskId: string,
  date: string
): Promise<void> {
  const repeating = useRepeatingTasksStore.getState();

  if (scope === "all") {
    const location = findTaskLocation(
      useAgendaTasksStore.getState().tasksByDate,
      originalTaskId
    );

    repeating.removeRepeatingPattern(originalTaskId);
    if (location) {
      await useAgendaTasksStore.getState().deleteTask(location.date, location.line);
    }
    await RepeatedTaskNotificationService.cancelNotificationsForTask(originalTaskId);
    return;
  }

  if (scope === "this") {
    repeating.skipOccurrence(originalTaskId, date);
    await RepeatedTaskNotificationService.cancelNotificationsForTask(originalTaskId, {
      from: date,
      to: date,
    });
  } else {
    repeating.endSeriesBefore(originalTaskId, date);
    await RepeatedTaskNotificationService.cancelNotificationsForTask(originalTaskId, {
      from: date,
    });
  }

  await turnIntoNormalTaskIfSeriesIsOver(originalTaskId);
}
