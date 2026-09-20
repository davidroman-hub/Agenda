import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { buildDayTasks } from "../utils/day-tasks";

const makeTask = (id: string, overrides: Partial<AgendaTask> = {}): AgendaTask => ({
  id,
  text: `tarea ${id}`,
  completed: false,
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  ...overrides,
});

const makePattern = (
  originalTaskId: string,
  repeatOption: RepeatingTaskPattern["repeatOption"],
  startDate: string,
  overrides: Partial<RepeatingTaskPattern> = {}
): RepeatingTaskPattern => ({
  id: `pattern-${originalTaskId}`,
  originalTaskId,
  repeatOption,
  startDate,
  createdAt: "2026-09-01T06:00:00.000Z",
  isActive: true,
  ...overrides,
});

// Congela recursivamente los datos de entrada: si buildDayTasks mutara algo, el test fallaría
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

const ids = (tasks: AgendaTask[]) => tasks.map((task) => task.id);

describe("buildDayTasks", () => {
  const dailyTask = makeTask("t1", { text: "Tomar vitaminas", reminder: "2026-09-01T14:00:00.000Z" });
  const tasksByDate: Record<string, DayTasks> = {
    "2026-09-01": { 3: dailyTask, 7: makeTask("t2", { text: "Comprar pan" }) },
    "2026-09-02": { 1: makeTask("t3", { text: "Llamar al banco" }) },
  };
  const dailyPattern = makePattern("t1", "daily", "2026-09-01");

  it("sin patrones devuelve solo las tareas del día, con sus números de línea", () => {
    const { normalTasks, repeatedTasks } = buildDayTasks("2026-09-01", tasksByDate, [], {});

    expect(Object.keys(normalTasks)).toEqual(["3", "7"]);
    expect(normalTasks[3]?.id).toBe("t1");
    expect(repeatedTasks).toEqual([]);
  });

  it("un día sin tareas ni patrones devuelve todo vacío", () => {
    expect(buildDayTasks("2030-01-01", tasksByDate, [], {})).toEqual({
      normalTasks: {},
      repeatedTasks: [],
    });
  });

  it("en el día de creación la original es una tarea normal y no se duplica como virtual", () => {
    const { normalTasks, repeatedTasks } = buildDayTasks(
      "2026-09-01",
      tasksByDate,
      [dailyPattern],
      {}
    );

    expect(normalTasks[3]?.id).toBe("t1");
    expect(repeatedTasks).toEqual([]);
  });

  it("en un día posterior aparece una instancia virtual con los datos de la original", () => {
    const { normalTasks, repeatedTasks } = buildDayTasks(
      "2026-09-02",
      tasksByDate,
      [dailyPattern],
      {}
    );

    // La tarea propia de ese día sigue ahí
    expect(normalTasks[1]?.id).toBe("t3");
    expect(repeatedTasks).toHaveLength(1);
    expect(repeatedTasks[0]).toMatchObject({
      id: "t1-repeat-2026-09-02",
      text: "Tomar vitaminas",
      reminder: "2026-09-01T14:00:00.000Z",
      completed: false,
      isRepeatingTask: true,
      repeatingTaskId: "t1",
      repeatingPatternId: "pattern-t1",
    });
  });

  it("no genera instancia en los días que no tocan según el patrón", () => {
    const everyTwoDays = [makePattern("t1", "twice", "2026-09-01")];

    expect(buildDayTasks("2026-09-02", tasksByDate, everyTwoDays, {}).repeatedTasks).toEqual([]);
    expect(ids(buildDayTasks("2026-09-03", tasksByDate, everyTwoDays, {}).repeatedTasks)).toEqual([
      "t1-repeat-2026-09-03",
    ]);
  });

  it("no genera instancia antes de la fecha de inicio del patrón", () => {
    const startsLater = [makePattern("t1", "daily", "2026-09-10")];
    expect(buildDayTasks("2026-09-05", tasksByDate, startsLater, {}).repeatedTasks).toEqual([]);
  });

  it("repetición mensual desde el día 1", () => {
    const monthly = [makePattern("t1", "monthly", "2026-09-01")];
    expect(ids(buildDayTasks("2026-10-01", tasksByDate, monthly, {}).repeatedTasks)).toEqual([
      "t1-repeat-2026-10-01",
    ]);
    expect(buildDayTasks("2026-10-02", tasksByDate, monthly, {}).repeatedTasks).toEqual([]);
  });

  it("cada instancia tiene su propio estado de completado, sin tocar el de la original", () => {
    const completions = { "t1-2026-09-03": true };
    const patterns = [dailyPattern];

    const day3 = buildDayTasks("2026-09-03", tasksByDate, patterns, completions);
    const day4 = buildDayTasks("2026-09-04", tasksByDate, patterns, completions);
    const day1 = buildDayTasks("2026-09-01", tasksByDate, patterns, completions);

    expect(day3.repeatedTasks[0].completed).toBe(true);
    expect(day4.repeatedTasks[0].completed).toBe(false);
    expect(day1.normalTasks[3]?.completed).toBe(false);
  });

  it("un patrón inactivo no genera instancias", () => {
    const paused = [makePattern("t1", "daily", "2026-09-01", { isActive: false })];
    const { normalTasks, repeatedTasks } = buildDayTasks("2026-09-02", tasksByDate, paused, {});

    expect(repeatedTasks).toEqual([]);
    expect(normalTasks[1]?.id).toBe("t3");
  });

  it("un patrón cuya tarea original ya no existe no genera nada", () => {
    const orphan = [makePattern("tarea-borrada", "daily", "2026-09-01")];
    expect(buildDayTasks("2026-09-02", tasksByDate, orphan, {}).repeatedTasks).toEqual([]);
  });

  it("varias tareas repetidas el mismo día salen en el orden de los patrones", () => {
    const patterns = [
      makePattern("t2", "daily", "2026-09-01"),
      makePattern("t1", "daily", "2026-09-01"),
    ];

    expect(ids(buildDayTasks("2026-09-02", tasksByDate, patterns, {}).repeatedTasks)).toEqual([
      "t2-repeat-2026-09-02",
      "t1-repeat-2026-09-02",
    ]);
  });

  // Caracterización: datos antiguos donde el mismo id quedó guardado en dos fechas.
  // Cuenta como original la última fecha recorrida y se quita la copia de las demás.
  it("con un id duplicado en varias fechas, gana la última como original y se quita la copia", () => {
    const duplicated = makeTask("dup");
    const legacy: Record<string, DayTasks> = {
      "2026-09-01": { 1: duplicated },
      "2026-09-05": { 2: duplicated },
    };
    const patterns = [makePattern("dup", "daily", "2026-09-01")];

    const onFirstDay = buildDayTasks("2026-09-01", legacy, patterns, {});
    expect(onFirstDay.normalTasks).toEqual({});
    expect(ids(onFirstDay.repeatedTasks)).toEqual(["dup-repeat-2026-09-01"]);

    const onOriginalDay = buildDayTasks("2026-09-05", legacy, patterns, {});
    expect(onOriginalDay.normalTasks[2]?.id).toBe("dup");
    expect(onOriginalDay.repeatedTasks).toEqual([]);
  });

  it("una fecha saltada no genera instancia, y las de alrededor sí", () => {
    const skipped = [makePattern("t1", "daily", "2026-09-01", { excludedDates: ["2026-09-03"] })];

    expect(buildDayTasks("2026-09-03", tasksByDate, skipped, {}).repeatedTasks).toEqual([]);
    expect(ids(buildDayTasks("2026-09-02", tasksByDate, skipped, {}).repeatedTasks)).toEqual(["t1-repeat-2026-09-02"]);
    expect(ids(buildDayTasks("2026-09-04", tasksByDate, skipped, {}).repeatedTasks)).toEqual(["t1-repeat-2026-09-04"]);
  });

  it("después de la fecha de fin no genera instancia, y en la propia fecha de fin sí", () => {
    const ended = [makePattern("t1", "daily", "2026-09-01", { endDate: "2026-09-05" })];

    expect(ids(buildDayTasks("2026-09-05", tasksByDate, ended, {}).repeatedTasks)).toEqual(["t1-repeat-2026-09-05"]);
    expect(buildDayTasks("2026-09-06", tasksByDate, ended, {}).repeatedTasks).toEqual([]);
  });

  it("saltar o terminar la serie no afecta a la tarea original en su día", () => {
    const rule = [makePattern("t1", "daily", "2026-09-01", { endDate: "2026-09-01", excludedDates: ["2026-09-02"] })];

    expect(buildDayTasks("2026-09-01", tasksByDate, rule, {}).normalTasks[3]?.id).toBe("t1");
  });

  it("no modifica los datos de entrada", () => {
    const frozenTasks = deepFreeze(structuredClone(tasksByDate));
    const frozenPatterns = deepFreeze([dailyPattern, makePattern("t2", "weekly", "2026-09-01")].map((p) => ({ ...p })));
    const frozenCompletions = deepFreeze({ "t1-2026-09-02": true });

    expect(() =>
      buildDayTasks("2026-09-02", frozenTasks, frozenPatterns, frozenCompletions)
    ).not.toThrow();
  });
});
