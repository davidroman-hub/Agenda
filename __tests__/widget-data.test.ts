import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { type Note, noteColorHex, notePin, noteRotation } from "../utils/notes";
import { buildWidgetPayload, WIDGET_MAX_NOTES, WIDGET_MAX_TASKS_PER_DAY } from "../utils/widget-data";

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

const note = (id: string, overrides: Partial<Note> = {}): Note => ({
  id,
  text: `nota ${id}`,
  color: "yellow",
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  ...overrides,
});

const TODAY = "2026-09-21";

describe("buildWidgetPayload: días", () => {
  it("manda ayer, hoy y los 7 días siguientes, también los vacíos", () => {
    const { days } = buildWidgetPayload(TODAY, {}, [], {});

    expect(Object.keys(days)).toEqual([
      "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24",
      "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28",
    ]);
    expect(days[TODAY]).toEqual({ total: 0, completed: 0, tasks: [] });
  });

  it("cruza el fin de mes y de año sin desfases", () => {
    const { days } = buildWidgetPayload("2026-12-30", {}, [], {}, [], [], 3, 0);
    expect(Object.keys(days)).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  });

  it("lista primero las pendientes y después las completadas, cada grupo en el orden del libro", () => {
    const tasksByDate: Record<string, DayTasks> = {
      [TODAY]: {
        4: task("d", { text: "cuarta", completed: true }),
        3: task("c", { text: "tercera" }),
        1: task("a", { text: "primera" }),
        2: task("b", { text: "segunda", completed: true }),
      },
    };

    const { days } = buildWidgetPayload(TODAY, tasksByDate, [], {});

    expect(days[TODAY].total).toBe(4);
    expect(days[TODAY].completed).toBe(2);
    expect(days[TODAY].tasks.map((item) => [item.id, item.done])).toEqual([
      ["a", false], ["c", false], ["b", true], ["d", true],
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
    expect(days[TODAY].tasks).toEqual([{ id: "t1", text: "diaria", done: false, repeating: false }]);
    expect(days["2026-09-22"]).toEqual({
      total: 1,
      completed: 1,
      tasks: [{ id: "t1", text: "diaria", done: true, repeating: true }],
    });
    expect(days["2026-09-23"].tasks).toEqual([{ id: "t1", text: "diaria", done: false, repeating: true }]);
  });

  it("recorta las tareas de cada día, pero el total sigue siendo el real y las pendientes van primero", () => {
    const many: DayTasks = { 1: task("hecha", { completed: true }) };
    for (let line = 2; line <= WIDGET_MAX_TASKS_PER_DAY + 3; line++) many[line] = task(`t${line}`);

    const { days } = buildWidgetPayload(TODAY, { [TODAY]: many }, [], {});

    expect(days[TODAY].tasks).toHaveLength(WIDGET_MAX_TASKS_PER_DAY);
    expect(days[TODAY].total).toBe(WIDGET_MAX_TASKS_PER_DAY + 3);
    expect(days[TODAY].tasks.every((item) => !item.done)).toBe(true);
  });
});

describe("buildWidgetPayload: hora y color de cada tarea", () => {
  it("una tarea con recordatorio del mismo día lleva su hora, en minutos desde medianoche", () => {
    const reminder = new Date(2026, 8, 21, 9, 30).toISOString();
    const { days } = buildWidgetPayload(TODAY, { [TODAY]: { 1: task("a", { reminder }) } }, [], {});

    expect(days[TODAY].tasks[0].at).toBe(9 * 60 + 30);
  });

  it("un recordatorio de otro día (p. ej. la víspera) no se enseña como hora de la tarea", () => {
    const reminder = new Date(2026, 8, 20, 22, 0).toISOString();
    const { days } = buildWidgetPayload(TODAY, { [TODAY]: { 1: task("a", { reminder }) } }, [], {});

    expect(days[TODAY].tasks[0]).not.toHaveProperty("at");
  });

  it("una recordatorio ilegible se ignora", () => {
    const { days } = buildWidgetPayload(TODAY, { [TODAY]: { 1: task("a", { reminder: "no-es-fecha" }) } }, [], {});
    expect(days[TODAY].tasks[0]).not.toHaveProperty("at");
  });

  it("las ocurrencias de una repetida llevan la hora de la original aunque su fecha sea otra", () => {
    const reminder = new Date(2026, 8, 21, 16, 0).toISOString();
    const tasksByDate: Record<string, DayTasks> = { [TODAY]: { 1: task("t1", { reminder }) } };

    const { days } = buildWidgetPayload(TODAY, tasksByDate, [daily("t1", TODAY)], {});

    expect(days["2026-09-23"].tasks[0]).toMatchObject({ repeating: true, at: 16 * 60 });
  });

  it("el color es el de su tipo; sin tipo, o con un tipo que ya no existe, no lleva color", () => {
    const tasksByDate: Record<string, DayTasks> = {
      [TODAY]: {
        1: task("a", { typeId: "trabajo" }),
        2: task("b"),
        3: task("c", { typeId: "borrado" }),
      },
    };

    const { days } = buildWidgetPayload(TODAY, tasksByDate, [], {}, [{ id: "trabajo", color: "#E57373" }]);

    const byId = Object.fromEntries(days[TODAY].tasks.map((item) => [item.id, item.color]));
    expect(byId).toEqual({ a: "#E57373", b: undefined, c: undefined });
  });
});

describe("buildWidgetPayload: notas", () => {
  it("cada nota lleva su color, inclinación y chincheta (los mismos que en el tablero de la app)", () => {
    const { notes } = buildWidgetPayload(TODAY, {}, [], {}, [], [note("n1", { color: "pink" })]);

    expect(notes).toEqual([
      {
        id: "n1",
        text: "nota n1",
        color: noteColorHex("pink"),
        rotation: noteRotation("n1"),
        pin: notePin("n1"),
      },
    ]);
  });

  it("las más recientes primero y no más de las que caben", () => {
    const many = Array.from({ length: WIDGET_MAX_NOTES + 3 }, (_, index) =>
      note(`n${index}`, { createdAt: new Date(2026, 8, 1 + index).toISOString() })
    );

    const { notes } = buildWidgetPayload(TODAY, {}, [], {}, [], many);

    expect(notes).toHaveLength(WIDGET_MAX_NOTES);
    expect(notes[0].id).toBe(`n${WIDGET_MAX_NOTES + 2}`);
  });

  it("una nota solo con adjuntos enseña el nombre del primer archivo, y una vacía no aparece", () => {
    const attachment = { id: "a1", name: "factura.pdf", fileName: "a1-factura.pdf", mimeType: "application/pdf", size: 1, addedAt: "2026-09-01T00:00:00.000Z" };
    const { notes } = buildWidgetPayload(TODAY, {}, [], {}, [], [
      note("solo-archivo", { text: "  ", attachments: [attachment] }),
      note("vacia", { text: "  " }),
    ]);

    expect(notes.map((item) => [item.id, item.text])).toEqual([["solo-archivo", "📎 factura.pdf"]]);
  });

  it("recorta el texto largo", () => {
    const { notes } = buildWidgetPayload(TODAY, {}, [], {}, [], [note("n1", { text: "x".repeat(1000) })]);
    expect(notes[0].text.length).toBeLessThanOrEqual(200);
  });
});
