/**
 * Vista de año: un calendario con los doce meses y, al lado, las tareas de lo que se elija (el año
 * entero, un mes o un día). Todo lo de este archivo es puro, para poder probarlo entero.
 *
 * Las tareas de cada día se reconstruyen con el mismo código que usa el libro
 * (`buildDayTasksWith` de utils/day-tasks.ts), con el contexto creado una sola vez para todo el año.
 * Todas las fechas son claves YYYY-MM-DD y se calculan con aritmética de calendario (UTC), así que
 * no les afectan ni la zona horaria ni el cambio de hora.
 */
import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { buildDayTasksWith, createDayTasksContext } from "./day-tasks";

export const MIN_YEAR = 1970;
export const MAX_YEAR = 2100;

const pad2 = (value: number) => String(value).padStart(2, "0");

export function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.trunc(year)));
}

/** Suma (o resta) años sin salirse del rango que admite la vista */
export function shiftYear(year: number, delta: number): number {
  return clampYear(year + delta);
}

/** Meses de 1 a 12 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Todas las claves de un año, en orden */
export function dateKeysOfYear(year: number): string[] {
  const keys: string[] = [];
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= daysInMonth(year, month); day++) keys.push(toDateKey(year, month, day));
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Rejilla de un mes
// ---------------------------------------------------------------------------

/** Igual que el calendario de la app: la semana empieza en domingo en inglés y en lunes en el resto */
export function getFirstDayOfWeek(language: string): 0 | 1 {
  return language === "en" ? 0 : 1;
}

/** Las iniciales de los días de la semana (D L M X…), empezando por el primer día de la semana */
export function weekdayInitials(dayNamesShort: readonly string[], firstDay: 0 | 1): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    (dayNamesShort[(index + firstDay) % 7] ?? "").charAt(0).toUpperCase()
  );
}

/**
 * Semanas de un mes: siempre 6 filas de 7, con `null` en los huecos de antes del día 1 y después
 * del último día. Seis filas siempre, para que todos los meses midan lo mismo y encajen en la cuadrícula.
 */
export function getMonthGrid(year: number, month: number, firstDay: 0 | 1): (string | null)[][] {
  const weekdayOfFirst = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekdayOfFirst - firstDay + 7) % 7;
  const total = daysInMonth(year, month);

  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - offset + 1;
      return day >= 1 && day <= total ? toDateKey(year, month, day) : null;
    })
  );
}

// ---------------------------------------------------------------------------
// Índice del año
// ---------------------------------------------------------------------------

export interface YearEntry {
  dateKey: string;
  task: AgendaTask;
  /** Línea del libro en la que está guardada; null si es una ocurrencia de una tarea repetida */
  line: number | null;
}

export interface YearDay {
  dateKey: string;
  entries: YearEntry[];
  total: number;
  completed: number;
}

/** Una serie repetida con ocurrencias en el año */
export interface YearSeries {
  originalId: string;
  /** La primera ocurrencia del año (sirve para el texto, el tipo, etc.) */
  task: AgendaTask;
  repeatOption: string;
  occurrences: number;
  firstDateKey: string;
}

export interface YearIndex {
  year: number;
  /** Solo los días que tienen alguna tarea */
  days: Map<string, YearDay>;
  series: YearSeries[];
}

const summarizeDay = (dateKey: string, entries: YearEntry[]): YearDay => ({
  dateKey,
  entries,
  total: entries.length,
  completed: entries.filter((entry) => entry.task.completed).length,
});

/**
 * Las tareas de cada día del año (las propias y las ocurrencias de las repetidas), con el mismo
 * resultado que `buildDayTasks` día a día pero recorriendo las tareas una sola vez.
 *
 * @param include  Qué tareas cuentan (el filtro por tipo); por defecto, todas
 */
export function buildYearIndex(input: {
  year: number;
  tasksByDate: Record<string, DayTasks>;
  patterns: RepeatingTaskPattern[];
  completions: Record<string, boolean>;
  include?: (task: AgendaTask) => boolean;
}): YearIndex {
  const { year, tasksByDate, patterns, completions, include = () => true } = input;

  const context = createDayTasksContext(tasksByDate, patterns);
  const patternById = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  const days = new Map<string, YearDay>();
  const seriesById = new Map<string, YearSeries>();

  for (const dateKey of dateKeysOfYear(year)) {
    const { normalTasks, repeatedTasks } = buildDayTasksWith(context, dateKey, tasksByDate, completions);
    const entries: YearEntry[] = [];

    const lines = Object.keys(normalTasks)
      .map(Number)
      .sort((a, b) => a - b);
    for (const line of lines) {
      const task = normalTasks[line];
      if (task && include(task)) entries.push({ dateKey, task, line });
    }

    for (const task of repeatedTasks) {
      if (!include(task)) continue;
      entries.push({ dateKey, task, line: null });

      const originalId = task.repeatingTaskId ?? task.id;
      const known = seriesById.get(originalId);
      if (known) {
        known.occurrences++;
      } else {
        seriesById.set(originalId, {
          originalId,
          task,
          repeatOption:
            patternById.get(task.repeatingPatternId ?? "")?.repeatOption ?? task.repeat ?? "none",
          occurrences: 1,
          firstDateKey: dateKey,
        });
      }
    }

    if (entries.length > 0) days.set(dateKey, summarizeDay(dateKey, entries));
  }

  const series = [...seriesById.values()].sort(
    (a, b) => a.firstDateKey.localeCompare(b.firstDateKey) || a.task.text.localeCompare(b.task.text)
  );
  return { year, days, series };
}

// ---------------------------------------------------------------------------
// Qué se ve en la lista (año, mes o día)
// ---------------------------------------------------------------------------

export type YearScope =
  | { kind: "year" }
  | { kind: "month"; month: number }
  | { kind: "day"; dateKey: string };

/**
 * Los días que se listan para un ámbito, en orden. En el año entero no se listan una a una las
 * ocurrencias de las series repetidas (un "todos los días" serían 365 filas): salen aparte, en
 * `scopeSeries`. En un mes o un día sí se listan todas.
 */
export function scopeDays(index: YearIndex, scope: YearScope): YearDay[] {
  const result: YearDay[] = [];

  if (scope.kind === "day") {
    const day = index.days.get(scope.dateKey);
    return day ? [day] : [];
  }

  for (const dateKey of [...index.days.keys()].sort()) {
    const day = index.days.get(dateKey) as YearDay;

    if (scope.kind === "month") {
      if (dateKey.slice(5, 7) === pad2(scope.month)) result.push(day);
      continue;
    }

    const own = day.entries.filter((entry) => entry.line !== null);
    if (own.length > 0) result.push(own.length === day.entries.length ? day : summarizeDay(dateKey, own));
  }

  return result;
}

/** Las series repetidas que se listan aparte: solo en el ámbito del año entero */
export function scopeSeries(index: YearIndex, scope: YearScope): YearSeries[] {
  return scope.kind === "year" ? index.series : [];
}

export function scopeStats(days: readonly YearDay[]): { total: number; completed: number } {
  return days.reduce(
    (stats, day) => ({ total: stats.total + day.total, completed: stats.completed + day.completed }),
    { total: 0, completed: 0 }
  );
}

/** Cómo se marca un día en el calendario: sin tareas, con alguna pendiente, o todas hechas */
export type DayMark = "none" | "pending" | "done";

export function getDayMark(day: YearDay | undefined): DayMark {
  if (!day || day.total === 0) return "none";
  return day.completed === day.total ? "done" : "pending";
}

/** Las marcas de los días de un mes que tienen tareas (los demás no aparecen) */
export function getMonthMarks(index: YearIndex, month: number): Record<string, DayMark> {
  const marks: Record<string, DayMark> = {};
  const prefix = `${index.year}-${pad2(month)}-`;
  for (const [dateKey, day] of index.days) {
    if (dateKey.startsWith(prefix)) marks[dateKey] = getDayMark(day);
  }
  return marks;
}

/** El mes que se debe resaltar en el calendario según el ámbito (el del día, si es un día) */
export function scopeMonth(scope: YearScope): number | null {
  if (scope.kind === "month") return scope.month;
  if (scope.kind === "day") return parseDateKey(scope.dateKey)?.month ?? null;
  return null;
}

// ---------------------------------------------------------------------------
// Distribución
// ---------------------------------------------------------------------------

export interface YearLayout {
  /** En el móvil, el calendario arriba y las tareas debajo; en pantallas anchas, como dos páginas */
  orientation: "stacked" | "sideBySide";
  /** Meses por fila en el calendario */
  monthColumns: number;
}

export function getYearLayout(width: number): YearLayout {
  if (!(width >= 600)) return { orientation: "stacked", monthColumns: 3 };
  return { orientation: "sideBySide", monthColumns: width >= 900 ? 3 : 2 };
}

/** Alto del calendario cuando va encima de la lista: casi la mitad, sin quedarse muy corto ni comerse la lista */
export function getStackedCalendarHeight(totalHeight: number): number {
  if (!(totalHeight > 0)) return 260;
  return Math.round(Math.min(420, Math.max(200, totalHeight * 0.48)));
}

/** En qué fila de meses cae uno (para llevar el calendario al mes actual al abrirlo) */
export function monthRowIndex(month: number, monthColumns: number): number {
  return Math.floor((month - 1) / Math.max(1, monthColumns));
}

// ---------------------------------------------------------------------------
// Medidas de un mes del calendario
// ---------------------------------------------------------------------------

export interface MonthMetrics {
  cellWidth: number;
  cellHeight: number;
  /** Diámetro del círculo del día (el de hoy va relleno) */
  circleSize: number;
  fontSize: number;
  titleHeight: number;
  weekdaysHeight: number;
  /** Alto de un mes entero: con esto se sabe a qué altura empieza cada fila de meses */
  monthHeight: number;
}

const MONTH_MARGIN = 10;

/** Las medidas de un mes según el ancho que tiene: en una tablet los días crecen, en el móvil se compactan */
export function getMonthMetrics(monthWidth: number): MonthMetrics {
  const width = monthWidth > 0 ? monthWidth : 105;
  const cellWidth = width / 7;
  const cellHeight = Math.round(Math.min(30, Math.max(18, cellWidth * 1.1)));
  const titleHeight = 20;
  const weekdaysHeight = 14;

  return {
    cellWidth,
    cellHeight,
    circleSize: Math.round(Math.min(26, Math.max(14, cellWidth - 3))),
    fontSize: Math.round(Math.min(13, Math.max(9, cellWidth * 0.45))),
    titleHeight,
    weekdaysHeight,
    monthHeight: titleHeight + weekdaysHeight + cellHeight * 6 + MONTH_MARGIN,
  };
}

// ---------------------------------------------------------------------------
// Filas de la lista de tareas
// ---------------------------------------------------------------------------

export type YearListRow =
  | { kind: "date"; key: string; dateKey: string }
  | { kind: "task"; key: string; entry: YearEntry }
  | { kind: "seriesTitle"; key: string }
  | { kind: "series"; key: string; series: YearSeries };

/**
 * Lo que se dibuja en la lista, en orden: por cada día su cabecera y sus tareas, y al final, si las
 * hay, el apartado de las series que se repiten. La clave de cada fila es única.
 */
export function buildListRows(days: readonly YearDay[], series: readonly YearSeries[]): YearListRow[] {
  const rows: YearListRow[] = [];

  for (const day of days) {
    rows.push({ kind: "date", key: `date:${day.dateKey}`, dateKey: day.dateKey });
    for (const entry of day.entries) {
      rows.push({ kind: "task", key: `task:${day.dateKey}:${entry.task.id}`, entry });
    }
  }

  if (series.length > 0) {
    rows.push({ kind: "seriesTitle", key: "series-title" });
    for (const item of series) rows.push({ kind: "series", key: `series:${item.originalId}`, series: item });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Textos de fechas
// ---------------------------------------------------------------------------

/** "Dom 20 Sep." con los nombres del idioma; vacío si la clave no es una fecha */
export function formatDayLabel(
  dateKey: string,
  names: { dayNamesShort: readonly string[]; monthNamesShort: readonly string[] }
): string {
  const parts = parseDateKey(dateKey);
  if (!parts) return "";
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return `${names.dayNamesShort[weekday]} ${parts.day} ${names.monthNamesShort[parts.month - 1]}`;
}
