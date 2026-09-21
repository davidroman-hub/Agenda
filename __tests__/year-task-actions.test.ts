/**
 * Las acciones de la lista de año, con los stores reales: marcar hecha una tarea (propia o
 * ocurrencia de una repetida) y abrirla en el libro. Lo importante es que hagan exactamente lo que
 * hace el libro, y que los ids que le pasan sean los que el libro sabe encontrar.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: {
    scheduleTaskReminder: jest.fn(async () => null),
    cancelTaskReminder: jest.fn(async () => undefined),
  },
}));

import {
  openDayInBook,
  openEntryInBook,
  openSeriesInBook,
  toggleYearEntry,
} from "../services/year-task-actions";
import useAgendaSectionStore from "../stores/agenda-section-store";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useBookNavigationStore from "../stores/book-navigation-store";
import useRepeatingTasksStore from "../stores/repeating-tasks-store";
import { findTaskLine } from "../utils/book-navigation";
import { buildDayTasks } from "../utils/day-tasks";
import { buildYearIndex, YearEntry } from "../utils/year-view";

const agenda = () => useAgendaTasksStore.getState();
const repeating = () => useRepeatingTasksStore.getState();
const target = () => useBookNavigationStore.getState().target;

const TOTAL_LINES = 12;

function yearIndex(year = 2026) {
  return buildYearIndex({
    year,
    tasksByDate: agenda().tasksByDate,
    patterns: repeating().repeatingPatterns,
    completions: repeating().repeatingTaskCompletions,
  });
}

const entryOf = (dateKey: string, taskText: string, year = 2026): YearEntry => {
  const entry = yearIndex(year).days.get(dateKey)?.entries.find((candidate) => candidate.task.text === taskText);
  if (!entry) throw new Error(`No hay «${taskText}» el ${dateKey}`);
  return entry;
};

// La línea en la que el libro encontraría la tarea abierta desde esa petición
const lineInBook = (dateKey: string, taskId: string) => {
  const { normalTasks, repeatedTasks } = buildDayTasks(
    dateKey,
    agenda().tasksByDate,
    repeating().repeatingPatterns,
    repeating().repeatingTaskCompletions
  );
  return findTaskLine(taskId, normalTasks, repeatedTasks, TOTAL_LINES);
};

beforeEach(async () => {
  useAgendaTasksStore.setState({ tasksByDate: {}, linesStatus: {} });
  useRepeatingTasksStore.setState({ repeatingPatterns: [], repeatingTaskCompletions: {} });
  useBookNavigationStore.setState({ target: null });
  useAgendaSectionStore.setState({ section: "agenda", agendaView: "book", yearFocus: null });

  await agenda().addTask("2026-03-02", 3, "Suelta");
  await agenda().addTask("2026-03-02", 1, "Semanal");
  const weekly = agenda().getTaskForLine("2026-03-02", 1)!;
  repeating().addRepeatingPattern({ originalTaskId: weekly.id, repeatOption: "weekly", startDate: "2026-03-02" });
});

describe("toggleYearEntry", () => {
  it("una tarea propia se marca y se desmarca en su línea", () => {
    toggleYearEntry(entryOf("2026-03-02", "Suelta"));
    expect(agenda().getTaskForLine("2026-03-02", 3)?.completed).toBe(true);

    toggleYearEntry(entryOf("2026-03-02", "Suelta"));
    expect(agenda().getTaskForLine("2026-03-02", 3)?.completed).toBe(false);
  });

  it("una ocurrencia repetida se marca solo ese día, en el store de repeticiones", () => {
    const original = agenda().getTaskForLine("2026-03-02", 1)!;
    toggleYearEntry(entryOf("2026-03-09", "Semanal"));

    expect(repeating().isRepeatingTaskCompleted(original.id, "2026-03-09")).toBe(true);
    expect(repeating().isRepeatingTaskCompleted(original.id, "2026-03-16")).toBe(false);
    // La tarea original no cambia
    expect(agenda().getTaskForLine("2026-03-02", 1)?.completed).toBe(false);
  });

  it("el índice del año refleja lo marcado, sin tocar otras ocurrencias", () => {
    toggleYearEntry(entryOf("2026-03-09", "Semanal"));
    expect(entryOf("2026-03-09", "Semanal").task.completed).toBe(true);
    expect(entryOf("2026-03-16", "Semanal").task.completed).toBe(false);

    toggleYearEntry(entryOf("2026-03-09", "Semanal"));
    expect(entryOf("2026-03-09", "Semanal").task.completed).toBe(false);
  });

  it("marca lo mismo que marcaría el libro (misma clave de completado)", () => {
    const original = agenda().getTaskForLine("2026-03-02", 1)!;
    toggleYearEntry(entryOf("2026-03-09", "Semanal"));
    expect(repeating().repeatingTaskCompletions[`${original.id}-2026-03-09`]).toBe(true);
  });
});

describe("abrir en el libro", () => {
  it("una tarea propia: pide el día y su id, y el libro la encuentra en su línea", () => {
    const entry = entryOf("2026-03-02", "Suelta");
    openEntryInBook(entry);

    expect(target()).toMatchObject({ date: "2026-03-02", taskId: entry.task.id });
    expect(lineInBook(target()!.date, target()!.taskId!)).toBe(3);
  });

  it("una ocurrencia repetida: pide el id de la ORIGINAL (no el virtual), que es el que el libro busca", () => {
    const original = agenda().getTaskForLine("2026-03-02", 1)!;
    const entry = entryOf("2026-03-09", "Semanal");
    expect(entry.task.id).not.toBe(original.id); // el id de la ocurrencia es virtual
    openEntryInBook(entry);

    expect(target()).toMatchObject({ date: "2026-03-09", taskId: original.id });
    // Las ocurrencias se dibujan tras las líneas de escribir: TOTAL_LINES + 1
    expect(lineInBook("2026-03-09", target()!.taskId!)).toBe(TOTAL_LINES + 1);
  });

  it("con el id virtual el libro NO la encontraría (por eso se usa el de la original)", () => {
    const entry = entryOf("2026-03-09", "Semanal");
    expect(lineInBook("2026-03-09", entry.task.id)).toBeNull();
  });

  it("una serie: lleva a su primera ocurrencia del año y el libro la encuentra", () => {
    const series = yearIndex().series[0];
    openSeriesInBook(series);

    expect(target()).toMatchObject({ date: series.firstDateKey, taskId: series.originalId });
    expect(lineInBook(series.firstDateKey, series.originalId)).toBe(TOTAL_LINES + 1);
  });

  it("un día sin tarea concreta: pide el día con id vacío y el libro solo va a él, sin abrir nada", () => {
    openDayInBook("2026-03-02");

    expect(target()).toMatchObject({ date: "2026-03-02", taskId: "" });
    expect(lineInBook("2026-03-02", "")).toBeNull();
  });

  it("dos peticiones seguidas al mismo destino se distinguen", () => {
    jest.useFakeTimers();
    try {
      openDayInBook("2026-03-02");
      const first = target()!.requestedAt;
      jest.advanceTimersByTime(5);
      openDayInBook("2026-03-02");
      expect(target()!.requestedAt).toBeGreaterThan(first);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("vista de la agenda (libro o año)", () => {
  it("arranca en el libro, dentro de la agenda", () => {
    expect(useAgendaSectionStore.getState()).toMatchObject({ section: "agenda", agendaView: "book" });
  });

  it("showYear y showBook cambian la vista y dejan la sección en la agenda", () => {
    useAgendaSectionStore.getState().showNotes();
    useAgendaSectionStore.getState().showYear();
    expect(useAgendaSectionStore.getState()).toMatchObject({ section: "agenda", agendaView: "year" });

    useAgendaSectionStore.getState().showNotes();
    useAgendaSectionStore.getState().showBook();
    expect(useAgendaSectionStore.getState()).toMatchObject({ section: "agenda", agendaView: "book" });
  });

  it("showAgenda vuelve de las notas a la vista en la que se estaba", () => {
    useAgendaSectionStore.getState().showYear();
    useAgendaSectionStore.getState().showNotes();
    expect(useAgendaSectionStore.getState().section).toBe("notes");

    useAgendaSectionStore.getState().showAgenda();
    expect(useAgendaSectionStore.getState()).toMatchObject({ section: "agenda", agendaView: "year" });
  });

  it("recuerda dónde se estaba en el año, y arranca sin nada", () => {
    expect(useAgendaSectionStore.getState().yearFocus).toBeNull();
    useAgendaSectionStore.getState().setYearFocus({ year: 2027, scope: { kind: "month", month: 5 } });
    expect(useAgendaSectionStore.getState().yearFocus).toEqual({ year: 2027, scope: { kind: "month", month: 5 } });
  });

  it("cambiar de vista o ir a las notas no borra dónde se estaba en el año", () => {
    useAgendaSectionStore.getState().setYearFocus({ year: 2027, scope: { kind: "day", dateKey: "2027-05-04" } });
    useAgendaSectionStore.getState().showBook();
    useAgendaSectionStore.getState().showNotes();
    useAgendaSectionStore.getState().showYear();
    expect(useAgendaSectionStore.getState().yearFocus).toEqual({ year: 2027, scope: { kind: "day", dateKey: "2027-05-04" } });
  });

  it("ir a las notas no cambia la vista recordada", () => {
    useAgendaSectionStore.getState().showYear();
    useAgendaSectionStore.getState().showNotes();
    expect(useAgendaSectionStore.getState().agendaView).toBe("year");
  });
});
