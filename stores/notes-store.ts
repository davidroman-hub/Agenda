import { mmkvStorage } from "@/lib/mmkv";
import { Attachment } from "@/utils/attachments";
import {
  DEFAULT_NOTE_COLOR,
  isNoteColorId,
  isNoteEmpty,
  Note,
  NoteColorId,
  normalizeNotes,
  sanitizeNoteText,
} from "@/utils/notes";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface NoteInput {
  text: string;
  color?: NoteColorId;
  attachments?: Attachment[];
}

// Solo lo que se puede cambiar de una nota
export type NoteUpdates = Partial<NoteInput>;

interface NotesState {
  notes: Note[];

  // Devuelve la nota creada, o null si no tiene ni texto ni archivos
  addNote: (input: NoteInput) => Note | null;
  // false si la nota no existe o el cambio la dejaría vacía (sin texto ni archivos)
  updateNote: (id: string, updates: NoteUpdates) => boolean;
  // Sus archivos adjuntos se borran solos (ver services/attachments-cleanup.ts)
  deleteNote: (id: string) => void;
}

const newNoteId = () => `note-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

/**
 * Las notas NO son tareas: viven aquí, sin fecha ni línea, y nunca entran en `tasksByDate`, el
 * calendario, las tareas pasadas ni los filtros por tipo.
 */
const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote: ({ text, color, attachments }) => {
        const cleanText = sanitizeNoteText(text);
        if (isNoteEmpty({ text: cleanText, attachments })) return null;

        const now = new Date().toISOString();
        const note: Note = {
          id: newNoteId(),
          text: cleanText,
          color: isNoteColorId(color) ? color : DEFAULT_NOTE_COLOR,
          createdAt: now,
          updatedAt: now,
          // Sin la clave si no hay archivos, igual que en las tareas
          ...(attachments?.length ? { attachments } : {}),
        };

        set((state) => ({ notes: [...state.notes, note] }));
        return note;
      },

      updateNote: (id, updates) => {
        const existing = get().notes.find((note) => note.id === id);
        if (!existing) return false;

        const next: Note = {
          ...existing,
          text: "text" in updates ? sanitizeNoteText(updates.text) : existing.text,
          color: isNoteColorId(updates.color) ? updates.color : existing.color,
          updatedAt: new Date().toISOString(),
        };
        // La clave `attachments` solo se toca si viene; una lista vacía la quita
        if ("attachments" in updates) {
          if (updates.attachments?.length) next.attachments = updates.attachments;
          else delete next.attachments;
        }

        if (isNoteEmpty(next)) return false;

        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? next : note)),
        }));
        return true;
      },

      deleteNote: (id) => {
        set((state) => ({ notes: state.notes.filter((note) => note.id !== id) }));
      },
    }),
    {
      name: "notes-storage",
      storage: createJSONStorage(() => mmkvStorage),
      // Lo guardado no se da por bueno: se limpia al cargar (notas rotas, colores raros, adjuntos inseguros)
      merge: (persisted, current) => ({
        ...current,
        notes: normalizeNotes((persisted as { notes?: unknown } | undefined)?.notes),
      }),
    }
  )
);

export default useNotesStore;
