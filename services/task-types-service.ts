import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useTaskTypesStore from "../stores/task-types-store";
import { countTasksOfType } from "../utils/task-types";

/** Cuántas tareas usan un tipo (para avisar antes de borrarlo) */
export function countTasksUsingType(typeId: string): number {
  return countTasksOfType(useAgendaTasksStore.getState().tasksByDate, typeId);
}

/**
 * Borra un tipo. Las tareas que lo tenían no se borran: pasan a no tener tipo, así no
 * queda ninguna apuntando a un tipo que ya no existe.
 */
export function deleteTaskType(typeId: string): void {
  useAgendaTasksStore.getState().clearTaskType(typeId);
  useTaskTypesStore.getState().removeType(typeId);
}
