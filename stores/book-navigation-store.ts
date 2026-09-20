import { create } from "zustand";

/** Día y tarea que el libro debe mostrar (p. ej. al tocar una notificación) */
export interface BookTarget {
  /** YYYY-MM-DD */
  date: string;
  taskId: string;
  /** Distingue dos peticiones al mismo destino */
  requestedAt: number;
}

interface BookNavigationState {
  target: BookTarget | null;
  requestTarget: (date: string, taskId: string) => void;
  clearTarget: () => void;
}

// No se guarda en disco: es una petición de "lleva el libro aquí" que se consume en cuanto se atiende.
// Vive en un store (y no en un parámetro de ruta) para que también funcione si el libro aún no se
// ha montado, como al abrir la app desde una notificación.
const useBookNavigationStore = create<BookNavigationState>()((set) => ({
  target: null,
  requestTarget: (date, taskId) =>
    set({ target: { date, taskId, requestedAt: Date.now() } }),
  clearTarget: () => set({ target: null }),
}));

export default useBookNavigationStore;
