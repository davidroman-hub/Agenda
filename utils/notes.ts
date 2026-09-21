/**
 * Notas: papelitos sueltos (con archivos adjuntos opcionales) que NO son tareas. Viven en su propio
 * store (stores/notes-store.ts) y nunca aparecen en el libro, el calendario, las tareas pasadas ni
 * los filtros por tipo. Todo lo de este archivo es puro, para poder probarlo entero.
 */
import {
  Attachment,
  getAttachmentKind,
  normalizeAttachments,
} from "./attachments";

export const NOTE_COLORS = [
  { id: "yellow", hex: "#FBE164" },
  { id: "orange", hex: "#F39257" },
  { id: "pink", hex: "#EC7A9C" },
  { id: "green", hex: "#C4D66C" },
  { id: "mint", hex: "#86DEC3" },
  { id: "blue", hex: "#A9ACEE" },
] as const;

export type NoteColorId = (typeof NOTE_COLORS)[number]["id"];

export const DEFAULT_NOTE_COLOR: NoteColorId = "yellow";
export const MAX_NOTE_LENGTH = 2000;
/** Líneas de texto que se ven en la tarjeta (el resto se lee al abrir la nota) */
export const NOTE_CARD_MAX_LINES = 8;

/** El tablero es de corcho (su textura va encima de este color); los post-it son claros y su texto, oscuro */
export const NOTES_BOARD_BACKGROUND = { light: "#C4965F", dark: "#4A3623" } as const;
export const NOTES_ACCENT = "#B8860B";
export const NOTE_TEXT_COLOR = "#3B3200";

export interface Note {
  id: string;
  text: string;
  color: NoteColorId;
  createdAt: string;
  updatedAt: string;
  /** Ausente si no tiene */
  attachments?: Attachment[];
  /**
   * Su sitio en el tablero, si el usuario las ha reordenado arrastrándolas (0 = la primera). Ausente en las
   * que nunca se han movido y en las creadas después: van delante, las más recientes primero (ver sortNotes)
   */
  order?: number;
}

export function isNoteColorId(value: unknown): value is NoteColorId {
  return NOTE_COLORS.some((color) => color.id === value);
}

/** Color de fondo de una nota; si el guardado no es válido, el amarillo de siempre */
export function noteColorHex(id: unknown): string {
  return (NOTE_COLORS.find((color) => color.id === id) ?? NOTE_COLORS[0]).hex;
}

/** Texto listo para guardar: saltos de línea normales, sin espacios en los extremos y con el largo acotado */
export function sanitizeNoteText(text: unknown): string {
  if (typeof text !== "string") return "";
  return text.replaceAll("\r\n", "\n").trim().slice(0, MAX_NOTE_LENGTH);
}

/** Una nota necesita texto o, al menos, un archivo */
export function isNoteEmpty(note: { text?: string | null; attachments?: readonly unknown[] | null }): boolean {
  return sanitizeNoteText(note.text ?? "") === "" && !note.attachments?.length;
}

/** Un número que sale del id: el mismo id da siempre el mismo (para lo que es "al azar" pero fijo) */
const hashOf = (id: string) => {
  let hash = 5381;
  for (let index = 0; index < id.length; index++) {
    hash = ((hash * 33) ^ id.charCodeAt(index)) >>> 0;
  }
  return hash;
};

/**
 * Inclinación de cada post-it, en grados: pequeña, y siempre la misma para la misma nota (sale de su
 * id), para que el tablero no "baile" cada vez que se dibuja. Entre -2,5° y 2,5°.
 */
export function noteRotation(id: string): number {
  return ((hashOf(id) % 11) - 5) * 0.5;
}

/** Chinchetas: color de la cabeza y un tono más oscuro para el borde y el pie */
export const PIN_COLORS = [
  { head: "#F0742A", dark: "#B4500F" },
  { head: "#9FCB36", dark: "#6E9418" },
  { head: "#E23E76", dark: "#A6224F" },
  { head: "#1FA79A", dark: "#127367" },
  { head: "#3D5A9E", dark: "#263C70" },
  { head: "#D93A3A", dark: "#9C2020" },
] as const;

/** Lo máximo que se aparta una chincheta del centro del post-it, en puntos */
export const PIN_MAX_OFFSET = 14;

/**
 * La chincheta de cada post-it: color y desplazamiento horizontal (entre -14 y 14) que salen de su
 * id, como la inclinación, para que sea siempre la misma.
 */
export function notePin(id: string): { head: string; dark: string; offset: number } {
  const hash = hashOf(id);
  const color = PIN_COLORS[hash % PIN_COLORS.length];
  const offset = (Math.floor(hash / 7) % (PIN_MAX_OFFSET * 2 + 1)) - PIN_MAX_OFFSET;
  return { head: color.head, dark: color.dark, offset };
}

const timeOf = (iso: string) => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
};

/**
 * El orden del tablero (y el del widget de notas). Primero las que no tienen `order` (las que nunca se han
 * movido y las nuevas), las más recientes primero; después las que sí, por su `order`. A igualdad, por id, para
 * que el orden no cambie de un arranque a otro. Sin ninguna reordenada es simplemente "las más recientes primero".
 */
export function sortNotes<T extends Pick<Note, "id" | "createdAt"> & { order?: number }>(
  notes: readonly T[]
): T[] {
  return [...notes].sort((a, b) => {
    const aOrder = typeof a.order === "number" ? a.order : null;
    const bOrder = typeof b.order === "number" ? b.order : null;

    if (aOrder !== null && bOrder !== null) return aOrder - bOrder || a.id.localeCompare(b.id);
    if (aOrder !== null) return 1;
    if (bOrder !== null) return -1;
    return timeOf(b.createdAt) - timeOf(a.createdAt) || a.id.localeCompare(b.id);
  });
}

/**
 * La lista de ids con `id` movido a la posición `toIndex` (el resto se corre para hacerle sitio). Si el id no
 * está, o ya está ahí, devuelve la lista tal cual. `toIndex` se acota a los límites de la lista.
 */
export function moveInOrder(ids: readonly string[], id: string, toIndex: number): string[] {
  const from = ids.indexOf(id);
  if (from === -1) return [...ids];

  const target = Math.min(Math.max(Math.trunc(toIndex) || 0, 0), ids.length - 1);
  const next = ids.filter((existing) => existing !== id);
  next.splice(target, 0, id);
  return next;
}

/** El primer archivo que es una imagen (se enseña como vista previa en la tarjeta) */
export function firstImageAttachment(
  attachments: readonly Attachment[] | null | undefined
): Attachment | null {
  return attachments?.find((attachment) => getAttachmentKind(attachment) === "image") ?? null;
}

/**
 * Lee las notas guardadas sin fiarse de ellas (puede venir de una versión anterior o de una copia
 * de seguridad rara): descarta las que no valen, arregla lo que se pueda y quita duplicados.
 */
export function normalizeNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const notes: Note[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { id, text, color, createdAt, updatedAt, attachments, order } = entry as Record<string, unknown>;
    if (typeof id !== "string" || id === "" || seen.has(id)) continue;

    const cleanText = sanitizeNoteText(text);
    const cleanAttachments = normalizeAttachments(attachments);
    if (isNoteEmpty({ text: cleanText, attachments: cleanAttachments })) continue;

    const created = typeof createdAt === "string" && createdAt ? createdAt : undefined;
    const updated = typeof updatedAt === "string" && updatedAt ? updatedAt : undefined;
    const fallback = created ?? updated ?? new Date(0).toISOString();

    seen.add(id);
    notes.push({
      id,
      text: cleanText,
      color: isNoteColorId(color) ? color : DEFAULT_NOTE_COLOR,
      createdAt: created ?? fallback,
      updatedAt: updated ?? fallback,
      ...(cleanAttachments.length > 0 ? { attachments: cleanAttachments } : {}),
      // Solo un número válido; cualquier otra cosa cuenta como "nunca reordenada"
      ...(typeof order === "number" && Number.isFinite(order) ? { order } : {}),
    });
  }

  return notes;
}

// ---------------------------------------------------------------------------
// Tablero
// ---------------------------------------------------------------------------

/** Columnas del tablero según el ancho: 2 en móvil, más en tablet */
export function columnsForWidth(width: number): number {
  if (!(width >= 600)) return 2;
  return width >= 900 ? 4 : 3;
}

const CHARS_PER_LINE = 20;
const LINE_HEIGHT = 20;

/** Alto aproximado de una tarjeta, para repartirlas entre columnas sin medirlas */
export function estimateNoteHeight(
  note: Pick<Note, "text" | "attachments">,
  hasImagePreview: boolean
): number {
  const lines = Math.min(
    NOTE_CARD_MAX_LINES,
    note.text
      .split("\n")
      .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0)
  );
  const hasOtherFiles = (note.attachments?.length ?? 0) > (hasImagePreview ? 1 : 0);
  return 44 + lines * LINE_HEIGHT + (hasImagePreview ? 108 : 0) + (hasOtherFiles ? 24 : 0);
}

/**
 * Reparte las notas en columnas (estilo mosaico): cada una va a la columna que lleve menos alto.
 * Dentro de cada columna se conserva el orden de entrada; las columnas sobrantes quedan vacías.
 */
export function splitIntoColumns<T>(
  items: readonly T[],
  columns: number,
  heightOf: (item: T) => number
): T[][] {
  const count = Math.max(1, Math.floor(columns) || 1);
  const result: T[][] = Array.from({ length: count }, () => []);
  const heights = new Array<number>(count).fill(0);

  for (const item of items) {
    let target = 0;
    for (let column = 1; column < count; column++) {
      if (heights[column] < heights[target]) target = column;
    }
    result[target].push(item);
    heights[target] += heightOf(item);
  }

  return result;
}
