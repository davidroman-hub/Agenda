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
  { id: "yellow", hex: "#FFE66D" },
  { id: "orange", hex: "#FFB86B" },
  { id: "pink", hex: "#FF9EBB" },
  { id: "green", hex: "#B8E986" },
  { id: "blue", hex: "#8ED1FC" },
] as const;

export type NoteColorId = (typeof NOTE_COLORS)[number]["id"];

export const DEFAULT_NOTE_COLOR: NoteColorId = "yellow";
export const MAX_NOTE_LENGTH = 2000;
/** Líneas de texto que se ven en la tarjeta (el resto se lee al abrir la nota) */
export const NOTE_CARD_MAX_LINES = 8;

/** El tablero es de un amarillo oscuro; los post-it, claros, y por eso su texto es siempre oscuro */
export const NOTES_BOARD_BACKGROUND = { light: "#C79A2B", dark: "#5C4513" } as const;
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

/**
 * Inclinación de cada post-it, en grados: pequeña, y siempre la misma para la misma nota (sale de su
 * id), para que el tablero no "baile" cada vez que se dibuja. Entre -2,5° y 2,5°.
 */
export function noteRotation(id: string): number {
  let hash = 5381;
  for (let index = 0; index < id.length; index++) {
    hash = ((hash * 33) ^ id.charCodeAt(index)) >>> 0;
  }
  return ((hash % 11) - 5) * 0.5;
}

const timeOf = (iso: string) => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
};

/** Las más recientes primero; a igualdad, por id, para que el orden no cambie de un arranque a otro */
export function sortNotes<T extends Pick<Note, "id" | "createdAt">>(notes: readonly T[]): T[] {
  return [...notes].sort(
    (a, b) => timeOf(b.createdAt) - timeOf(a.createdAt) || a.id.localeCompare(b.id)
  );
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
    const { id, text, color, createdAt, updatedAt, attachments } = entry as Record<string, unknown>;
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
