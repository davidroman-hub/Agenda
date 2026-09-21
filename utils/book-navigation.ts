import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import { daysBetweenDateKeys } from "./repeat-utils";

/**
 * Índice de la página del libro que contiene un día. La página 0 empieza hoy; cada página
 * muestra `daysToShow` días, así que hay páginas anteriores (índices negativos) y posteriores.
 */
export function getPageIndexForDate(
  todayKey: string,
  dateKey: string,
  daysToShow: number
): number {
  return Math.floor(
    daysBetweenDateKeys(todayKey, dateKey) / Math.max(1, daysToShow)
  );
}

/**
 * Número de página que se enseña al usuario. Hoy es la página 1, las siguientes 2, 3…
 * y las anteriores -1, -2… (no hay página 0, como no hay año 0).
 */
export function getPageNumber(pageIndex: number): number {
  return pageIndex >= 0 ? pageIndex + 1 : pageIndex;
}

/**
 * Línea de la página en la que se ve una tarea, o null si no está en ese día. Las tareas
 * normales están en su línea; las instancias de una tarea repetida se dibujan después de
 * las líneas de escribir (misma numeración que usa la página).
 */
export function findTaskLine(
  taskId: string,
  normalTasks: DayTasks,
  repeatedTasks: AgendaTask[],
  totalLines: number
): number | null {
  for (const [line, task] of Object.entries(normalTasks)) {
    if (task?.id === taskId) return Number.parseInt(line, 10);
  }

  const index = repeatedTasks.findIndex((task) => task.repeatingTaskId === taskId);
  return index === -1 ? null : totalLines + index + 1;
}

/**
 * Primera línea de escribir sin tarea de un día (de 1 a `totalLines`), o null si están todas ocupadas.
 * Es donde se pone la tarea nueva que se pide desde fuera del libro (p. ej. desde el widget).
 */
export function findFreeLine(normalTasks: DayTasks, totalLines: number): number | null {
  for (let line = 1; line <= totalLines; line++) {
    if (!normalTasks[line]) return line;
  }
  return null;
}
