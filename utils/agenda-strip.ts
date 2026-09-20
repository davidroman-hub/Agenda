import { FILTER_ALL, getVisibleTabs, TypeFilter, TypeTab } from "./task-types";

/** Lo que enseña la agenda: el libro con sus tareas, o el tablero de notas (que no son tareas) */
export type AgendaSection = "agenda" | "notes";

/** Dentro de la agenda: el libro, día a día, o la vista de año (calendario entero y tareas al lado) */
export type AgendaView = "book" | "year";

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

/**
 * ¿Hay que tener la pantalla forzada en horizontal? Solo en la vista de año, y solo si el usuario lo
 * ha pedido. En cuanto se vuelve al libro o se va a las notas deja de estarlo, y la pantalla vuelve
 * a como estaba (vertical). Lo que se pidió se recuerda: al volver al año, vuelve a horizontal.
 */
export function isLandscapeForced(state: {
  section: AgendaSection;
  agendaView: AgendaView;
  landscapeYear: boolean;
}): boolean {
  return state.section === "agenda" && state.agendaView === "year" && state.landscapeYear;
}

/**
 * Estilo de la barra de pestañas de abajo (Agenda, Tareas pasadas, Ajustes…): oculta sin sesión y,
 * en horizontal, para ganar altura (con la pantalla tumbada cada píxel de alto cuenta). En horizontal
 * se vuelve a ver al volver a vertical desde el botón de la vista de año.
 */
export function getTabBarStyle(options: {
  isLoggedIn: boolean;
  forcedLandscape: boolean;
}): { display: "none" } | undefined {
  return !options.isLoggedIn || options.forcedLandscape ? { display: "none" } : undefined;
}
