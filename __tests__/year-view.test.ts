import type { AgendaTask, DayTasks } from "../stores/agenda-tasks-store";
import type { RepeatingTaskPattern } from "../stores/repeating-tasks-store";
import { buildDayTasks } from "../utils/day-tasks";
import {
  buildYearIndex,
  clampYear,
  dateKeysOfYear,
  daysInMonth,
  filterDaysByStatus,
  formatDayLabel,
  buildListRows,
  getDayMark,
  getFirstDayOfWeek,
  getMonthGrid,
  getMonthMarks,
  getMonthMetrics,
  getSideSplit,
  getStackedCalendarHeight,
  getYearLayout,
  MAX_YEAR,
  MIN_YEAR,
  monthRowIndex,
  parseDateKey,
  scopeDays,
  scopeMonth,
  scopeSeries,
  scopeStats,
  shiftYear,
  SIDE_HANDLE_MARGIN,
  SIDE_HANDLE_WIDTH,
  toDateKey,
  weekdayInitials,
  YearIndex,
} from "../utils/year-view";

const task = (id: string, text: string, extra: Partial<AgendaTask> = {}): AgendaTask => ({
  id,
  text,
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const pattern = (
  originalTaskId: string,
  repeatOption: string,
  startDate: string,
  extra: Partial<RepeatingTaskPattern> = {}
): RepeatingTaskPattern => ({
  id: `pattern-${originalTaskId}`,
  originalTaskId,
  repeatOption: repeatOption as RepeatingTaskPattern["repeatOption"],
  startDate,
  createdAt: "2026-01-01T00:00:00.000Z",
  isActive: true,
  ...extra,
});

const build = (
  year: number,
  tasksByDate: Record<string, DayTasks>,
  patterns: RepeatingTaskPattern[] = [],
  completions: Record<string, boolean> = {},
  include?: (task: AgendaTask) => boolean
): YearIndex => buildYearIndex({ year, tasksByDate, patterns, completions, include });

describe("fechas", () => {
  it("daysInMonth respeta los años bisiestos", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28); // divisible por 100 pero no por 400
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("toDateKey y parseDateKey son inversas", () => {
    expect(toDateKey(2026, 3, 7)).toBe("2026-03-07");
    expect(parseDateKey("2026-03-07")).toEqual({ year: 2026, month: 3, day: 7 });
  });

  it.each(["", "2026-3-7", "26-03-07", "2026/03/07", "hola", "2026-03-07T00:00"])("parseDateKey rechaza %j", (value) => {
    expect(parseDateKey(value)).toBeNull();
  });

  it("dateKeysOfYear tiene 365 o 366 claves, ordenadas y sin repetir", () => {
    for (const [year, days] of [[2026, 365], [2028, 366], [2100, 365]] as const) {
      const keys = dateKeysOfYear(year);
      expect(keys).toHaveLength(days);
      expect(new Set(keys).size).toBe(days);
      expect([...keys].sort()).toEqual(keys);
      expect(keys[0]).toBe(`${year}-01-01`);
      expect(keys.at(-1)).toBe(`${year}-12-31`);
    }
  });

  it("clampYear y shiftYear no salen del rango", () => {
    expect(clampYear(1800)).toBe(MIN_YEAR);
    expect(clampYear(3000)).toBe(MAX_YEAR);
    expect(clampYear(2026.9)).toBe(2026);
    expect(shiftYear(2026, 1)).toBe(2027);
    expect(shiftYear(2026, -1)).toBe(2025);
    expect(shiftYear(MAX_YEAR, 1)).toBe(MAX_YEAR);
    expect(shiftYear(MIN_YEAR, -1)).toBe(MIN_YEAR);
  });
});

describe("semana", () => {
  it("empieza en domingo en inglés y en lunes en el resto", () => {
    expect(getFirstDayOfWeek("en")).toBe(0);
    for (const language of ["es", "fr", "it", "de", ""]) expect(getFirstDayOfWeek(language)).toBe(1);
  });

  it("weekdayInitials rota los días según el primer día de la semana", () => {
    const names = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    expect(weekdayInitials(names, 0)).toEqual(["D", "L", "M", "M", "J", "V", "S"]);
    expect(weekdayInitials(names, 1)).toEqual(["L", "M", "M", "J", "V", "S", "D"]);
  });

  it("weekdayInitials aguanta nombres que faltan", () => {
    expect(weekdayInitials([], 1)).toEqual(["", "", "", "", "", "", ""]);
  });
});

describe("getMonthGrid", () => {
  const days = (grid: (string | null)[][]) => grid.flat().filter((cell): cell is string => cell !== null);

  it("siempre son 6 filas de 7", () => {
    for (const month of [1, 2, 5, 12]) {
      for (const firstDay of [0, 1] as const) {
        const grid = getMonthGrid(2026, month, firstDay);
        expect(grid).toHaveLength(6);
        for (const week of grid) expect(week).toHaveLength(7);
      }
    }
  });

  it("contiene cada día del mes exactamente una vez y en orden", () => {
    for (const [year, month] of [[2026, 2], [2028, 2], [2026, 7], [2026, 12]] as const) {
      expect(days(getMonthGrid(year, month, 1))).toEqual(
        Array.from({ length: daysInMonth(year, month) }, (_, index) => toDateKey(year, month, index + 1))
      );
    }
  });

  it("el día 1 cae en la columna de su día de la semana (lunes primero)", () => {
    // 1 de septiembre de 2026 es martes → columna 1 con lunes primero
    expect(getMonthGrid(2026, 9, 1)[0].indexOf("2026-09-01")).toBe(1);
    // 1 de febrero de 2026 es domingo → columna 6 con lunes primero, columna 0 con domingo primero
    expect(getMonthGrid(2026, 2, 1)[0].indexOf("2026-02-01")).toBe(6);
    expect(getMonthGrid(2026, 2, 0)[0].indexOf("2026-02-01")).toBe(0);
  });

  it("los huecos son null antes del día 1 y después del último día", () => {
    const grid = getMonthGrid(2026, 9, 1);
    expect(grid[0][0]).toBeNull();
    expect(grid[5].at(-1)).toBeNull();
  });

  it("un mes de 28 días que empieza en el primer día de la semana ocupa 4 filas llenas y 2 vacías", () => {
    // febrero de 2027 empieza en lunes y tiene 28 días
    const grid = getMonthGrid(2027, 2, 1);
    expect(grid.slice(0, 4).every((week) => week.every((cell) => cell !== null))).toBe(true);
    expect(grid.slice(4).every((week) => week.every((cell) => cell === null))).toBe(true);
  });
});

describe("buildYearIndex: coherencia con buildDayTasks", () => {
  // Un poco de todo: repeticiones de cada tipo, con fin, con fechas saltadas, inactivas, huérfanas,
  // series que empiezan el año anterior o el siguiente, ids duplicados y días con varias tareas
  const tasksByDate: Record<string, DayTasks> = {
    "2025-12-30": { 1: task("cada-dos", "Cada dos días") },
    "2026-01-05": { 1: task("diaria", "Diaria") },
    "2026-01-31": { 1: task("mensual31", "Mensual el 31") },
    "2026-02-01": { 2: task("semanal", "Semanal") },
    "2026-03-03": { 1: task("cada-tres", "Cada tres"), 4: task("suelta-a", "Suelta A") },
    "2026-06-15": { 3: task("suelta-b", "Suelta B"), 1: task("suelta-c", "Suelta C", { completed: true }) },
    "2026-07-04": { 1: task("inactiva", "Inactiva") },
    "2026-12-31": { 1: task("fin-de-año", "Fin de año") },
    "2027-01-01": { 1: task("año-siguiente", "Año siguiente") },
    "2028-02-29": { 1: task("bisiesto", "Bisiesto") },
    // El mismo id guardado en dos fechas (datos antiguos duplicados)
    "2026-04-01": { 1: task("duplicada", "Duplicada") },
    "2026-04-08": { 1: task("duplicada", "Duplicada") },
  };
  const patterns: RepeatingTaskPattern[] = [
    pattern("cada-dos", "twice", "2025-12-30"),
    pattern("diaria", "daily", "2026-01-05", { endDate: "2026-11-30", excludedDates: ["2026-03-10", "2026-05-01"] }),
    pattern("mensual31", "monthly", "2026-01-31"),
    pattern("semanal", "weekly", "2026-02-01"),
    pattern("cada-tres", "three", "2026-03-03"),
    pattern("inactiva", "daily", "2026-07-04", { isActive: false }),
    pattern("no-existe", "daily", "2026-01-01"), // su tarea original ya no está
    pattern("duplicada", "weekly", "2026-04-01"),
  ];
  const completions: Record<string, boolean> = {
    "diaria-2026-01-06": true,
    "diaria-2026-12-01": true, // ya terminada la serie
    "semanal-2026-02-08": true,
    "cada-tres-2026-03-06": true,
    "mensual31-2026-03-31": true,
  };

  // Lo que dice buildDayTasks para un día, en una forma comparable
  const reference = (dateKey: string) => {
    const { normalTasks, repeatedTasks } = buildDayTasks(dateKey, tasksByDate, patterns, completions);
    return [
      ...Object.entries(normalTasks)
        .filter(([, value]) => value)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([line, value]) => ({ id: value!.id, completed: value!.completed, line: Number(line) })),
      ...repeatedTasks.map((value) => ({ id: value.id, completed: value.completed, line: null })),
    ];
  };

  it.each([2025, 2026, 2027, 2028])("el año %p da, día a día, lo mismo que buildDayTasks", (year) => {
    const index = build(year, tasksByDate, patterns, completions);

    let daysWithTasks = 0;
    for (const dateKey of dateKeysOfYear(year)) {
      const fromIndex = (index.days.get(dateKey)?.entries ?? []).map((entry) => ({
        id: entry.task.id,
        completed: entry.task.completed,
        line: entry.line,
      }));
      expect([dateKey, fromIndex]).toEqual([dateKey, reference(dateKey)]);
      if (fromIndex.length > 0) daysWithTasks++;
    }
    // Y solo están los días que tienen tareas
    expect(index.days.size).toBe(daysWithTasks);
  });

  it("el dataset de prueba ejercita de verdad las repeticiones (si no, la comparación no probaría nada)", () => {
    const index = build(2026, tasksByDate, patterns, completions);
    expect(index.days.size).toBeGreaterThan(300);
    expect(index.series.length).toBeGreaterThanOrEqual(5);
  });

  it("los totales de cada día cuadran con sus entradas", () => {
    const index = build(2026, tasksByDate, patterns, completions);
    for (const day of index.days.values()) {
      expect(day.total).toBe(day.entries.length);
      expect(day.completed).toBe(day.entries.filter((entry) => entry.task.completed).length);
    }
  });

  it("aplica el filtro por tipo a las tareas propias y a las repetidas", () => {
    const typed: Record<string, DayTasks> = {
      "2026-03-02": { 1: task("a", "De trabajo", { typeId: "trabajo" }), 2: task("b", "De casa", { typeId: "casa" }) },
    };
    const patternsTyped = [pattern("a", "daily", "2026-03-02"), pattern("b", "daily", "2026-03-02")];
    const index = build(2026, typed, patternsTyped, {}, (item) => item.typeId === "trabajo");

    const day = index.days.get("2026-03-02")!;
    expect(day.entries.map((entry) => entry.task.text)).toEqual(["De trabajo"]);
    expect(index.days.get("2026-03-09")!.entries.map((entry) => entry.task.text)).toEqual(["De trabajo"]);
    expect(index.series.map((series) => series.task.text)).toEqual(["De trabajo"]);
  });

  it("un filtro que no deja pasar nada da un año vacío", () => {
    const index = build(2026, tasksByDate, patterns, completions, () => false);
    expect(index.days.size).toBe(0);
    expect(index.series).toEqual([]);
  });

  it("los datos vacíos dan un año vacío", () => {
    const index = build(2026, {}, []);
    expect(index.days.size).toBe(0);
    expect(index.series).toEqual([]);
  });

  it("no modifica los datos de entrada", () => {
    const before = JSON.stringify({ tasksByDate, patterns, completions });
    build(2026, tasksByDate, patterns, completions);
    expect(JSON.stringify({ tasksByDate, patterns, completions })).toBe(before);
  });
});

describe("series repetidas del año", () => {
  const data = {
    tasksByDate: { "2026-01-05": { 1: task("diaria", "Diaria") }, "2026-01-01": { 1: task("semanal", "Semanal") } } as Record<string, DayTasks>,
    patterns: [pattern("diaria", "daily", "2026-01-05"), pattern("semanal", "weekly", "2026-01-01")],
  };

  it("cuenta las ocurrencias de cada serie sin contar la de su día de creación", () => {
    const index = build(2026, data.tasksByDate, data.patterns);
    const daily = index.series.find((series) => series.originalId === "diaria")!;
    const weekly = index.series.find((series) => series.originalId === "semanal")!;

    expect(daily.occurrences).toBe(365 - 4 - 1); // del 6 de enero al 31 de diciembre
    expect(daily.firstDateKey).toBe("2026-01-06");
    expect(weekly.occurrences).toBe(52); // 52 semanas más tras el 1 de enero
    expect(weekly.firstDateKey).toBe("2026-01-08");
  });

  it("guarda la regla de repetición del patrón", () => {
    const index = build(2026, data.tasksByDate, data.patterns);
    expect(index.series.map((series) => [series.originalId, series.repeatOption]).sort()).toEqual([
      ["diaria", "daily"],
      ["semanal", "weekly"],
    ]);
  });

  it("se ordenan por su primera ocurrencia", () => {
    const index = build(2026, data.tasksByDate, data.patterns);
    // La diaria empieza el 5 (primera ocurrencia el 6) y la semanal el 1 (primera ocurrencia el 8)
    expect(index.series.map((series) => series.originalId)).toEqual(["diaria", "semanal"]);
  });

  it("una serie sin ocurrencias en ese año no aparece", () => {
    const index = build(2025, data.tasksByDate, data.patterns);
    expect(index.series).toEqual([]);
  });

  it("una serie que ya terminó no aparece en años posteriores", () => {
    const ended = [pattern("diaria", "daily", "2026-01-05", { endDate: "2026-01-20" })];
    expect(build(2027, data.tasksByDate, ended).series).toEqual([]);
    expect(build(2026, data.tasksByDate, ended).series[0].occurrences).toBe(15);
  });
});

describe("scopeDays / scopeSeries / scopeStats", () => {
  const tasksByDate: Record<string, DayTasks> = {
    "2026-01-10": { 1: task("a", "Enero A"), 2: task("b", "Enero B", { completed: true }) },
    "2026-03-05": { 1: task("c", "Marzo") },
    "2026-03-20": { 1: task("d", "Marzo 2") },
    "2025-03-05": { 1: task("otro-año", "De otro año") },
  };
  const patterns = [pattern("c", "weekly", "2026-03-05")];
  const index = build(2026, tasksByDate, patterns);

  it("el año entero lista los días con tareas propias, en orden, sin las ocurrencias de las series", () => {
    const days = scopeDays(index, { kind: "year" });
    expect(days.map((day) => day.dateKey)).toEqual(["2026-01-10", "2026-03-05", "2026-03-20"]);
    for (const day of days) expect(day.entries.every((entry) => entry.line !== null)).toBe(true);
  });

  it("el año entero enseña las series aparte", () => {
    expect(scopeSeries(index, { kind: "year" }).map((series) => series.originalId)).toEqual(["c"]);
  });

  it("un día que solo tiene ocurrencias de una serie no sale en la lista del año", () => {
    // 12 de marzo: solo la ocurrencia semanal de "c"
    expect(index.days.has("2026-03-12")).toBe(true);
    expect(scopeDays(index, { kind: "year" }).some((day) => day.dateKey === "2026-03-12")).toBe(false);
  });

  it("un día con tareas propias y ocurrencias, en el año, solo lista las propias y recalcula sus totales", () => {
    const mixed = build(2026, { "2026-03-05": { 1: task("c", "Original") }, "2026-03-12": { 1: task("x", "Propia") } }, patterns);
    const day = scopeDays(mixed, { kind: "year" }).find((entry) => entry.dateKey === "2026-03-12")!;
    expect(day.entries.map((entry) => entry.task.text)).toEqual(["Propia"]);
    expect(day.total).toBe(1);
  });

  it("un mes lista todo lo de ese mes, incluidas las ocurrencias, y nada de otros meses", () => {
    const days = scopeDays(index, { kind: "month", month: 3 });
    expect(days.every((day) => day.dateKey.startsWith("2026-03-"))).toBe(true);
    expect(days.map((day) => day.dateKey)).toEqual(["2026-03-05", "2026-03-12", "2026-03-19", "2026-03-20", "2026-03-26"]);
    expect(scopeSeries(index, { kind: "month", month: 3 })).toEqual([]);
  });

  it("un mes sin tareas queda vacío", () => {
    expect(scopeDays(index, { kind: "month", month: 8 }).filter((day) => day.dateKey < "2026-08-01")).toEqual([]);
    expect(scopeDays(build(2026, {}, []), { kind: "month", month: 3 })).toEqual([]);
  });

  it("un día lista solo ese día, con sus ocurrencias", () => {
    expect(scopeDays(index, { kind: "day", dateKey: "2026-03-12" }).map((day) => day.dateKey)).toEqual(["2026-03-12"]);
    expect(scopeDays(index, { kind: "day", dateKey: "2026-01-10" })[0].total).toBe(2);
    expect(scopeSeries(index, { kind: "day", dateKey: "2026-03-12" })).toEqual([]);
  });

  it("un día sin tareas, o de otro año, queda vacío", () => {
    expect(scopeDays(index, { kind: "day", dateKey: "2026-02-02" })).toEqual([]);
    expect(scopeDays(index, { kind: "day", dateKey: "2025-03-05" })).toEqual([]);
  });

  it("scopeStats suma totales y hechas", () => {
    expect(scopeStats(scopeDays(index, { kind: "day", dateKey: "2026-01-10" }))).toEqual({ total: 2, completed: 1 });
    expect(scopeStats(scopeDays(index, { kind: "year" }))).toEqual({ total: 4, completed: 1 });
    expect(scopeStats([])).toEqual({ total: 0, completed: 0 });
  });
});

describe("marcas del calendario", () => {
  const index = build(
    2026,
    {
      "2026-05-01": { 1: task("a", "Pendiente") },
      "2026-05-02": { 1: task("b", "Hecha", { completed: true }) },
      "2026-05-03": { 1: task("c", "Hecha", { completed: true }), 2: task("d", "Pendiente") },
      "2026-06-01": { 1: task("e", "Otro mes") },
    },
    []
  );

  it("getDayMark distingue sin tareas, pendientes y todo hecho", () => {
    expect(getDayMark(undefined)).toBe("none");
    expect(getDayMark(index.days.get("2026-05-01"))).toBe("pending");
    expect(getDayMark(index.days.get("2026-05-02"))).toBe("done");
    expect(getDayMark(index.days.get("2026-05-03"))).toBe("pending"); // si falta una, sigue pendiente
  });

  it("getMonthMarks solo incluye los días con tareas de ese mes", () => {
    expect(getMonthMarks(index, 5)).toEqual({ "2026-05-01": "pending", "2026-05-02": "done", "2026-05-03": "pending" });
    expect(getMonthMarks(index, 6)).toEqual({ "2026-06-01": "pending" });
    expect(getMonthMarks(index, 7)).toEqual({});
  });

  it("scopeMonth da el mes que se resalta", () => {
    expect(scopeMonth({ kind: "year" })).toBeNull();
    expect(scopeMonth({ kind: "month", month: 9 })).toBe(9);
    expect(scopeMonth({ kind: "day", dateKey: "2026-11-20" })).toBe(11);
    expect(scopeMonth({ kind: "day", dateKey: "basura" })).toBeNull();
  });
});

describe("distribución", () => {
  it.each([
    [320, "stacked", 3],
    [599, "stacked", 3],
    [600, "sideBySide", 2],
    [899, "sideBySide", 2],
    [900, "sideBySide", 3],
    [1400, "sideBySide", 3],
  ])("ancho %p → %s con %p columnas de meses", (width, orientation, monthColumns) => {
    expect(getYearLayout(width)).toEqual({ orientation, monthColumns });
  });

  it("un ancho raro se trata como móvil", () => {
    for (const width of [Number.NaN, 0, -20]) expect(getYearLayout(width)).toEqual({ orientation: "stacked", monthColumns: 3 });
  });

  it("getStackedCalendarHeight es casi la mitad, con mínimo y máximo", () => {
    expect(getStackedCalendarHeight(600)).toBe(288);
    expect(getStackedCalendarHeight(100)).toBe(200);
    expect(getStackedCalendarHeight(5000)).toBe(420);
    expect(getStackedCalendarHeight(0)).toBe(260);
    expect(getStackedCalendarHeight(Number.NaN)).toBe(260);
  });

  it("monthRowIndex dice en qué fila de meses cae cada mes", () => {
    expect(monthRowIndex(1, 3)).toBe(0);
    expect(monthRowIndex(3, 3)).toBe(0);
    expect(monthRowIndex(4, 3)).toBe(1);
    expect(monthRowIndex(12, 3)).toBe(3);
    expect(monthRowIndex(7, 2)).toBe(3);
    expect(monthRowIndex(5, 0)).toBe(4); // columnas raras: se tratan como 1
  });
});

describe("formatDayLabel", () => {
  const names = {
    dayNamesShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
    monthNamesShort: ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."],
  };

  it("da el día de la semana, el número y el mes", () => {
    expect(formatDayLabel("2026-09-20", names)).toBe("Dom 20 Sep."); // 20 de septiembre de 2026 es domingo
    expect(formatDayLabel("2026-02-28", names)).toBe("Sáb 28 Feb.");
    expect(formatDayLabel("2028-02-29", names)).toBe("Mar 29 Feb."); // bisiesto, martes
  });

  it("una clave que no es fecha da vacío", () => {
    expect(formatDayLabel("hola", names)).toBe("");
  });
});

describe("getMonthMetrics", () => {
  it("en un móvil (meses de ~105 px) los días son compactos", () => {
    const metrics = getMonthMetrics(105);
    expect(metrics.cellHeight).toBe(18);
    expect(metrics.circleSize).toBeGreaterThanOrEqual(14);
    expect(metrics.fontSize).toBe(9);
  });

  it("en una tablet (meses de ~200 px) los días crecen, con tope", () => {
    const wide = getMonthMetrics(200);
    const narrow = getMonthMetrics(105);
    expect(wide.cellHeight).toBeGreaterThan(narrow.cellHeight);
    expect(wide.circleSize).toBeGreaterThan(narrow.circleSize);
    expect(wide.fontSize).toBeGreaterThan(narrow.fontSize);

    const huge = getMonthMetrics(2000);
    expect(huge.cellHeight).toBe(30);
    expect(huge.circleSize).toBe(26);
    expect(huge.fontSize).toBe(13);
  });

  it("el círculo del día siempre cabe en su celda", () => {
    for (const width of [70, 105, 140, 200, 260, 400]) {
      const metrics = getMonthMetrics(width);
      expect(metrics.circleSize).toBeLessThanOrEqual(Math.max(14, metrics.cellWidth));
      expect(metrics.circleSize).toBeLessThanOrEqual(metrics.cellHeight + 8);
    }
  });

  it("el alto del mes suma título, días de la semana, seis filas y el margen", () => {
    const metrics = getMonthMetrics(150);
    expect(metrics.monthHeight).toBe(metrics.titleHeight + metrics.weekdaysHeight + metrics.cellHeight * 6 + 10);
  });

  it("un ancho raro usa uno por defecto", () => {
    for (const width of [0, -10, Number.NaN]) expect(getMonthMetrics(width)).toEqual(getMonthMetrics(105));
  });
});

describe("buildListRows", () => {
  const index = build(
    2026,
    {
      "2026-03-05": { 1: task("a", "Uno"), 2: task("b", "Dos") },
      "2026-03-09": { 1: task("c", "Tres") },
    },
    [pattern("a", "weekly", "2026-03-05")]
  );

  it("cada día lleva su cabecera y luego sus tareas, en orden", () => {
    const rows = buildListRows(scopeDays(index, { kind: "month", month: 3 }), []);
    expect(rows.map((row) => row.kind)).toEqual([
      "date", "task", "task", // 5
      "date", "task", // 9 (solo "c")
      "date", "task", // 12 (ocurrencia de "a")
      "date", "task", // 19
      "date", "task", // 26
    ]);
  });

  it("el año entero: los días con tareas propias y, al final, las series con su título", () => {
    const rows = buildListRows(scopeDays(index, { kind: "year" }), scopeSeries(index, { kind: "year" }));
    expect(rows.map((row) => row.kind)).toEqual(["date", "task", "task", "date", "task", "seriesTitle", "series"]);
    expect(rows.at(-1)).toMatchObject({ kind: "series", series: { originalId: "a" } });
  });

  it("sin series no hay título de series", () => {
    expect(buildListRows(scopeDays(index, { kind: "day", dateKey: "2026-03-05" }), []).some((row) => row.kind === "seriesTitle")).toBe(false);
  });

  it("todas las claves son únicas (las necesita la lista)", () => {
    const rows = buildListRows(scopeDays(index, { kind: "month", month: 3 }), scopeSeries(index, { kind: "year" }));
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });

  it("las claves son únicas aunque una misma tarea (mismo id) esté guardada en dos días, como en datos antiguos duplicados", () => {
    const duplicated = build(2026, {
      "2026-05-04": { 1: task("mismo-id", "Duplicada") },
      "2026-05-11": { 1: task("mismo-id", "Duplicada") },
    });
    const rows = buildListRows(scopeDays(duplicated, { kind: "year" }), []);
    expect(rows.filter((row) => row.kind === "task")).toHaveLength(2);
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });

  it("sin nada, sin filas", () => {
    expect(buildListRows([], [])).toEqual([]);
  });
});

describe("filterDaysByStatus", () => {
  const index = build(2026, {
    "2026-05-01": { 1: task("a", "Hecha 1", { completed: true }), 2: task("b", "Pendiente 1") },
    "2026-05-02": { 1: task("c", "Hecha 2", { completed: true }) },
    "2026-05-03": { 1: task("d", "Pendiente 2") },
  });
  const days = scopeDays(index, { kind: "year" });
  const textsOf = (list: ReturnType<typeof scopeDays>) => list.flatMap((day) => day.entries.map((entry) => entry.task.text));

  it("'all' deja los días tal cual", () => {
    expect(filterDaysByStatus(days, "all")).toEqual(days);
  });

  it("'done' deja solo las hechas y quita los días que se quedan sin tareas", () => {
    const done = filterDaysByStatus(days, "done");
    expect(done.map((day) => day.dateKey)).toEqual(["2026-05-01", "2026-05-02"]);
    expect(textsOf(done)).toEqual(["Hecha 1", "Hecha 2"]);
    expect(scopeStats(done)).toEqual({ total: 2, completed: 2 });
  });

  it("'pending' deja solo las que faltan y quita los días que se quedan sin tareas", () => {
    const pending = filterDaysByStatus(days, "pending");
    expect(pending.map((day) => day.dateKey)).toEqual(["2026-05-01", "2026-05-03"]);
    expect(textsOf(pending)).toEqual(["Pendiente 1", "Pendiente 2"]);
    expect(scopeStats(pending)).toEqual({ total: 2, completed: 0 });
  });

  it("hechas y pendientes suman el total, y no se toca la lista de entrada", () => {
    const done = scopeStats(filterDaysByStatus(days, "done")).total;
    const pending = scopeStats(filterDaysByStatus(days, "pending")).total;
    expect(done + pending).toBe(scopeStats(days).total);
    expect(days[0].entries).toHaveLength(2);
    expect(days[0].total).toBe(2);
  });

  it("sin días, o sin ninguna que cumpla, queda vacío", () => {
    expect(filterDaysByStatus([], "done")).toEqual([]);
    const onlyPending = scopeDays(build(2026, { "2026-05-03": { 1: task("d", "Pendiente") } }), { kind: "year" });
    expect(filterDaysByStatus(onlyPending, "done")).toEqual([]);
  });

  it("una ocurrencia de una serie cuenta con el estado de ese día", () => {
    const repeated = build(
      2026,
      { "2026-03-05": { 1: task("c", "Semanal") } },
      [pattern("c", "weekly", "2026-03-05")],
      { "c-2026-03-12": true }
    );
    const march = scopeDays(repeated, { kind: "month", month: 3 });
    expect(filterDaysByStatus(march, "done").map((day) => day.dateKey)).toEqual(["2026-03-12"]);
    expect(filterDaysByStatus(march, "pending").map((day) => day.dateKey)).not.toContain("2026-03-12");
    expect(filterDaysByStatus(march, "pending").map((day) => day.dateKey)).toContain("2026-03-19");
  });
});

describe("getSideSplit: el asa de estirar junto a las argollas", () => {
  // Un móvil en horizontal (lomo compacto de 12, argollas de 14) y una tablet (lomo de 22, argollas de 34)
  const layouts = [
    { name: "móvil", spreadWidth: 900, padding: 8, seamGap: 12, ringWidth: 14 },
    { name: "tablet", spreadWidth: 1200, padding: 8, seamGap: 22, ringWidth: 34 },
  ];

  for (const layout of layouts) {
    describe(layout.name, () => {
      const at = (share: number) =>
        getSideSplit({ spreadWidth: layout.spreadWidth, padding: layout.padding, seamGap: layout.seamGap, ringWidth: layout.ringWidth, share });

      it("el calendario, el hueco del lomo y las tareas llenan el ancho", () => {
        const split = at(0.4);
        const tasks = split.span - split.calendarWidth;
        expect(layout.padding * 2 + split.calendarWidth + split.gap + tasks).toBeCloseTo(layout.spreadWidth, 6);
      });

      it("el calendario mide exactamente su parte del ancho repartible", () => {
        const split = at(0.4);
        expect(split.calendarWidth).toBeCloseTo(0.4 * split.span, 6);
      });

      it("las argollas caen en medio del hueco del lomo", () => {
        const split = at(0.4);
        expect(split.spineCenter).toBeCloseTo(layout.padding + split.calendarWidth + layout.seamGap / 2, 6);
      });

      it("el asa queda pegada a la derecha de las argollas, sin taparlas, y acaba donde empiezan las tareas", () => {
        const split = at(0.4);
        const ringsRight = split.spineCenter + layout.ringWidth / 2;
        expect(split.handleLeft).toBeGreaterThanOrEqual(ringsRight);
        expect(split.handleLeft - ringsRight).toBeLessThanOrEqual(SIDE_HANDLE_MARGIN + 1e-6);
        expect(split.handleLeft + SIDE_HANDLE_WIDTH).toBeCloseTo(layout.padding + split.calendarWidth + split.gap, 6);
      });

      it("arrastrar mueve el asa, las argollas y el borde del calendario lo mismo que el dedo", () => {
        const before = at(0.4);
        const dx = 60;
        const after = at(0.4 + dx / before.span);
        expect(after.handleLeft - before.handleLeft).toBeCloseTo(dx, 6);
        expect(after.spineCenter - before.spineCenter).toBeCloseTo(dx, 6);
        expect(after.calendarWidth - before.calendarWidth).toBeCloseTo(dx, 6);
      });
    });
  }

  it("respeta los límites del reparto", () => {
    const base = { spreadWidth: 900, padding: 8, seamGap: 12, ringWidth: 14 };
    const span = getSideSplit({ ...base, share: 0.5 }).span;
    expect(getSideSplit({ ...base, share: 0 }).calendarWidth).toBeCloseTo(0.25 * span, 6);
    expect(getSideSplit({ ...base, share: 1 }).calendarWidth).toBeCloseTo(0.65 * span, 6);
    expect(Number.isFinite(getSideSplit({ ...base, share: NaN }).calendarWidth)).toBe(true);
  });

  it("sin medir todavía el contenedor no da números raros", () => {
    const split = getSideSplit({ spreadWidth: 0, padding: 8, seamGap: 12, ringWidth: 14, share: 0.4 });
    expect(split.span).toBeGreaterThanOrEqual(1);
    for (const value of Object.values(split)) expect(Number.isFinite(value)).toBe(true);
  });
});
