import useAgendaSectionStore from "../stores/agenda-section-store";
import useBookNavigationStore from "../stores/book-navigation-store";
import useNotesNavigationStore from "../stores/notes-navigation-store";
import {
  requestNewTaskFromWidget,
  requestNoteFromWidget,
} from "../services/widget-navigation";

beforeEach(() => {
  useBookNavigationStore.setState({ target: null });
  useNotesNavigationStore.setState({ target: null });
  useAgendaSectionStore.setState({ section: "agenda" });
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
  it("el botón +: abre las notas y pide una nueva", () => {
    requestNoteFromWidget(true);

    expect(useAgendaSectionStore.getState().section).toBe("notes");
    expect(useNotesNavigationStore.getState().target).toMatchObject({ id: "new" });
  });

  it("sin nueva (tocar una nota o el tablero): solo abre las notas", () => {
    requestNoteFromWidget(false);

    expect(useAgendaSectionStore.getState().section).toBe("notes");
    expect(useNotesNavigationStore.getState().target).toBeNull();
  });
});
