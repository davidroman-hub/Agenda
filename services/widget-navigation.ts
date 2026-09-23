import useAgendaSectionStore from "../stores/agenda-section-store";
import useBookNavigationStore from "../stores/book-navigation-store";
import useNotesNavigationStore from "../stores/notes-navigation-store";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isDateKey = (value: unknown): value is string => typeof value === "string" && DATE_KEY.test(value);

/**
 * Atiende el toque en una tarea del widget (justagenda://widget-task?date=…&id=…): lleva el libro a ese
 * día y nada más. No se abre la tarea: abrir el editor nada más llegar era lo que se atascaba, y el
 * usuario la toca ya con el día delante. La navegación a la agenda la hace la ruta
 * (app/widget-task.tsx). Devuelve true si la fecha era válida.
 */
export function requestDayFromWidget(date: unknown): boolean {
  if (!isDateKey(date)) return false;

  // El id vacío no coincide con ninguna tarea: el libro solo va al día
  useBookNavigationStore.getState().requestTarget(date, "");
  return true;
}

/**
 * El botón "+" del widget (justagenda://widget-task?date=…): abre el editor de una tarea nueva en la
 * primera línea libre de ese día. Devuelve true si la fecha era válida.
 */
export function requestNewTaskFromWidget(date: unknown): boolean {
  if (!isDateKey(date)) return false;

  useBookNavigationStore.getState().requestNewTask(date);
  return true;
}

/**
 * Los toques del widget de notas (justagenda://widget-note): abren la sección de notas, sin abrir
 * ninguna nota. Solo el "+" (`isNew`) abre además el editor de una nota nueva.
 */
export function requestNoteFromWidget(isNew: boolean): void {
  useAgendaSectionStore.getState().showNotes();

  if (isNew) useNotesNavigationStore.getState().requestNewNote();
}
