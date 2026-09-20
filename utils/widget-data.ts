import type { DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { buildDayTasksWith, createDayTasksContext } from "./day-tasks";
import { addDaysToDateKey } from "./repeat-utils";

/** Días que se mandan al widget, contando hoy: así sigue mostrando el día correcto aunque la app no se abra */
export const WIDGET_DAYS_AHEAD = 7;

/** El widget enseña unas pocas; más no hace falta y el JSON se mantiene pequeño */
export const WIDGET_MAX_TASKS_PER_DAY = 8;

export interface WidgetTaskItem {
  /** Id con el que la app localiza la tarea: el de la propia tarea o, en una repetida, el de la original */
  id: string;
  text: string;
  repeating: boolean;
}

export interface WidgetDay {
  total: number;
  completed: number;
  /** Solo las pendientes, en el orden del libro */
  tasks: WidgetTaskItem[];
}

/** Lo que lee AgendaWidgetProvider.kt: resumen por día (YYYY-MM-DD en hora local) */
export interface WidgetPayload {
  days: Record<string, WidgetDay>;
}

/**
 * Resume las tareas de `today` y de los `daysAhead` días siguientes para el widget. Usa la misma
 * reconstrucción de día que el libro (`buildDayTasksWith`), así las repetidas cuadran con la app.
 */
export function buildWidgetPayload(
  today: string,
  tasksByDate: Record<string, DayTasks>,
  patterns: RepeatingTaskPattern[],
  completions: Record<string, boolean>,
  daysAhead: number = WIDGET_DAYS_AHEAD
): WidgetPayload {
  const context = createDayTasksContext(tasksByDate, patterns);
  const days: Record<string, WidgetDay> = {};

  for (let offset = 0; offset <= daysAhead; offset++) {
    const dateKey = addDaysToDateKey(today, offset);
    const { normalTasks, repeatedTasks } = buildDayTasksWith(context, dateKey, tasksByDate, completions);

    const items: { text: string; completed: boolean; item: WidgetTaskItem }[] = [];
    for (const task of Object.values(normalTasks)) {
      if (task?.text) {
        items.push({ text: task.text, completed: task.completed, item: { id: task.id, text: task.text, repeating: false } });
      }
    }
    for (const task of repeatedTasks) {
      if (task.text) {
        items.push({
          text: task.text,
          completed: task.completed,
          item: { id: task.repeatingTaskId ?? task.id, text: task.text, repeating: true },
        });
      }
    }

    const pending = items.filter((entry) => !entry.completed);
    days[dateKey] = {
      total: items.length,
      completed: items.length - pending.length,
      tasks: pending.slice(0, WIDGET_MAX_TASKS_PER_DAY).map((entry) => entry.item),
    };
  }

  return { days };
}
