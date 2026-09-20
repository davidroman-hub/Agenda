/**
 * Cuándo se fuerza la pantalla en horizontal, cuándo se oculta la barra de abajo y qué recuerda el
 * store. La regla clave: solo se fuerza viendo el año y habiéndolo pedido; en cuanto se sale del año
 * deja de forzarse, pero lo pedido se recuerda para cuando se vuelva.
 */
import useAgendaSectionStore from "../stores/agenda-section-store";
import { AgendaSection, AgendaView, getTabBarStyle, isLandscapeForced } from "../utils/agenda-strip";

const state = (section: AgendaSection, agendaView: AgendaView, landscapeYear: boolean) => ({ section, agendaView, landscapeYear });

describe("isLandscapeForced", () => {
  it("solo en la agenda, en la vista de año y habiéndolo pedido", () => {
    expect(isLandscapeForced(state("agenda", "year", true))).toBe(true);
  });

  it.each([
    ["sin haberlo pedido", state("agenda", "year", false)],
    ["en el libro, aunque se hubiera pedido", state("agenda", "book", true)],
    ["en las notas, aunque se hubiera pedido", state("notes", "year", true)],
    ["en las notas con la vista de año recordada", state("notes", "year", false)],
    ["en el libro sin pedirlo", state("agenda", "book", false)],
    ["en las notas con el libro recordado", state("notes", "book", true)],
  ])("no se fuerza %s", (_label, current) => {
    expect(isLandscapeForced(current)).toBe(false);
  });
});

describe("getTabBarStyle", () => {
  it("con sesión y en vertical, la barra se ve (sin estilo especial)", () => {
    expect(getTabBarStyle({ isLoggedIn: true, forcedLandscape: false })).toBeUndefined();
  });

  it("sin sesión se oculta", () => {
    expect(getTabBarStyle({ isLoggedIn: false, forcedLandscape: false })).toEqual({ display: "none" });
  });

  it("con el año forzado en horizontal se oculta, para ganar altura", () => {
    expect(getTabBarStyle({ isLoggedIn: true, forcedLandscape: true })).toEqual({ display: "none" });
  });

  it("sin sesión y en horizontal, oculta también", () => {
    expect(getTabBarStyle({ isLoggedIn: false, forcedLandscape: true })).toEqual({ display: "none" });
  });
});

describe("landscapeYear en el store", () => {
  beforeEach(() => {
    useAgendaSectionStore.setState({ section: "agenda", agendaView: "book", landscapeYear: false });
  });

  it("arranca apagado", () => {
    expect(useAgendaSectionStore.getState().landscapeYear).toBe(false);
  });

  it("se puede encender y apagar", () => {
    useAgendaSectionStore.getState().setLandscapeYear(true);
    expect(useAgendaSectionStore.getState().landscapeYear).toBe(true);
    useAgendaSectionStore.getState().setLandscapeYear(false);
    expect(useAgendaSectionStore.getState().landscapeYear).toBe(false);
  });

  it("pedirlo no fuerza nada hasta que se está en la vista de año", () => {
    useAgendaSectionStore.getState().setLandscapeYear(true);
    expect(isLandscapeForced(useAgendaSectionStore.getState())).toBe(false);

    useAgendaSectionStore.getState().showYear();
    expect(isLandscapeForced(useAgendaSectionStore.getState())).toBe(true);
  });

  it("al volver al libro deja de forzarse pero se recuerda; al volver al año, vuelve a forzarse", () => {
    useAgendaSectionStore.getState().showYear();
    useAgendaSectionStore.getState().setLandscapeYear(true);
    expect(isLandscapeForced(useAgendaSectionStore.getState())).toBe(true);

    useAgendaSectionStore.getState().showBook();
    expect(isLandscapeForced(useAgendaSectionStore.getState())).toBe(false);
    expect(useAgendaSectionStore.getState().landscapeYear).toBe(true);

    useAgendaSectionStore.getState().showYear();
    expect(isLandscapeForced(useAgendaSectionStore.getState())).toBe(true);
  });

  it("ir a las notas y volver al año también respeta lo pedido", () => {
    useAgendaSectionStore.getState().showYear();
    useAgendaSectionStore.getState().setLandscapeYear(true);

    useAgendaSectionStore.getState().showNotes();
    expect(isLandscapeForced(useAgendaSectionStore.getState())).toBe(false);

    useAgendaSectionStore.getState().showAgenda(); // vuelve a la vista en la que estaba: el año
    expect(isLandscapeForced(useAgendaSectionStore.getState())).toBe(true);
  });

  it("apagarlo desde el año devuelve la pantalla (deja de forzarse) sin salir del año", () => {
    useAgendaSectionStore.getState().showYear();
    useAgendaSectionStore.getState().setLandscapeYear(true);
    useAgendaSectionStore.getState().setLandscapeYear(false);

    expect(isLandscapeForced(useAgendaSectionStore.getState())).toBe(false);
    expect(useAgendaSectionStore.getState().agendaView).toBe("year");
  });
});
