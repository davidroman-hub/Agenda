import type { DayTasks } from "../stores/agenda-tasks-store";

/**
 * Qué tareas se ven: todas, solo las que no tienen tipo, o las de un tipo concreto (su id).
 * El filtro es solo visual: nunca cambia qué líneas están ocupadas ni qué se guarda.
 */
export type TypeFilter = "all" | "none" | string;

export const FILTER_ALL: TypeFilter = "all";
export const FILTER_NONE: TypeFilter = "none";

export const MAX_TASK_TYPE_NAME_LENGTH = 24;
export const MAX_TASK_TYPES = 12;

// Colores de los tipos (se distinguen entre sí y se ven bien en claro y en oscuro)
export const TASK_TYPE_COLORS = [
  "#E57373",
  "#F06292",
  "#BA68C8",
  "#7986CB",
  "#4FC3F7",
  "#4DB6AC",
  "#81C784",
  "#DCE775",
  "#FFB74D",
  "#A1887F",
] as const;

interface HasType {
  typeId?: string | null;
}

/** El tipo de una tarea, o null si no tiene o ya no existe (p. ej. se borró el tipo) */
export function resolveTaskTypeId(
  task: HasType,
  knownTypeIds?: ReadonlySet<string>
): string | null {
  if (!task.typeId) return null;
  if (knownTypeIds && !knownTypeIds.has(task.typeId)) return null;
  return task.typeId;
}

/** ¿Se muestra esta tarea con el filtro activo? */
export function matchesTypeFilter(
  task: HasType,
  filter: TypeFilter,
  knownTypeIds?: ReadonlySet<string>
): boolean {
  if (filter === FILTER_ALL) return true;

  const typeId = resolveTaskTypeId(task, knownTypeIds);
  return filter === FILTER_NONE ? typeId === null : typeId === filter;
}

/** Un filtro que apunta a un tipo que ya no existe vuelve a "todas" */
export function resolveFilter(
  filter: TypeFilter,
  knownTypeIds: ReadonlySet<string>
): TypeFilter {
  if (filter === FILTER_ALL || filter === FILTER_NONE) return filter;
  return knownTypeIds.has(filter) ? filter : FILTER_ALL;
}

/** Espacios recortados y colapsados, y con el largo máximo */
export function normalizeTypeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_TASK_TYPE_NAME_LENGTH);
}

// "Trabajo", "trabajo" y "Trábajo" cuentan como el mismo nombre
const comparable = (name: string) =>
  normalizeTypeName(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase();

/** ¿Ya hay un tipo con ese nombre? (`exceptId`: el propio tipo al renombrarlo) */
export function isTypeNameTaken(
  types: readonly { id: string; name: string }[],
  name: string,
  exceptId?: string
): boolean {
  const wanted = comparable(name);
  return types.some((type) => type.id !== exceptId && comparable(type.name) === wanted);
}

/** El primer color de la paleta que ningún tipo usa (si se acaban, se reparten cíclicamente) */
export function nextTypeColor(types: readonly { color: string }[]): string {
  const used = new Set(types.map((type) => type.color));
  return (
    TASK_TYPE_COLORS.find((color) => !used.has(color)) ??
    TASK_TYPE_COLORS[types.length % TASK_TYPE_COLORS.length]
  );
}

/** ¿Hay alguna tarea sin tipo (o con un tipo que ya no existe)? */
export function hasUntypedTasks(
  tasksByDate: Record<string, DayTasks>,
  knownTypeIds: ReadonlySet<string>
): boolean {
  for (const dayTasks of Object.values(tasksByDate)) {
    for (const task of Object.values(dayTasks)) {
      if (task && resolveTaskTypeId(task, knownTypeIds) === null) return true;
    }
  }
  return false;
}

/** Cuántas tareas (guardadas, no instancias de repetidas) tienen ese tipo */
export function countTasksOfType(
  tasksByDate: Record<string, DayTasks>,
  typeId: string
): number {
  let count = 0;
  for (const dayTasks of Object.values(tasksByDate)) {
    for (const task of Object.values(dayTasks)) {
      if (task?.typeId === typeId) count++;
    }
  }
  return count;
}

/**
 * Qué tipo lleva una tarea en el modal de edición.
 *  - Tarea nueva: el tipo de la pestaña activa, o sin tipo.
 *  - Tarea que ya tiene tipo: ese.
 *  - Tarea antigua sin tipo, existiendo tipos: sin decidir todavía (undefined); al guardar hay
 *    que elegir un tipo o "Sin tipo" a propósito.
 *  - Si no hay tipos, no hay nada que decidir.
 */
export function initialTypeChoice(options: {
  isNewTask: boolean;
  taskTypeId?: string | null;
  types: readonly { id: string }[];
  activeFilter: TypeFilter;
}): string | null | undefined {
  const { isNewTask, taskTypeId, types, activeFilter } = options;
  const known = new Set(types.map((type) => type.id));

  if (isNewTask) return known.has(activeFilter) ? activeFilter : null;

  const current = resolveTaskTypeId({ typeId: taskTypeId }, known);
  if (current) return current;
  return types.length > 0 ? undefined : null;
}

export interface TypeTab {
  /** Qué filtro activa al pulsarla */
  filter: TypeFilter;
  kind: "all" | "none" | "type";
  typeId?: string;
}

/**
 * Qué pestañas enseña la tira: ninguna mientras no haya tipos (la app se ve como siempre);
 * después "Todas", "Sin tipo" (solo si hay tareas sin tipo, o si es la que está activa), y un
 * pestaña por cada tipo, en el orden en que se crearon.
 */
export function getVisibleTabs(options: {
  types: readonly { id: string }[];
  hasUntyped: boolean;
  filter: TypeFilter;
}): TypeTab[] {
  const { types, hasUntyped, filter } = options;
  if (types.length === 0) return [];

  const tabs: TypeTab[] = [{ filter: FILTER_ALL, kind: "all" }];
  if (hasUntyped || filter === FILTER_NONE) tabs.push({ filter: FILTER_NONE, kind: "none" });
  for (const type of types) tabs.push({ filter: type.id, kind: "type", typeId: type.id });
  return tabs;
}

/**
 * Líneas de una página que se dibujan con un filtro por tipo: se quitan solo las líneas que
 * tienen una tarea de otro tipo. Las líneas libres se dejan siempre, porque el filtro es visual:
 * qué líneas están ocupadas lo decide el día completo, no lo que se ve.
 */
export function filterVisibleLines<L extends { lineNumber: number }>(
  lines: readonly L[],
  getTask: (lineNumber: number) => HasType | null,
  filter: TypeFilter,
  knownTypeIds?: ReadonlySet<string>
): L[] {
  return lines.filter(({ lineNumber }) => {
    const task = getTask(lineNumber);
    return !task || matchesTypeFilter(task, filter, knownTypeIds);
  });
}
