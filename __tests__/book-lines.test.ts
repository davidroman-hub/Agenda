import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import { computeLineStatus, getHighestUsedLine, getTotalLines } from "../utils/book-lines";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: {
    scheduleTaskReminder: jest.fn(async () => null),
    cancelTaskReminder: jest.fn(async () => undefined),
  },
}));

import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useBookSettingsStore from "../stores/boook-settings";

const task = (id: string): AgendaTask => ({
  id,
  text: `tarea ${id}`,
  completed: false,
  createdAt: "x",
  updatedAt: "x",
});

// Un día con una tarea en cada una de estas líneas
const dayWithTasksOn = (...lines: number[]): DayTasks =>
  Object.fromEntries(lines.map((line) => [line, task(`t${line}`)]));

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("getHighestUsedLine", () => {
  it("es 0 en un día vacío o sin definir", () => {
    expect(getHighestUsedLine(undefined)).toBe(0);
    expect(getHighestUsedLine({})).toBe(0);
  });

  it("devuelve la última línea con tarea e ignora las entradas nulas", () => {
    expect(getHighestUsedLine({ ...dayWithTasksOn(2, 9), 14: null })).toBe(9);
  });
});

describe("getTotalLines", () => {
  it("suma las líneas del ajuste y las extra del día", () => {
    expect(getTotalLines({}, 6, 0)).toBe(6);
    expect(getTotalLines({}, 15, 3)).toBe(18);
  });

  it("nunca es menos que la última línea con una tarea (bajar el ajuste no oculta tareas)", () => {
    expect(getTotalLines(dayWithTasksOn(1, 10), 6, 0)).toBe(10);
    expect(getTotalLines(dayWithTasksOn(1, 3), 6, 0)).toBe(6);
  });
});

describe("computeLineStatus", () => {
  it("con 6 líneas y todas ocupadas no quedan líneas libres (antes ofrecía la 7 a la 12)", () => {
    const status = computeLineStatus(dayWithTasksOn(...range(1, 6)), 6, 0);
    expect(status.availableLines).toEqual([]);
    expect(status.totalLines).toBe(6);
  });

  it("con 15 líneas ofrece de la 13 a la 15 (antes se quedaba en 12)", () => {
    const status = computeLineStatus(dayWithTasksOn(...range(1, 12)), 15, 0);
    expect(status.availableLines).toEqual([13, 14, 15]);
  });

  it("las líneas extra amplían las disponibles", () => {
    const status = computeLineStatus(dayWithTasksOn(...range(1, 6)), 6, 2);
    expect(status.availableLines).toEqual([7, 8]);
  });

  it("ordena las ocupadas y deja fuera las nulas", () => {
    const status = computeLineStatus({ 5: task("a"), 2: task("b"), 9: null }, 12, 0);
    expect(status.occupiedLines).toEqual([2, 5]);
    expect(status.availableLines).not.toContain(2);
    expect(status.availableLines).toContain(9);
  });

  it("con tareas más allá del ajuste, la página crece hasta ellas y no ofrece líneas ocupadas", () => {
    const status = computeLineStatus(dayWithTasksOn(...range(1, 9)), 6, 0);
    expect(status.totalLines).toBe(9);
    expect(status.availableLines).toEqual([]);
  });
});

describe("store de tareas con el ajuste 'líneas por página'", () => {
  const DAY = "2026-09-20";

  beforeEach(() => {
    useAgendaTasksStore.setState({ tasksByDate: {}, linesStatus: {} });
    useBookSettingsStore.setState({ linesPerPage: 12 });
  });

  const fillDay = (...lines: number[]) =>
    useAgendaTasksStore.setState({ tasksByDate: { [DAY]: dayWithTasksOn(...lines) } });

  it("por defecto (12 líneas) ofrece las 12", () => {
    expect(useAgendaTasksStore.getState().getAvailableLinesForDate(DAY)).toEqual(range(1, 12));
  });

  it("con 6 líneas ocupadas y el ajuste en 6, no ofrece la línea 7 (que la página no dibuja)", () => {
    useBookSettingsStore.setState({ linesPerPage: 6 });
    fillDay(...range(1, 6));

    expect(useAgendaTasksStore.getState().getAvailableLinesForDate(DAY)).toEqual([]);
  });

  it("con el ajuste en 15, ofrece las líneas 13 a 15", () => {
    useBookSettingsStore.setState({ linesPerPage: 15 });
    fillDay(...range(1, 12));

    expect(useAgendaTasksStore.getState().getAvailableLinesForDate(DAY)).toEqual([13, 14, 15]);
  });

  it("cambiar el ajuste se nota al momento, aunque la caché se hubiera calculado antes", () => {
    fillDay(1, 2);
    useAgendaTasksStore.getState().updateLinesStatus(DAY); // caché calculada con 12 líneas
    expect(useAgendaTasksStore.getState().getAvailableLinesForDate(DAY)).toHaveLength(10);

    useBookSettingsStore.setState({ linesPerPage: 6 });

    expect(useAgendaTasksStore.getState().getAvailableLinesForDate(DAY)).toEqual([3, 4, 5, 6]);
  });

  it("las líneas extra del día se suman al ajuste", () => {
    useBookSettingsStore.setState({ linesPerPage: 6 });
    fillDay(...range(1, 6));
    useAgendaTasksStore.setState({
      linesStatus: { [DAY]: { occupiedLines: [], availableLines: [], extraLines: 2 } },
    });

    expect(useAgendaTasksStore.getState().getAvailableLinesForDate(DAY)).toEqual([7, 8]);
  });

  it("updateLinesStatus también usa el ajuste actual", () => {
    useBookSettingsStore.setState({ linesPerPage: 8 });
    fillDay(1);
    useAgendaTasksStore.getState().updateLinesStatus(DAY);

    expect(useAgendaTasksStore.getState().linesStatus[DAY].availableLines).toEqual(range(2, 8));
  });

  it("consultar las líneas no modifica el store (antes escribía durante el render)", () => {
    fillDay(1);
    const before = useAgendaTasksStore.getState().linesStatus;

    useAgendaTasksStore.getState().getAvailableLinesForDate(DAY);
    useAgendaTasksStore.getState().getOccupiedLinesForDate(DAY);

    expect(useAgendaTasksStore.getState().linesStatus).toBe(before);
  });
});
