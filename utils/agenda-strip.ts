import { FILTER_ALL, getVisibleTabs, TypeFilter, TypeTab } from "./task-types";

/** Lo que enseña la agenda: el libro con sus tareas, o el tablero de notas (que no son tareas) */
export type AgendaSection = "agenda" | "notes";

export interface StripTab extends Omit<TypeTab, "kind"> {
  /** "agenda" es la pestaña de "todas las tareas" cuando aún no hay tipos */
  kind: "agenda" | TypeTab["kind"];
  selected: boolean;
}

/**
 * Pestañas de la tira. La de "Notas" está siempre (es una sección por defecto) y no se calcula aquí:
 * es `section === "notes"`. Sin tipos creados solo hay una pestaña de tareas ("Agenda"), para poder
 * volver desde las notas; con tipos, las de siempre (Todas, Sin tipo, una por tipo).
 * En las notas no hay ninguna pestaña de tareas marcada.
 */
export function getStripTabs(options: {
  types: readonly { id: string }[];
  hasUntyped: boolean;
  filter: TypeFilter;
  section: AgendaSection;
}): StripTab[] {
  const { types, hasUntyped, filter, section } = options;
  const inAgenda = section === "agenda";

  const typeTabs = getVisibleTabs({ types, hasUntyped, filter });
  if (typeTabs.length === 0) {
    return [{ filter: FILTER_ALL, kind: "agenda", selected: inAgenda }];
  }

  return typeTabs.map((tab) => ({ ...tab, selected: inAgenda && tab.filter === filter }));
}
