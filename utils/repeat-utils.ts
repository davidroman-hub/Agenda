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
