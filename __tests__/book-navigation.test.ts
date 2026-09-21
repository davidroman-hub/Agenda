import { calculateDays } from "../components/agendaComponents/bookFragments/bookUtils";
import type { AgendaTask } from "../stores/agenda-tasks-store";
import { dateToLocalDateString } from "../utils/date-utils";
import { findFreeLine, findTaskLine, getPageIndexForDate, getPageNumber } from "../utils/book-navigation";
import { addDaysToDateKey } from "../utils/repeat-utils";

const TODAY = "2026-09-20";

describe("getPageIndexForDate", () => {
  it("hoy y los siguientes días de la primera página están en la página 0", () => {
    expect(getPageIndexForDate(TODAY, "2026-09-20", 3)).toBe(0);
    expect(getPageIndexForDate(TODAY, "2026-09-22", 3)).toBe(0);
  });

  it("cada `daysToShow` días avanza una página", () => {
    expect(getPageIndexForDate(TODAY, "2026-09-23", 3)).toBe(1);
    expect(getPageIndexForDate(TODAY, "2026-09-26", 3)).toBe(2);
  });

  it("el pasado cae en páginas negativas (ayer ya es la página -1)", () => {
    expect(getPageIndexForDate(TODAY, "2026-09-19", 3)).toBe(-1);
    expect(getPageIndexForDate(TODAY, "2026-09-17", 3)).toBe(-1);
    expect(getPageIndexForDate(TODAY, "2026-09-16", 3)).toBe(-2);
  });

  it("con un día por página, el índice es la distancia en días", () => {
    expect(getPageIndexForDate(TODAY, "2026-09-25", 1)).toBe(5);
    expect(getPageIndexForDate(TODAY, "2026-09-15", 1)).toBe(-5);
  });

  it("un `daysToShow` inválido no rompe el cálculo", () => {
    expect(getPageIndexForDate(TODAY, "2026-09-25", 0)).toBe(5);
  });

  describe("coincide con las páginas que dibuja el libro (calculateDays)", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 8, 20, 15, 30));
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("para cualquier día, la página calculada lo contiene (de 40 días atrás a 40 adelante, con varios tamaños de página)", () => {
      for (const daysToShow of [1, 2, 3, 5, 6, 7]) {
        for (let offset = -40; offset <= 40; offset++) {
          const dateKey = addDaysToDateKey(TODAY, offset);
          const page = getPageIndexForDate(TODAY, dateKey, daysToShow);
          const shown = calculateDays(page, daysToShow).map(dateToLocalDateString);

          expect(shown).toContain(dateKey);
        }
      }
    });
  });
});

describe("getPageNumber", () => {
  it("hoy es la página 1, no existe la 0, y las anteriores son -1, -2…", () => {
    expect([-3, -2, -1, 0, 1, 2].map(getPageNumber)).toEqual([-3, -2, -1, 1, 2, 3]);
  });
});

describe("findTaskLine", () => {
  const task = (id: string, extra: Partial<AgendaTask> = {}): AgendaTask => ({
    id,
    text: id,
    completed: false,
    createdAt: "x",
    updatedAt: "x",
    ...extra,
  });
  const normalTasks = { 2: task("a"), 5: task("b") };
  const repeatedTasks = [
    task("x-repeat-2026-09-20", { isRepeatingTask: true, repeatingTaskId: "x" }),
    task("y-repeat-2026-09-20", { isRepeatingTask: true, repeatingTaskId: "y" }),
  ];

  it("una tarea normal está en su línea", () => {
    expect(findTaskLine("a", normalTasks, repeatedTasks, 12)).toBe(2);
    expect(findTaskLine("b", normalTasks, repeatedTasks, 12)).toBe(5);
  });

  it("una instancia repetida está después de las líneas de escribir, en el orden en que se dibujan", () => {
    expect(findTaskLine("x", normalTasks, repeatedTasks, 12)).toBe(13);
    expect(findTaskLine("y", normalTasks, repeatedTasks, 12)).toBe(14);
  });

  it("depende del total de líneas de la página", () => {
    expect(findTaskLine("x", normalTasks, repeatedTasks, 6)).toBe(7);
  });

  it("si la tarea ya no está ese día, es null", () => {
    expect(findTaskLine("borrada", normalTasks, repeatedTasks, 12)).toBeNull();
  });

  it("ignora las entradas nulas del día", () => {
    expect(findTaskLine("a", { 1: null, 2: task("a") }, [], 12)).toBe(2);
  });
});

describe("findFreeLine (dónde va la tarea nueva pedida desde el widget)", () => {
  const filled = (lines: number[]): Record<number, AgendaTask> =>
    Object.fromEntries(lines.map((line) => [line, { id: `t${line}`, text: "x", completed: false, createdAt: "", updatedAt: "" }]));

  it("la primera línea libre del día", () => {
    expect(findFreeLine({}, 12)).toBe(1);
    expect(findFreeLine(filled([1, 2, 4]), 12)).toBe(3);
  });

  it("una línea con null cuenta como libre", () => {
    expect(findFreeLine({ 1: null, 2: filled([2])[2] }, 12)).toBe(1);
  });

  it("si están todas ocupadas, no hay ninguna", () => {
    expect(findFreeLine(filled([1, 2, 3]), 3)).toBeNull();
  });

  it("solo mira las líneas de escribir: una tarea fuera de ese rango no cuenta", () => {
    expect(findFreeLine(filled([13]), 12)).toBe(1);
  });
});
