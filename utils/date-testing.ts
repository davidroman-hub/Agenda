import {
  createLocalDateFromString,
  dateToLocalDateString,
  debugDate,
  getCurrentLocalDateString,
  migrateDateKey,
  needsDateMigration,
  normalizeToLocalMidnight,
} from "@/utils/date-utils";

/**
 * Script de testing para las utilidades de fecha
 * Usado para verificar que la migración funciona correctamente
 */
export const testDateUtils = () => {
  const now = new Date();
  debugDate(now, "Fecha actual original");

  const normalized = normalizeToLocalMidnight(now);
  debugDate(normalized, "Fecha normalizada");

  const dateString = dateToLocalDateString(now);

  const currentLocal = getCurrentLocalDateString();

  // Test 2: Fechas problemáticas

  // Simular fecha con zona horaria problemática
  const problematicDate = new Date("2025-10-27T22:00:00.000Z"); // UTC que puede cambiar fecha local
  debugDate(problematicDate, "Fecha problemática UTC");

  const fixed = normalizeToLocalMidnight(problematicDate);
  debugDate(fixed, "Fecha corregida");

  // Test 3: Migración de claves

  const oldKeys = [
    "2025-10-27",
    "2025-10-27T22:00:00.000Z",
    "2025-10-28T01:30:00.000-05:00",
    "invalid-date",
  ];

  oldKeys.forEach((key) => {
    const migrated = migrateDateKey(key);
  });

  const testDates = [
    "2025-10-27T00:00:00.000Z", // Necesita migración (tiene hora)
    "2025-10-27T15:30:00.000Z", // Necesita migración (tiene hora)
    normalizeToLocalMidnight(new Date()).toISOString(), // No necesita (ya normalizada)
  ];

  testDates.forEach((date) => {
    const needs = needsDateMigration(date);
  });

  // Test 5: Consistencia entre timezones

  // Simular diferentes momentos del día
  const testTimes = [
    new Date("2025-10-27T23:30:00"), // Casi medianoche
    new Date("2025-10-28T00:30:00"), // Pasada medianoche
    new Date("2025-10-28T12:00:00"), // Mediodía
  ];

  testTimes.forEach((time) => {
    const dateString = dateToLocalDateString(time);
    const recreated = createLocalDateFromString(dateString);
  });
};

/**
 * Función para testing específico del problema reportado
 * Simula el cambio de día a las 00:00 vs 01:00
 */
export const testMidnightTransition = () => {
  // Simular fecha problemática (23:00 del día anterior en UTC)
  const beforeMidnight = new Date("2025-10-27T23:00:00.000Z");
  const atMidnight = new Date("2025-10-28T00:00:00.000Z");
  const afterMidnight = new Date("2025-10-28T01:00:00.000Z");

  debugDate(beforeMidnight, "UTC 23:00");

  debugDate(atMidnight, "UTC 00:00");

  debugDate(afterMidnight, "UTC 01:00");

  // Verificar consistencia
  const key1 = dateToLocalDateString(beforeMidnight);
  const key2 = dateToLocalDateString(atMidnight);
  const key3 = dateToLocalDateString(afterMidnight);
};

/**
 * Función para debugging en producción
 * Se puede llamar desde la consola del developer
 */
export const debugCurrentDateIssues = () => {
  const now = new Date();
  const utcNow = new Date(now.toISOString());

  // Simular una fecha que podría causar el problema reportado
  const problemDate = new Date();
  problemDate.setHours(23, 59, 59, 999); // Casi medianoche

  const oldMethod = problemDate.toISOString().split("T")[0];
  const newMethod = dateToLocalDateString(problemDate);

  if (oldMethod !== newMethod) {
  }
};
