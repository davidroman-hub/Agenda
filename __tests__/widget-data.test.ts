import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { buildWidgetPayload, WIDGET_MAX_TASKS_PER_DAY } from "../utils/widget-data";

const task = (id: string, overrides: Partial<AgendaTask> = {}): AgendaTask => ({
  id,
  text: `tarea ${id}`,
  completed: false,
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  ...overrides,
});

const daily = (originalTaskId: string, startDate: string): RepeatingTaskPattern => ({
  id: `pattern-${originalTaskId}`,
  originalTaskId,
  repeatOption: "daily",
  startDate,
  createdAt: "2026-09-01T06:00:00.000Z",
  isActive: true,
});

const TODAY = "2026-09-21";

describe("buildWidgetPayload", () => {
  it("manda hoy y los 7 días siguientes, también los vacíos", () => {
    const { days } = buildWidgetPayload(TODAY, {}, [], {});

    expect(Object.keys(days)).toEqual([
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24",
      "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28",
    ]);
    expect(days["2026-09-21"]).toEqual({ total: 0, completed: 0, tasks: [] });
  });

  it("cruza el fin de mes y de año sin desfases", () => {
    const { days } = buildWidgetPayload("2026-12-30", {}, [], {}, 3);
    expect(Object.keys(days)).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  });

  it("cuenta el total y las completadas, y lista solo las pendientes en el orden del libro", () => {
    const tasksByDate: Record<string, DayTasks> = {
      [TODAY]: {
        3: task("c", { text: "tercera" }),
        1: task("a", { text: "primera" }),
        2: task("b", { text: "hecha", completed: true }),
      },
    };

    const { days } = buildWidgetPayload(TODAY, tasksByDate, [], {});

    expect(days[TODAY].total).toBe(3);
    expect(days[TODAY].completed).toBe(1);
    expect(days[TODAY].tasks).toEqual([
      { id: "a", text: "primera", repeating: false },
      { id: "c", text: "tercera", repeating: false },
    ]);
  });

  it("ignora líneas vacías y tareas sin texto", () => {
    const tasksByDate: Record<string, DayTasks> = {
      [TODAY]: { 1: null, 2: task("x", { text: "" }), 3: task("y", { text: "con texto" }) },
    };

    const { days } = buildWidgetPayload(TODAY, tasksByDate, [], {});

    expect(days[TODAY].total).toBe(1);
    expect(days[TODAY].tasks.map((item) => item.id)).toEqual(["y"]);
  });

  it("las repetidas aparecen los días siguientes con el id de la tarea original y su propio estado", () => {
    const tasksByDate: Record<string, DayTasks> = { [TODAY]: { 1: task("t1", { text: "diaria" }) } };
    const completions = { "t1-2026-09-22": true };

    const { days } = buildWidgetPayload(TODAY, tasksByDate, [daily("t1", TODAY)], completions);

    // El día de creación es la propia tarea; después, instancias repetidas
    expect(days[TODAY].tasks).toEqual([{ id: "t1", text: "diaria", repeating: false }]);
    expect(days["2026-09-22"]).toEqual({ total: 1, completed: 1, tasks: [] });
    expect(days["2026-09-23"].tasks).toEqual([{ id: "t1", text: "diaria", repeating: true }]);
  });

  it("recorta las pendientes de cada día, pero el total sigue siendo el real", () => {
    const many: DayTasks = {};
    for (let line = 1; line <= WIDGET_MAX_TASKS_PER_DAY + 3; line++) many[line] = task(`t${line}`);

    const { days } = buildWidgetPayload(TODAY, { [TODAY]: many }, [], {});

    expect(days[TODAY].tasks).toHaveLength(WIDGET_MAX_TASKS_PER_DAY);
    expect(days[TODAY].total).toBe(WIDGET_MAX_TASKS_PER_DAY + 3);
  });
});
