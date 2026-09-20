import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { NOTIFICATION_HORIZON_DAYS, planRepeatedNotifications } from "../utils/repeat-notification-plan";

const TASK_ID = "2026-09-01-1-1789000000000";
const OTHER_ID = "2026-09-01-2-1789000000001";

// Hoy es 4-sep-2026 a las 08:00 (hora local)
const NOW = new Date(2026, 8, 4, 8, 0);

// Recordatorio a las hh:mm; el día del recordatorio original no importa, solo la hora
const at = (hours: number, minutes = 0) => new Date(2026, 8, 1, hours, minutes).toISOString();

const makeTask = (id: string, overrides: Partial<AgendaTask> = {}): AgendaTask => ({
  id,
  text: `tarea ${id}`,
  completed: false,
  createdAt: "x",
  updatedAt: "x",
  reminder: at(10),
  ...overrides,
});

const makePattern = (
  originalTaskId: string,
  repeatOption: RepeatingTaskPattern["repeatOption"] = "daily",
  overrides: Partial<RepeatingTaskPattern> = {}
): RepeatingTaskPattern => ({
  id: `p-${originalTaskId}`,
  originalTaskId,
  repeatOption,
  startDate: "2026-09-01",
  createdAt: "x",
  isActive: true,
  ...overrides,
});

const tasksByDate = (task: AgendaTask = makeTask(TASK_ID), date = "2026-09-01"): Record<string, DayTasks> => ({
  [date]: { 1: task },
});

const plan = (overrides: Partial<Parameters<typeof planRepeatedNotifications>[0]> = {}) =>
  planRepeatedNotifications({
    now: NOW,
    tasksByDate: tasksByDate(),
    patterns: [makePattern(TASK_ID)],
    completions: {},
    ...overrides,
  });

const dates = (planned: ReturnType<typeof plan>) => planned.map((p) => p.date);

describe("planRepeatedNotifications: la ventana", () => {
  it("una diaria con recordatorio programa los próximos 14 días, contando hoy", () => {
    const planned = plan();

    expect(planned).toHaveLength(NOTIFICATION_HORIZON_DAYS);
    expect(dates(planned)[0]).toBe("2026-09-04");
    expect(dates(planned)[13]).toBe("2026-09-17");
  });

  it("cada aviso suena a la hora del recordatorio de la tarea original, en su día", () => {
    for (const { fireAt, date } of plan()) {
      expect([fireAt.getHours(), fireAt.getMinutes()]).toEqual([10, 0]);
      expect(fireAt.getDate()).toBe(Number(date.slice(8)));
    }
  });

  it("si la hora de hoy ya pasó, hoy no se programa y la ventana empieza mañana", () => {
    const planned = plan({ now: new Date(2026, 8, 4, 10, 30) });

    expect(dates(planned)[0]).toBe("2026-09-05");
    expect(planned).toHaveLength(13);
  });

  it("al avanzar el día la ventana se desplaza (así se renueva)", () => {
    const tomorrow = plan({ now: new Date(2026, 8, 5, 8, 0) });

    expect(dates(tomorrow)[0]).toBe("2026-09-05");
    expect(dates(tomorrow)[13]).toBe("2026-09-18");
  });

  it("respeta un horizonte distinto", () => {
    expect(plan({ horizonDays: 3 })).toHaveLength(3);
  });
});

describe("planRepeatedNotifications: qué ocurrencias cuentan", () => {
  it("no hay aviso el día de la propia tarea original", () => {
    const planned = plan({ tasksByDate: tasksByDate(makeTask(TASK_ID), "2026-09-04") });

    expect(dates(planned)).not.toContain("2026-09-04");
    expect(dates(planned)[0]).toBe("2026-09-05");
  });

  it("solo los días que tocan según la frecuencia", () => {
    const planned = plan({ patterns: [makePattern(TASK_ID, "weekly")] });

    expect(dates(planned)).toEqual(["2026-09-08", "2026-09-15"]);
  });

  it("cada 2 días", () => {
    const planned = plan({ patterns: [makePattern(TASK_ID, "twice")], horizonDays: 6 });

    expect(dates(planned)).toEqual(["2026-09-05", "2026-09-07", "2026-09-09"]);
  });

  it("una fecha saltada no tiene aviso", () => {
    const planned = plan({ patterns: [makePattern(TASK_ID, "daily", { excludedDates: ["2026-09-06"] })] });

    expect(dates(planned)).not.toContain("2026-09-06");
    expect(planned).toHaveLength(13);
  });

  it("tras el fin de la serie no hay avisos, y en la última fecha sí", () => {
    const planned = plan({ patterns: [makePattern(TASK_ID, "daily", { endDate: "2026-09-08" })] });

    expect(dates(planned)).toEqual(["2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08"]);
  });

  it("una ocurrencia ya completada no avisa", () => {
    const planned = plan({ completions: { [`${TASK_ID}-2026-09-04`]: true, [`${TASK_ID}-2026-09-05`]: false } });

    expect(dates(planned)).not.toContain("2026-09-04");
    expect(dates(planned)).toContain("2026-09-05");
  });

  it("un patrón pausado no avisa", () => {
    expect(plan({ patterns: [makePattern(TASK_ID, "daily", { isActive: false })] })).toEqual([]);
  });

  it("una tarea repetida sin recordatorio no avisa", () => {
    expect(plan({ tasksByDate: tasksByDate(makeTask(TASK_ID, { reminder: null })) })).toEqual([]);
  });

  it("un patrón cuya tarea original ya no existe no avisa", () => {
    expect(plan({ tasksByDate: {} })).toEqual([]);
  });

  it("un recordatorio con fecha inválida no rompe nada", () => {
    expect(plan({ tasksByDate: tasksByDate(makeTask(TASK_ID, { reminder: "basura" })) })).toEqual([]);
  });
});

describe("planRepeatedNotifications: varias tareas y tope", () => {
  const two = () => ({
    tasksByDate: {
      "2026-09-01": { 1: makeTask(TASK_ID, { reminder: at(10) }), 2: makeTask(OTHER_ID, { reminder: at(9) }) },
    },
    patterns: [makePattern(TASK_ID), makePattern(OTHER_ID)],
  });

  it("salen ordenados por hora de aviso", () => {
    const planned = plan({ ...two(), horizonDays: 2 });

    expect(planned.map((p) => `${p.date} ${p.originalTaskId === OTHER_ID ? "9h" : "10h"}`)).toEqual([
      "2026-09-04 9h",
      "2026-09-04 10h",
      "2026-09-05 9h",
      "2026-09-05 10h",
    ]);
  });

  it("el tope conserva los avisos más próximos", () => {
    const planned = plan({ ...two(), maxNotifications: 5 });

    expect(planned).toHaveLength(5);
    expect(dates(planned)).toEqual(["2026-09-04", "2026-09-04", "2026-09-05", "2026-09-05", "2026-09-06"]);
  });

  it("un tope de 0 no programa nada", () => {
    expect(plan({ maxNotifications: 0 })).toEqual([]);
  });
});

describe("planRepeatedNotifications: firma", () => {
  it("cambia si cambia el texto o la hora, y no si no cambia nada", () => {
    const base = plan()[0].signature;

    expect(plan()[0].signature).toBe(base);
    expect(plan({ tasksByDate: tasksByDate(makeTask(TASK_ID, { text: "otro texto" })) })[0].signature).not.toBe(base);
    expect(plan({ tasksByDate: tasksByDate(makeTask(TASK_ID, { reminder: at(11) })) })[0].signature).not.toBe(base);
  });
});

describe("planRepeatedNotifications: cambios de horario", () => {
  it("la hora del aviso se mantiene al cruzar el cambio de horario de verano europeo (29-mar-2026)", () => {
    const planned = plan({
      now: new Date(2026, 2, 25, 8, 0),
      tasksByDate: tasksByDate(makeTask(TASK_ID), "2026-03-20"),
      patterns: [makePattern(TASK_ID, "daily", { startDate: "2026-03-20" })],
    });

    // Del 25-mar al 7-abr: cruza el cambio de hora del día 29
    expect(dates(planned)).toContain("2026-03-28");
    expect(dates(planned)).toContain("2026-03-30");
    expect(planned).toHaveLength(14);
    for (const { fireAt } of planned) {
      expect([fireAt.getHours(), fireAt.getMinutes()]).toEqual([10, 0]);
    }
  });
});
