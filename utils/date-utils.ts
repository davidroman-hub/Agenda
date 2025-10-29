/**
 * Utilidades para manejo de fechas normalizadas sin conflictos de zona horaria
 * Todas las fechas de tareas se almacenan en formato YYYY-MM-DD con hora 00:00:00 local
 */

/**
 * Normaliza una fecha a medianoche local (00:00:00.000)
 * Elimina cualquier información de hora y zona horaria
 */
export function normalizeToLocalMidnight(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Crear nueva fecha en timezone local sin información de hora
  const normalized = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0, 0, 0, 0 // Medianoche local
  );
  
  return normalized;
}

/**
 * Convierte una fecha a string YYYY-MM-DD usando fecha local
 * Evita problemas de zona horaria al convertir fechas
 */
export function dateToLocalDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Usar componentes locales para evitar desfase UTC
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha actual como string YYYY-MM-DD local
 */
export function getCurrentLocalDateString(): string {
  return dateToLocalDateString(new Date());
}

/**
 * Crea una fecha normalizada desde un string YYYY-MM-DD
 * Siempre resulta en medianoche local para evitar problemas de zona horaria
 */
export function createLocalDateFromString(dateString: string): Date {
  // Parsear manualmente para evitar interpretación UTC
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Crear fecha en timezone local
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Convierte una fecha ISO string a timestamp normalizado local
 * Usado para migrar datos existentes
 */
export function normalizeISOStringToLocal(isoString: string): string {
  const date = new Date(isoString);
  const normalized = normalizeToLocalMidnight(date);
  return normalized.toISOString();
}

/**
 * Verifica si una fecha necesita migración (tiene información de hora)
 */
export function needsDateMigration(isoString: string): boolean {
  const date = new Date(isoString);
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0;
}

/**
 * Migra una clave de fecha antigua (posiblemente con zona horaria) a formato local
 */
export function migrateDateKey(oldDateKey: string): string {
  // Si ya está en formato YYYY-MM-DD, no cambiar
  if (/^\d{4}-\d{2}-\d{2}$/.test(oldDateKey)) {
    return oldDateKey;
  }
  
  // Si es un ISO string, convertir a fecha local
  try {
    const date = new Date(oldDateKey);
    return dateToLocalDateString(date);
  } catch {
    // Si no se puede parsear, devolver tal como está
    return oldDateKey;
  }
}

/**
 * Función para debugging - muestra información detallada de una fecha
 */
export function debugDate(date: Date | string, label: string = 'Date') {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  console.log(`🕰️ ${label}:`, {
    original: date,
    local: d.toLocaleString(),
    iso: d.toISOString(),
    dateString: dateToLocalDateString(d),
    timezone: d.getTimezoneOffset(),
    components: {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes()
    }
  });
}
