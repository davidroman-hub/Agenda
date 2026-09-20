import { migrateDateKey } from "./date-utils";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Cada cuántos días aparece la tarea para las opciones de intervalo fijo
const DAY_INTERVALS: Record<string, number> = {
  daily: 1,
  twice: 2,
  three: 3,
  five: 5,
  weekly: 7,
};

/**
 * Días de calendario entre dos claves YYYY-MM-DD.
 * Usa componentes Y/M/D (no timestamps locales), así que no le afectan
 * ni la zona horaria ni los cambios de horario de verano.
 */
export function daysBetweenDateKeys(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);

  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) -
      Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      MS_PER_DAY
  );
}

/**
 * Regla única de repetición, compartida por el store, el widget y las
 * notificaciones. Las fechas son claves YYYY-MM-DD en hora local.
 */
export function shouldRepeatOnDate(
  repeatOption: string,
  startDate: string,
  targetDate: string
): boolean {
  const start = migrateDateKey(startDate);
  const target = migrateDateKey(targetDate);

  const daysDifference = daysBetweenDateKeys(start, target);

  // Fecha inválida, o la tarea todavía no ha empezado
  if (Number.isNaN(daysDifference) || daysDifference < 0) return false;

  const interval = DAY_INTERVALS[repeatOption];
  if (interval) return daysDifference % interval === 0;

  if (repeatOption === "monthly") {
    // Mismo día del mes
    return Number(start.split("-")[2]) === Number(target.split("-")[2]);
  }

  return false;
}

/** Lo mínimo que hace falta saber de un patrón para decidir si cae en un día */
export interface RepeatRule {
  repeatOption: string;
  startDate: string;
  /** Última fecha (incluida) en la que se repite; sin valor, la serie no termina */
  endDate?: string | null;
  /** Fechas concretas que se han saltado ("borrar solo esta") */
  excludedDates?: readonly string[];
}

/** Suma (o resta) días a una clave YYYY-MM-DD, sin depender de la zona horaria */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Decide si una serie repetida tiene una ocurrencia en un día: cae según su frecuencia,
 * no ha terminado ya y ese día no se ha saltado. (Que el patrón esté activo se comprueba fuera.)
 */
export function patternOccursOn(rule: RepeatRule, dateKey: string): boolean {
  const target = migrateDateKey(dateKey);

  if (rule.endDate && target > migrateDateKey(rule.endDate)) return false;
  if (rule.excludedDates?.some((skipped) => migrateDateKey(skipped) === target)) {
    return false;
  }

  return shouldRepeatOnDate(rule.repeatOption, rule.startDate, target);
}

// Tope de días que se recorren buscando otra ocurrencia (~10 años); si se supera, se da por hecho que hay
const MAX_DAYS_SCANNED = 3660;

/**
 * ¿Le quedan a la serie ocurrencias además de la del día en que empezó?
 * Una serie sin fecha de fin siempre tiene más. Sirve para saber cuándo, tras borrar
 * ocurrencias, la tarea ya no se repite y vuelve a ser una tarea normal.
 */
export function hasOccurrencesAfterStart(rule: RepeatRule): boolean {
  if (!rule.endDate) return true;

  const start = migrateDateKey(rule.startDate);
  const end = migrateDateKey(rule.endDate);

  let day = addDaysToDateKey(start, 1);
  for (let scanned = 0; day <= end; scanned++) {
    if (scanned >= MAX_DAYS_SCANNED) return true;
    if (patternOccursOn(rule, day)) return true;
    day = addDaysToDateKey(day, 1);
  }
  return false;
}
