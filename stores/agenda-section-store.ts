import { AgendaSection, AgendaView } from "@/utils/agenda-strip";
import type { YearScope } from "@/utils/year-view";
import { create } from "zustand";

// Dónde se estaba mirando en la vista de año
export interface YearFocus {
  year: number;
  scope: YearScope;
}

interface AgendaSectionState {
  // Ninguno de los dos se guarda: la app siempre abre en el libro
  section: AgendaSection;
  // Cómo se ve la agenda (el libro o el año); en las notas no se usa, pero se recuerda para volver
  agendaView: AgendaView;
  // Se recuerda mientras la app está abierta, para que ir al libro a abrir una tarea y volver al año
  // no devuelva la vista al año actual; null hasta que se abre la vista de año
  yearFocus: YearFocus | null;
  setYearFocus: (focus: YearFocus) => void;
  // El usuario ha pedido ver el año en horizontal (ver isLandscapeForced en utils/agenda-strip.ts).
  // Sigue así al ir al libro y volver, pero la pantalla solo se fuerza mientras se ve el año
  landscapeYear: boolean;
  setLandscapeYear: (landscape: boolean) => void;
  showNotes: () => void;
  // Vuelve a la agenda en la vista en la que estaba (desde las notas)
  showAgenda: () => void;
  showBook: () => void;
  showYear: () => void;
}

const useAgendaSectionStore = create<AgendaSectionState>()((set) => ({
  section: "agenda",
  agendaView: "book",
  yearFocus: null,
  setYearFocus: (focus) => set({ yearFocus: focus }),
  landscapeYear: false,
  setLandscapeYear: (landscape) => set({ landscapeYear: landscape }),
  showNotes: () => set({ section: "notes" }),
  showAgenda: () => set({ section: "agenda" }),
  showBook: () => set({ section: "agenda", agendaView: "book" }),
  showYear: () => set({ section: "agenda", agendaView: "year" }),
}));

export default useAgendaSectionStore;
