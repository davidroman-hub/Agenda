import { buildDayTasks } from "../utils/day-tasks";

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
import useRepeatingTasksStore from "../stores/repeating-tasks-store";

const D1 = "2026-09-01";
// Los ids reales llevan guiones: `${fecha}-${línea}-${timestamp}`
const TASK_ID = "2026-09-01-1-1789000000000";

const state = () => useRepeatingTasksStore.getState();
const pattern = () => state().repeatingPatterns[0];

// Días de la serie en los que aparece una instancia virtual, del 2 al 10 de septiembre
const daysWithInstance = () => {
  const { tasksByDate } = useAgendaTasksStore.getState();
  const { repeatingPatterns, repeatingTaskCompletions } = state();
  return Array.from({ length: 9 }, (_, i) => `2026-09-${String(i + 2).padStart(2, "0")}`).filter(
    (day) => buildDayTasks(day, tasksByDate, repeatingPatterns, repeatingTaskCompletions).repeatedTasks.length > 0
  );
};

beforeEach(() => {
  useAgendaTasksStore.setState({
    tasksByDate: {
      [D1]: {
        1: { id: TASK_ID, text: "Tomar vitaminas", completed: false, createdAt: "x", updatedAt: "x" },
      },
    },
    linesStatus: {},
  });
  useRepeatingTasksStore.setState({ repeatingPatterns: [], repeatingTaskCompletions: {} });
  state().addRepeatingPattern({ originalTaskId: TASK_ID, repeatOption: "daily", startDate: D1 });
});

describe("skipOccurrence (borrar solo esta)", () => {
  it("la serie se salta esa fecha y sigue en las demás", () => {
    state().skipOccurrence(TASK_ID, "2026-09-04");

    expect(pattern().excludedDates).toEqual(["2026-09-04"]);
    expect(daysWithInstance()).not.toContain("2026-09-04");
    expect(daysWithInstance()).toEqual([
      "2026-09-02", "2026-09-03", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10",
    ]);
  });

  it("varias fechas saltadas se guardan ordenadas y sin repetirse", () => {
    state().skipOccurrence(TASK_ID, "2026-09-06");
    state().skipOccurrence(TASK_ID, "2026-09-03");
    state().skipOccurrence(TASK_ID, "2026-09-06");

    expect(pattern().excludedDates).toEqual(["2026-09-03", "2026-09-06"]);
  });

  it("quita el completado de esa fecha y deja los demás", () => {
    state().toggleRepeatingTaskCompletion(TASK_ID, "2026-09-03");
    state().toggleRepeatingTaskCompletion(TASK_ID, "2026-09-04");

    state().skipOccurrence(TASK_ID, "2026-09-04");

    expect(state().repeatingTaskCompletions).toEqual({ [`${TASK_ID}-2026-09-03`]: true });
  });

  it("no toca los completados de otra tarea cuyo id empieza igual", () => {
    const otherId = `${TASK_ID}9`; // "…0009": mismo prefijo de texto
    useRepeatingTasksStore.setState({
      repeatingTaskCompletions: { [`${TASK_ID}-2026-09-04`]: true, [`${otherId}-2026-09-04`]: true },
    });

    state().skipOccurrence(TASK_ID, "2026-09-04");

    expect(state().repeatingTaskCompletions).toEqual({ [`${otherId}-2026-09-04`]: true });
  });
});

describe("endSeriesBefore (borrar esta y las siguientes)", () => {
  it("la serie termina el día anterior; las ocurrencias anteriores se quedan", () => {
    state().endSeriesBefore(TASK_ID, "2026-09-05");

    expect(pattern().endDate).toBe("2026-09-04");
    expect(daysWithInstance()).toEqual(["2026-09-02", "2026-09-03", "2026-09-04"]);
  });

  it("limpia lo que queda a partir de esa fecha: saltos y completados", () => {
    state().skipOccurrence(TASK_ID, "2026-09-03");
    state().skipOccurrence(TASK_ID, "2026-09-08");
    state().toggleRepeatingTaskCompletion(TASK_ID, "2026-09-02");
    state().toggleRepeatingTaskCompletion(TASK_ID, "2026-09-06");

    state().endSeriesBefore(TASK_ID, "2026-09-05");

    expect(pattern().excludedDates).toEqual(["2026-09-03"]);
    expect(state().repeatingTaskCompletions).toEqual({ [`${TASK_ID}-2026-09-02`]: true });
  });

  it("si la serie ya terminaba antes, no se alarga", () => {
    state().endSeriesBefore(TASK_ID, "2026-09-03");
    state().endSeriesBefore(TASK_ID, "2026-09-08");

    expect(pattern().endDate).toBe("2026-09-02");
  });

  it("acabar una serie por segunda vez más atrás la acorta", () => {
    state().endSeriesBefore(TASK_ID, "2026-09-08");
    state().endSeriesBefore(TASK_ID, "2026-09-04");

    expect(pattern().endDate).toBe("2026-09-03");
  });
});

describe("removeRepeatingPattern", () => {
  it("quita el patrón y todos los completados de esa tarea, sin tocar los de otras", () => {
    state().toggleRepeatingTaskCompletion(TASK_ID, "2026-09-02");
    state().toggleRepeatingTaskCompletion("otra-tarea", "2026-09-02");

    state().removeRepeatingPattern(TASK_ID);

    expect(state().repeatingPatterns).toEqual([]);
    expect(state().repeatingTaskCompletions).toEqual({ "otra-tarea-2026-09-02": true });
  });
});

describe("addRepeatingPattern al volver a guardar la tarea original", () => {
  it("con la misma frecuencia conserva el fin y las fechas saltadas", () => {
    state().skipOccurrence(TASK_ID, "2026-09-03");
    state().endSeriesBefore(TASK_ID, "2026-09-08");

    state().addRepeatingPattern({ originalTaskId: TASK_ID, repeatOption: "daily", startDate: D1 });

    expect(state().repeatingPatterns).toHaveLength(1);
    expect(pattern().endDate).toBe("2026-09-07");
    expect(pattern().excludedDates).toEqual(["2026-09-03"]);
  });

  it("si cambia la frecuencia empieza una serie nueva: sin fin ni saltos", () => {
    state().skipOccurrence(TASK_ID, "2026-09-03");
    state().endSeriesBefore(TASK_ID, "2026-09-08");

    state().addRepeatingPattern({ originalTaskId: TASK_ID, repeatOption: "weekly", startDate: D1 });

    expect(pattern().repeatOption).toBe("weekly");
    expect(pattern().endDate).toBeNull();
    expect(pattern().excludedDates).toEqual([]);
  });
});

describe("shouldTaskRepeatOnDate respeta fin y saltos", () => {
  it("false en una fecha saltada y después del fin, true en el resto", () => {
    state().skipOccurrence(TASK_ID, "2026-09-03");
    state().endSeriesBefore(TASK_ID, "2026-09-06");

    expect(state().shouldTaskRepeatOnDate(TASK_ID, "2026-09-02")).toBe(true);
    expect(state().shouldTaskRepeatOnDate(TASK_ID, "2026-09-03")).toBe(false);
    expect(state().shouldTaskRepeatOnDate(TASK_ID, "2026-09-05")).toBe(true);
    expect(state().shouldTaskRepeatOnDate(TASK_ID, "2026-09-06")).toBe(false);
  });
});

describe("compatibilidad con patrones guardados antes de existir fin y saltos", () => {
  it("un patrón sin esos campos sigue funcionando igual", () => {
    useRepeatingTasksStore.setState({
      repeatingPatterns: [
        { id: "p", originalTaskId: TASK_ID, repeatOption: "daily", startDate: D1, createdAt: "x", isActive: true },
      ],
    });

    expect(daysWithInstance()).toHaveLength(9);
    state().skipOccurrence(TASK_ID, "2026-09-04"); // y se puede saltar aunque no tuviera excludedDates
    expect(pattern().excludedDates).toEqual(["2026-09-04"]);
  });
});

describe("contrato de reactividad de las acciones nuevas", () => {
  it("skipOccurrence y endSeriesBefore devuelven un repeatingPatterns nuevo", () => {
    let before = state().repeatingPatterns;
    state().skipOccurrence(TASK_ID, "2026-09-03");
    expect(state().repeatingPatterns).not.toBe(before);

    before = state().repeatingPatterns;
    state().endSeriesBefore(TASK_ID, "2026-09-08");
    expect(state().repeatingPatterns).not.toBe(before);
  });

  it("la lista de patrones se recalcula: la pantalla verá la fecha saltada al momento", () => {
    const before = daysWithInstance();
    state().skipOccurrence(TASK_ID, "2026-09-03");
    expect(daysWithInstance()).not.toEqual(before);
  });
});
