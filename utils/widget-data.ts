import type { DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { isStoredFileName } from "./attachments";
import { buildDayTasksWith, createDayTasksContext } from "./day-tasks";
import { dateToLocalDateString } from "./date-utils";
import {
  firstImageAttachment,
  type Note,
  noteColorHex,
  notePin,
  noteRotation,
  sanitizeNoteText,
  sortNotes,
} from "./notes";
import { addDaysToDateKey } from "./repeat-utils";

/** Días anteriores a hoy que se mandan al widget (para poder mirar ayer con la flecha) */
export const WIDGET_DAYS_BEHIND = 1;

/** Días que se mandan al widget después de hoy: así sigue mostrando el día correcto aunque la app no se abra */
export const WIDGET_DAYS_AHEAD = 7;

/** El widget enseña unas pocas; más no hace falta y el JSON se mantiene pequeño */
export const WIDGET_MAX_TASKS_PER_DAY = 10;

export const WIDGET_MAX_NOTES = 6;
export const WIDGET_NOTE_MAX_CHARS = 200;

export interface WidgetTaskItem {
  /** Id con el que la app localiza la tarea: el de la propia tarea o, en una repetida, el de la original */
  id: string;
  text: string;
  done: boolean;
  repeating: boolean;
  /** Hora del recordatorio, en minutos desde medianoche; ausente si no tiene */
  at?: number;
  /** Color del tipo de la tarea (#rrggbb); ausente si no tiene tipo */
  color?: string;
}

export interface WidgetDay {
  /** Todas las tareas del día, aunque `tasks` esté recortada */
  total: number;
  completed: number;
  /** Primero las pendientes y después las completadas, cada grupo en el orden del libro */
  tasks: WidgetTaskItem[];
}

export interface WidgetNote {
  id: string;
  text: string;
  /** Color del post-it (#rrggbb) */
  color: string;
  /** Inclinación en grados, la misma que en el tablero de la app */
  rotation: number;
  /** La chincheta que la clava: colores (#rrggbb) y desplazamiento horizontal desde el centro, en dp */
  pin: { head: string; dark: string; offset: number };
  /** Nombre guardado (ver isStoredFileName) de la primera imagen adjunta; ausente si no tiene */
  image?: string;
}

/** Lo que lee el widget de Android (AgendaWidgetProvider.kt y NotesWidgetProvider.kt) */
export interface WidgetPayload {
  /** Resumen por día (YYYY-MM-DD en hora local) */
  days: Record<string, WidgetDay>;
  /** Las notas más recientes primero */
  notes: WidgetNote[];
}

/** Minutos desde medianoche del recordatorio de una tarea, si vale para mostrarlo en ese día */
function reminderMinutes(reminder: string | null | undefined, dateKey: string, repeating: boolean): number | undefined {
  if (!reminder) return undefined;

  const date = new Date(reminder);
  if (Number.isNaN(date.getTime())) return undefined;

  // Un recordatorio de otro día (p. ej. la víspera) no es "la hora" de la tarea. En las repetidas
  // solo importa la hora: la fecha es la de la tarea original
  if (!repeating && dateToLocalDateString(date) !== dateKey) return undefined;

  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Lo que se escribe en el post-it del widget: el texto, o el nombre del primer archivo si la nota solo
 * lleva adjuntos sin imagen. Con imagen, el widget la dibuja y no hace falta ningún nombre.
 */
function noteWidgetText(note: Note, hasImage: boolean): string {
  const text = sanitizeNoteText(note.text);
  if (text) return text.slice(0, WIDGET_NOTE_MAX_CHARS);
  if (hasImage) return "";

  const first = note.attachments?.[0];
  return first ? `📎 ${first.name}`.slice(0, WIDGET_NOTE_MAX_CHARS) : "";
}

/**
 * Resume para el widget las tareas de ayer, hoy y los `daysAhead` días siguientes, y las últimas notas.
 * Usa la misma reconstrucción de día que el libro (`buildDayTasksWith`), así las repetidas cuadran
 * con la app.
 */
export function buildWidgetPayload(
  today: string,
  tasksByDate: Record<string, DayTasks>,
  patterns: RepeatingTaskPattern[],
  completions: Record<string, boolean>,
  types: readonly { id: string; color: string }[] = [],
  notes: readonly Note[] = [],
  daysAhead: number = WIDGET_DAYS_AHEAD,
  daysBehind: number = WIDGET_DAYS_BEHIND
): WidgetPayload {
  const context = createDayTasksContext(tasksByDate, patterns);
  const typeColors = new Map(types.map((type) => [type.id, type.color]));
  const days: Record<string, WidgetDay> = {};

  for (let offset = -daysBehind; offset <= daysAhead; offset++) {
    const dateKey = addDaysToDateKey(today, offset);
    const { normalTasks, repeatedTasks } = buildDayTasksWith(context, dateKey, tasksByDate, completions);

    const items: WidgetTaskItem[] = [];
    const add = (task: NonNullable<DayTasks[number]>, id: string, repeating: boolean) => {
      if (!task.text) return;

      const item: WidgetTaskItem = { id, text: task.text, done: Boolean(task.completed), repeating };
      const at = reminderMinutes(task.reminder, dateKey, repeating);
      if (at !== undefined) item.at = at;
      const color = task.typeId ? typeColors.get(task.typeId) : undefined;
      if (color) item.color = color;
      items.push(item);
    };

    for (const task of Object.values(normalTasks)) {
      if (task) add(task, task.id, false);
    }
    for (const task of repeatedTasks) {
      add(task, task.repeatingTaskId ?? task.id, true);
    }

    const completed = items.filter((item) => item.done).length;
    days[dateKey] = {
      total: items.length,
      completed,
      tasks: [...items.filter((item) => !item.done), ...items.filter((item) => item.done)].slice(
        0,
        WIDGET_MAX_TASKS_PER_DAY
      ),
    };
  }

  const widgetNotes: WidgetNote[] = [];
  for (const note of sortNotes(notes)) {
    const image = firstImageAttachment(note.attachments);
    const imageFileName = image && isStoredFileName(image.fileName) ? image.fileName : null;
    const text = noteWidgetText(note, imageFileName !== null);
    if (!text && !imageFileName) continue;

    const widgetNote: WidgetNote = {
      id: note.id,
      text,
      color: noteColorHex(note.color),
      rotation: noteRotation(note.id),
      pin: notePin(note.id),
    };
    if (imageFileName) widgetNote.image = imageFileName;
    widgetNotes.push(widgetNote);
    if (widgetNotes.length === WIDGET_MAX_NOTES) break;
  }

  return { days, notes: widgetNotes };
}
