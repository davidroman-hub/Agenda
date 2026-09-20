import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { shouldRepeatOnDate } from "./repeat-utils";

export interface DayTasksResult {
  /** Tareas propias del día, indexadas por número de línea */
  normalTasks: DayTasks;
  /** Instancias virtuales de tareas repetidas que caen en este día */
  repeatedTasks: AgendaTask[];
}

/**
 * Reconstruye lo que se muestra en un día concreto a partir de los datos crudos
 * de los stores: las tareas del propio día más las instancias virtuales de las
 * tareas repetidas. Es una función pura (no lee ni escribe en ningún store).
 *
 * - La tarea original de un patrón repetido vive en su día de creación; en los
 *   demás días que toque solo aparece como instancia virtual, con id
 *   `<idOriginal>-repeat-<fecha>` y su propio estado de completado.
 * - Si un mismo id aparece en varias fechas (datos antiguos duplicados), cuenta
 *   como original la última fecha recorrida y se quita la copia de las demás.
 * - Los patrones inactivos, o cuya tarea original ya no existe, no generan nada.
 *
 * @param dateKey      Día a reconstruir, YYYY-MM-DD en hora local
 * @param tasksByDate  `tasksByDate` del store de tareas
 * @param patterns     `repeatingPatterns` del store de repeticiones
 * @param completions  `repeatingTaskCompletions` del store de repeticiones
 */
export function buildDayTasks(
  dateKey: string,
  tasksByDate: Record<string, DayTasks>,
  patterns: RepeatingTaskPattern[],
  completions: Record<string, boolean>
): DayTasksResult {
  // id de tarea -> la tarea y la fecha en la que está guardada
  const originalTasksMap = new Map<
    string,
    { task: AgendaTask; originalDate: string }
  >();
  for (const [date, dayTasks] of Object.entries(tasksByDate)) {
    for (const task of Object.values(dayTasks)) {
      if (task) {
        originalTasksMap.set(task.id, { task, originalDate: date });
      }
    }
  }

  const activePatterns = patterns.filter((pattern) => pattern.isActive);
  const idsWithActivePattern = new Set(
    activePatterns.map((pattern) => pattern.originalTaskId)
  );

  // Tareas del día; se quitan las copias de tareas repetidas que pertenecen a otro día
  const normalTasks: DayTasks = { ...tasksByDate[dateKey] };
  for (const [line, task] of Object.entries(normalTasks)) {
    if (task && idsWithActivePattern.has(task.id)) {
      const originalInfo = originalTasksMap.get(task.id);
      if (originalInfo && originalInfo.originalDate !== dateKey) {
        delete normalTasks[Number.parseInt(line, 10)];
      }
    }
  }

  // Instancias virtuales (nunca en el día de creación de la original)
  const repeatedTasks: AgendaTask[] = [];
  for (const pattern of activePatterns) {
    if (!shouldRepeatOnDate(pattern.repeatOption, pattern.startDate, dateKey)) {
      continue;
    }

    const originalInfo = originalTasksMap.get(pattern.originalTaskId);
    if (originalInfo && originalInfo.originalDate !== dateKey) {
      repeatedTasks.push({
        ...originalInfo.task,
        id: `${originalInfo.task.id}-repeat-${dateKey}`,
        completed: Boolean(completions[`${originalInfo.task.id}-${dateKey}`]),
        isRepeatingTask: true,
        repeatingTaskId: originalInfo.task.id,
        repeatingPatternId: pattern.id,
      });
    }
  }

  return { normalTasks, repeatedTasks };
}
