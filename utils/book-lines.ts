import type { DayTasks } from "../stores/agenda-tasks-store";

export interface LineStatus {
  /** Líneas con una tarea escrita, de menor a mayor */
  occupiedLines: number[];
  /** Líneas libres dentro de las que muestra la página, de menor a mayor */
  availableLines: number[];
  /** Cuántas líneas dibuja la página ese día */
  totalLines: number;
}

/** Número de la última línea que tiene una tarea (0 si el día está vacío) */
export function getHighestUsedLine(dayTasks?: DayTasks): number {
  let highest = 0;
  for (const [line, task] of Object.entries(dayTasks ?? {})) {
    if (task) highest = Math.max(highest, Number.parseInt(line, 10));
  }
  return highest;
}

/**
 * Líneas que dibuja la página de un día: las del ajuste "líneas por página" más las
 * extra de ese día. Nunca son menos que la última línea con una tarea; si no, al bajar
 * el ajuste (p. ej. de 12 a 6) las tareas de las líneas 7 a 12 dejarían de verse.
 */
export function getTotalLines(
  dayTasks: DayTasks | undefined,
  linesPerPage: number,
  extraLines: number
): number {
  return Math.max(linesPerPage + extraLines, getHighestUsedLine(dayTasks));
}

/** Líneas ocupadas y libres de un día, con el ajuste de líneas por página que esté activo ahora */
export function computeLineStatus(
  dayTasks: DayTasks | undefined,
  linesPerPage: number,
  extraLines: number
): LineStatus {
  const tasks = dayTasks ?? {};
  const totalLines = getTotalLines(tasks, linesPerPage, extraLines);

  const occupiedLines = Object.entries(tasks)
    .filter(([, task]) => task)
    .map(([line]) => Number.parseInt(line, 10))
    .sort((a, b) => a - b);

  const availableLines: number[] = [];
  for (let line = 1; line <= totalLines; line++) {
    if (!tasks[line]) availableLines.push(line);
  }

  return { occupiedLines, availableLines, totalLines };
}
