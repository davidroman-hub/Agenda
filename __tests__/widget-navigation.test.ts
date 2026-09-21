import useAgendaSectionStore from "../stores/agenda-section-store";
import useBookNavigationStore from "../stores/book-navigation-store";
import useNotesNavigationStore from "../stores/notes-navigation-store";
import {
  requestNewTaskFromWidget,
  requestNoteFromWidget,
  requestTaskFromWidget,
} from "../services/widget-navigation";

beforeEach(() => {
  useBookNavigationStore.setState({ target: null });
  useNotesNavigationStore.setState({ target: null });
  useAgendaSectionStore.setState({ section: "agenda" });
});

describe("requestTaskFromWidget", () => {
  it("pide abrir la tarea en su día", () => {
    expect(requestTaskFromWidget("2026-09-22", "t1")).toBe(true);

    expect(useBookNavigationStore.getState().target).toMatchObject({ date: "2026-09-22", taskId: "t1" });
  });

  it.each([
    ["sin fecha", undefined, "t1"],
    ["fecha mal formada", "22/09/2026", "t1"],
    ["sin id", "2026-09-22", undefined],
    ["id vacío", "2026-09-22", ""],
    ["parámetros repetidos (array)", ["2026-09-22"], "t1"],
  ])("%s: no pide ninguna tarea", (_name, date, id) => {
    expect(requestTaskFromWidget(date, id)).toBe(false);

    expect(useBookNavigationStore.getState().target).toBeNull();
  });
});

describe("requestNewTaskFromWidget (el botón + del widget de tareas)", () => {
  it("pide una tarea nueva en ese día (taskId null)", () => {
    expect(requestNewTaskFromWidget("2026-09-22")).toBe(true);

    expect(useBookNavigationStore.getState().target).toMatchObject({ date: "2026-09-22", taskId: null });
  });

  it.each([[undefined], ["ayer"], [["2026-09-22"]]])("con la fecha %p no pide nada", (date) => {
    expect(requestNewTaskFromWidget(date)).toBe(false);

    expect(useBookNavigationStore.getState().target).toBeNull();
  });
});

describe("requestNoteFromWidget (el widget de notas)", () => {
  it("una nota concreta: abre las notas y pide esa nota", () => {
    requestNoteFromWidget("note-1", false);

    expect(useAgendaSectionStore.getState().section).toBe("notes");
    expect(useNotesNavigationStore.getState().target).toMatchObject({ id: "note-1" });
  });

  it("el botón +: abre las notas y pide una nueva", () => {
    requestNoteFromWidget(undefined, true);

    expect(useAgendaSectionStore.getState().section).toBe("notes");
    expect(useNotesNavigationStore.getState().target).toMatchObject({ id: "new" });
  });

  it("sin id ni nueva (tocar el tablero): solo abre las notas", () => {
    requestNoteFromWidget(undefined, false);

    expect(useAgendaSectionStore.getState().section).toBe("notes");
    expect(useNotesNavigationStore.getState().target).toBeNull();
  });

  it("un id vacío no pide ninguna nota", () => {
    requestNoteFromWidget("", false);

    expect(useNotesNavigationStore.getState().target).toBeNull();
  });
});
