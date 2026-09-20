import { getFilteredPastTasks } from "../components/agendaComponents/pastTasks/pastTasksFilters/filterUtils";
import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import { computeLineStatus } from "../utils/book-lines";
import {
  FILTER_ALL,
  FILTER_NONE,
  filterVisibleLines,
  getVisibleTabs,
} from "../utils/task-types";

const task = (id: string, typeId?: string | null, extra: Partial<AgendaTask> = {}): AgendaTask => ({
  id,
  text: id,
  completed: false,
  createdAt: "x",
  updatedAt: "x",
  typeId,
  ...extra,
});

describe("getVisibleTabs", () => {
  const types = [{ id: "work" }, { id: "home" }];

  it("mientras no hay tipos no hay pestañas (la agenda se ve como siempre)", () => {
    expect(getVisibleTabs({ types: [], hasUntyped: true, filter: FILTER_ALL })).toEqual([]);
  });

  it("con tipos: 'Todas' y una pestaña por tipo, en orden de creación", () => {
    expect(getVisibleTabs({ types, hasUntyped: false, filter: FILTER_ALL }).map((tab) => tab.filter)).toEqual([
      FILTER_ALL,
      "work",
      "home",
    ]);
  });

  it("'Sin tipo' aparece solo si hay tareas sin tipo", () => {
    const withUntyped = getVisibleTabs({ types, hasUntyped: true, filter: FILTER_ALL });
    expect(withUntyped.map((tab) => tab.kind)).toEqual(["all", "none", "type", "type"]);
  });

  it("'Sin tipo' no desaparece mientras es la pestaña activa, aunque ya no queden tareas sin tipo", () => {
    const tabs = getVisibleTabs({ types, hasUntyped: false, filter: FILTER_NONE });
    expect(tabs.map((tab) => tab.kind)).toContain("none");
  });

  it("cada pestaña de tipo lleva su id", () => {
    const tabs = getVisibleTabs({ types, hasUntyped: false, filter: FILTER_ALL });
    expect(tabs.filter((tab) => tab.kind === "type").map((tab) => tab.typeId)).toEqual(["work", "home"]);
  });
});

describe("filterVisibleLines (qué filas del libro se dibujan)", () => {
  // Página con 6 líneas: 1 trabajo, 2 casa, 3 libre, 4 sin tipo, 5 libre, 6 trabajo
  const tasks: Record<number, AgendaTask> = { 1: task("a", "work"), 2: task("b", "home"), 4: task("c", null), 6: task("d", "work") };
  const lines = [1, 2, 3, 4, 5, 6].map((lineNumber) => ({ lineNumber, isVirtual: false }));
  const getTask = (lineNumber: number) => tasks[lineNumber] ?? null;
  const shown = (filter: string) => filterVisibleLines(lines, getTask, filter).map((line) => line.lineNumber);

  it("'Todas' dibuja todas las líneas", () => {
    expect(shown(FILTER_ALL)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("un tipo oculta las tareas de otros tipos y las sin tipo, pero deja las líneas libres", () => {
    expect(shown("work")).toEqual([1, 3, 5, 6]);
    expect(shown("home")).toEqual([2, 3, 5]);
  });

  it("'Sin tipo' deja las tareas sin tipo y las líneas libres", () => {
    expect(shown(FILTER_NONE)).toEqual([3, 4, 5]);
  });

  it("filtra también las filas de tareas repetidas (heredan el tipo de la original)", () => {
    const withRepeated = [...lines, { lineNumber: 7, isVirtual: true }, { lineNumber: 8, isVirtual: true }];
    const repeated: Record<number, AgendaTask> = { ...tasks, 7: task("r1", "work"), 8: task("r2", "home") };

    const visible = filterVisibleLines(withRepeated, (n) => repeated[n] ?? null, "work").map((l) => l.lineNumber);

    expect(visible).toContain(7);
    expect(visible).not.toContain(8);
  });

  it("una tarea con un tipo que ya no existe se trata como sin tipo", () => {
    const orphan: Record<number, AgendaTask> = { 1: task("a", "borrado") };
    const known = new Set(["work"]);

    expect(filterVisibleLines([{ lineNumber: 1 }], (n) => orphan[n] ?? null, FILTER_NONE, known)).toHaveLength(1);
    expect(filterVisibleLines([{ lineNumber: 1 }], (n) => orphan[n] ?? null, "work", known)).toHaveLength(0);
  });
});

describe("el filtro es solo visual: nunca cambia qué líneas están ocupadas", () => {
  // Este es el riesgo principal: si el filtro ocultara tareas de la ocupación, una tarea nueva
  // podría escribirse encima de una oculta y perderla.
  const day: DayTasks = { 1: task("a", "work"), 2: task("b", "home"), 3: task("c", null) };

  it("las líneas ocupadas y libres salen igual con cualquier tipo de tarea", () => {
    const status = computeLineStatus(day, 6, 0);

    expect(status.occupiedLines).toEqual([1, 2, 3]);
    expect(status.availableLines).toEqual([4, 5, 6]);
  });

  it("aunque el libro solo dibuje las tareas de un tipo, la primera línea libre sigue siendo la 4", () => {
    const drawn = filterVisibleLines(
      [1, 2, 3, 4, 5, 6].map((lineNumber) => ({ lineNumber })),
      (n) => day[n] ?? null,
      "work"
    ).map((l) => l.lineNumber);
    expect(drawn).toEqual([1, 4, 5, 6]); // se ocultan las líneas 2 y 3 (otro tipo y sin tipo)

    // …pero el cálculo de líneas libres NO usa lo que se dibuja
    expect(computeLineStatus(day, 6, 0).availableLines[0]).toBe(4);
  });
});

describe("getFilteredPastTasks con filtro por tipo", () => {
  const tasksByDate: Record<string, DayTasks> = {
    "2020-01-10": { 1: task("a", "work"), 2: task("b", "home"), 3: task("c", null) },
    "2020-01-11": { 1: task("d", "work", { completed: true }) },
    "2020-01-12": { 1: task("e", "home") },
  };
  const anyDate = () => true;
  const ids = (result: ReturnType<typeof getFilteredPastTasks>) =>
    result.flatMap(({ tasks }) => tasks.map(({ task: t }) => t.id)).sort();

  it("sin filtro por tipo (o con 'todas') devuelve todo, como antes", () => {
    expect(ids(getFilteredPastTasks(tasksByDate, anyDate))).toEqual(["a", "b", "c", "d", "e"]);
    expect(ids(getFilteredPastTasks(tasksByDate, anyDate, "all", FILTER_ALL))).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("un tipo deja solo sus tareas y quita los días que se quedan vacíos", () => {
    const result = getFilteredPastTasks(tasksByDate, anyDate, "all", "home");

    expect(ids(result)).toEqual(["b", "e"]);
    expect(result.map(({ date }) => date).sort()).toEqual(["2020-01-10", "2020-01-12"]);
  });

  it("'Sin tipo' deja las tareas sin tipo", () => {
    expect(ids(getFilteredPastTasks(tasksByDate, anyDate, "all", FILTER_NONE))).toEqual(["c"]);
  });

  it("se combina con el filtro de estado (completadas / pendientes)", () => {
    expect(ids(getFilteredPastTasks(tasksByDate, anyDate, "completed", "work"))).toEqual(["d"]);
    expect(ids(getFilteredPastTasks(tasksByDate, anyDate, "pending", "work"))).toEqual(["a"]);
  });

  it("un tipo borrado cuenta como sin tipo si se pasan los tipos conocidos", () => {
    const orphaned: Record<string, DayTasks> = { "2020-01-10": { 1: task("x", "borrado") } };

    expect(ids(getFilteredPastTasks(orphaned, anyDate, "all", FILTER_NONE, new Set(["work"])))).toEqual(["x"]);
  });
});
