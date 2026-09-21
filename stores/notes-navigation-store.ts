import { create } from "zustand";

/** Qué nota debe abrir el tablero de notas (p. ej. al tocar un post-it del widget) */
export interface NoteTarget {
  /** El id de la nota, o "new" para abrir una nota nueva */
  id: string;
  /** Distingue dos peticiones al mismo destino */
  requestedAt: number;
}

interface NotesNavigationState {
  target: NoteTarget | null;
  requestNote: (id: string) => void;
  requestNewNote: () => void;
  clearTarget: () => void;
}

// No se guarda en disco: es una petición que se consume en cuanto el tablero la atiende. Vive en un store
// para que también funcione si el tablero aún no se ha montado (la app se acaba de abrir desde el widget)
const useNotesNavigationStore = create<NotesNavigationState>()((set) => ({
  target: null,
  requestNote: (id) => set({ target: { id, requestedAt: Date.now() } }),
  requestNewNote: () => set({ target: { id: "new", requestedAt: Date.now() } }),
  clearTarget: () => set({ target: null }),
}));

export default useNotesNavigationStore;
