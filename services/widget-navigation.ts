import useBookNavigationStore from "../stores/book-navigation-store";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Atiende el toque en una tarea del widget (justagenda://widget-task?date=…&id=…): pide al libro que
 * vaya al día de la tarea y la abra, igual que al tocar una notificación. La navegación a la agenda
 * la hace la ruta (app/widget-task.tsx). Devuelve true si había una tarea válida a la que ir.
 */
export function requestTaskFromWidget(date: unknown, taskId: unknown): boolean {
  if (typeof date !== "string" || !DATE_KEY.test(date) || typeof taskId !== "string" || taskId === "") {
    return false;
  }

  useBookNavigationStore.getState().requestTarget(date, taskId);
  return true;
}
