import { AgendaSection } from "@/utils/agenda-strip";
import { create } from "zustand";

interface AgendaSectionState {
  // No se guarda: la app siempre abre en la agenda
  section: AgendaSection;
  showNotes: () => void;
  showAgenda: () => void;
}

const useAgendaSectionStore = create<AgendaSectionState>()((set) => ({
  section: "agenda",
  showNotes: () => set({ section: "notes" }),
  showAgenda: () => set({ section: "agenda" }),
}));

export default useAgendaSectionStore;
