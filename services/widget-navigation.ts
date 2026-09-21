import useAgendaSectionStore from "../stores/agenda-section-store";
import useBookNavigationStore from "../stores/book-navigation-store";
import useNotesNavigationStore from "../stores/notes-navigation-store";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isDateKey = (value: unknown): value is string => typeof value === "string" && DATE_KEY.test(value);
const isId = (value: unknown): value is string => typeof value === "string" && value !== "";

/**
 * Atiende el toque en una tarea del widget (justagenda://widget-task?date=…&id=…): pide al libro que
 * vaya al día de la tarea y la abra, igual que al tocar una notificación. La navegación a la agenda
 * la hace la ruta (app/widget-task.tsx). Devuelve true si había una tarea válida a la que ir.
 */
export function requestTaskFromWidget(date: unknown, taskId: unknown): boolean {
  if (!isDateKey(date) || !isId(taskId)) return false;

  useBookNavigationStore.getState().requestTarget(date, taskId);
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
 * Los toques del widget de notas (justagenda://widget-note): abre las notas y, según se pida, una nota
 * concreta (`id`), una nueva (`isNew`) o solo el tablero.
 */
export function requestNoteFromWidget(id: unknown, isNew: boolean): void {
  useAgendaSectionStore.getState().showNotes();

  const notes = useNotesNavigationStore.getState();
  if (isNew) notes.requestNewNote();
  else if (isId(id)) notes.requestNote(id);
}
