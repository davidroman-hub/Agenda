import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { dateToLocalDateString } from "./date-utils";
import { addDaysToDateKey, patternOccursOn } from "./repeat-utils";

/** Cuántos días por delante se programan los avisos de las tareas repetidas (contando hoy) */
export const NOTIFICATION_HORIZON_DAYS = 14;

/** Un aviso que debería estar programado para una ocurrencia concreta de una tarea repetida */
export interface PlannedNotification {
  /** id de la tarea original de la serie */
  originalTaskId: string;
  /** Día de la ocurrencia, YYYY-MM-DD en hora local */
  date: string;
  /** Instante en el que debe sonar */
  fireAt: Date;
  text: string;
  repeatOption: string;
  startDate: string;
  /**
   * Cambia si cambia lo que se muestra o cuándo suena (texto, hora). Permite saber
   * si un aviso ya programado sigue valiendo o hay que sustituirlo.
   */
  signature: string;
}

export interface PlanInput {
  now: Date;
  tasksByDate: Record<string, DayTasks>;
  patterns: RepeatingTaskPattern[];
  completions: Record<string, boolean>;
  horizonDays?: number;
  /** Tope de avisos (el sistema limita cuántos puede haber pendientes); se conservan los más próximos */
  maxNotifications?: number;
}

// Día y tarea donde está guardada cada tarea original (si un id está en varias fechas, gana la última, como en buildDayTasks)
function findOriginals(tasksByDate: Record<string, DayTasks>, ids: Set<string>) {
  const originals = new Map<string, { task: AgendaTask; date: string }>();
  for (const [date, dayTasks] of Object.entries(tasksByDate)) {
    for (const task of Object.values(dayTasks)) {
      if (task && ids.has(task.id)) originals.set(task.id, { task, date });
    }
  }
  return originals;
}

/**
 * Calcula qué avisos deben existir para las tareas repetidas con recordatorio, en los
 * próximos días. Es una función pura: no programa nada, solo dice qué debería haber.
 *
 * - Un aviso por ocurrencia, a la hora del día del recordatorio de la tarea original.
 * - No hay aviso el día de la propia tarea original (ese lo programa su recordatorio normal),
 *   ni en fechas saltadas, ni tras el fin de la serie, ni en ocurrencias ya completadas.
 * - No se planifica lo que ya ha pasado (p. ej. las 10:00 de hoy si ya son las 11:00).
 * - Salen ordenados por hora de aviso, y se recortan a `maxNotifications` conservando los más próximos.
 */
export function planRepeatedNotifications({
  now,
  tasksByDate,
  patterns,
  completions,
  horizonDays = NOTIFICATION_HORIZON_DAYS,
  maxNotifications = Number.POSITIVE_INFINITY,
}: PlanInput): PlannedNotification[] {
  const activePatterns = patterns.filter((pattern) => pattern.isActive);
  const originals = findOriginals(
    tasksByDate,
    new Set(activePatterns.map((pattern) => pattern.originalTaskId))
  );

  const today = dateToLocalDateString(now);
  const planned: PlannedNotification[] = [];

  for (const pattern of activePatterns) {
    const original = originals.get(pattern.originalTaskId);
    if (!original?.task.reminder) continue;

    const reminder = new Date(original.task.reminder);
    if (Number.isNaN(reminder.getTime())) continue;
    const hours = reminder.getHours();
    const minutes = reminder.getMinutes();

    for (let offset = 0; offset < horizonDays; offset++) {
      const date = addDaysToDateKey(today, offset);

      if (date === original.date) continue;
      if (!patternOccursOn(pattern, date)) continue;
      if (completions[`${pattern.originalTaskId}-${date}`]) continue;

      // Se construye con componentes locales (no sumando milisegundos) para que la hora
      // siga siendo la misma al cruzar un cambio de horario
      const [year, month, day] = date.split("-").map(Number);
      const fireAt = new Date(year, month - 1, day, hours, minutes, 0, 0);
      if (fireAt.getTime() <= now.getTime()) continue;

      planned.push({
        originalTaskId: pattern.originalTaskId,
        date,
        fireAt,
        text: original.task.text,
        repeatOption: pattern.repeatOption,
        startDate: pattern.startDate,
        signature: `${original.task.text}|${fireAt.getTime()}`,
      });
    }
  }

  planned.sort(
    (a, b) =>
      a.fireAt.getTime() - b.fireAt.getTime() ||
      a.originalTaskId.localeCompare(b.originalTaskId)
  );

  return planned.slice(0, maxNotifications);
}
