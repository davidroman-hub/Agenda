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
// Las notificaciones de repetidas tienen su propio test; aquí solo se comprueba que se les avisa bien
jest.mock("../services/repeated-task-notification-service", () => ({
  RepeatedTaskNotificationService: {
    cancelNotificationsForTask: jest.fn(async () => undefined),
  },
}));

import { deleteRepeatingOccurrence } from "../services/repeating-occurrence-service";
import { RepeatedTaskNotificationService } from "../services/repeated-task-notification-service";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useRepeatingTasksStore from "../stores/repeating-tasks-store";

const cancelNotifications = RepeatedTaskNotificationService.cancelNotificationsForTask as jest.Mock;

const D1 = "2026-09-01";
const TASK_ID = "2026-09-01-1-1789000000000";
const OTHER_ID = "2026-09-01-2-1789000000001";

const agenda = () => useAgendaTasksStore.getState();
const repeating = () => useRepeatingTasksStore.getState();

const original = () => agenda().tasksByDate[D1]?.[1];

// Días (del 2 al 10) en los que aparece una instancia virtual de la serie
const daysWithInstance = () =>
  Array.from({ length: 9 }, (_, i) => `2026-09-${String(i + 2).padStart(2, "0")}`).filter(
    (day) =>
      buildDayTasks(day, agenda().tasksByDate, repeating().repeatingPatterns, repeating().repeatingTaskCompletions)
        .repeatedTasks.length > 0
  );

const startSeries = (repeatOption: "daily" | "weekly" = "daily") => {
  repeating().addRepeatingPattern({ originalTaskId: TASK_ID, repeatOption, startDate: D1 });
};

beforeEach(() => {
  cancelNotifications.mockClear();
  useAgendaTasksStore.setState({
    tasksByDate: {
      [D1]: {
        1: { id: TASK_ID, text: "Tomar vitaminas", completed: false, createdAt: "x", updatedAt: "x", repeat: "daily" },
        2: { id: OTHER_ID, text: "Comprar pan", completed: false, createdAt: "x", updatedAt: "x" },
      },
    },
    linesStatus: {},
  });
  useRepeatingTasksStore.setState({ repeatingPatterns: [], repeatingTaskCompletions: {} });
  startSeries();
});

describe("solo esta", () => {
  it("quita esa fecha de la serie y deja todo lo demás", async () => {
    await deleteRepeatingOccurrence("this", TASK_ID, "2026-09-04");

    expect(daysWithInstance()).not.toContain("2026-09-04");
    expect(daysWithInstance()).toHaveLength(8);
    expect(original()?.id).toBe(TASK_ID); // la original sigue en su día
    expect(repeating().repeatingPatterns).toHaveLength(1);
  });

  it("cancela solo el aviso programado de esa fecha", async () => {
    await deleteRepeatingOccurrence("this", TASK_ID, "2026-09-04");

    expect(cancelNotifications).toHaveBeenCalledWith(TASK_ID, { from: "2026-09-04", to: "2026-09-04" });
  });

  it("no toca el resto de tareas del día de la original", async () => {
    await deleteRepeatingOccurrence("this", TASK_ID, "2026-09-04");

    expect(agenda().tasksByDate[D1]?.[2]?.id).toBe(OTHER_ID);
  });
});

describe("esta y las siguientes", () => {
  it("la serie termina el día anterior y las ocurrencias previas se quedan", async () => {
    await deleteRepeatingOccurrence("following", TASK_ID, "2026-09-05");

    expect(daysWithInstance()).toEqual(["2026-09-02", "2026-09-03", "2026-09-04"]);
    expect(original()?.repeat).toBe("daily"); // sigue siendo una serie
  });

  it("cancela los avisos programados desde esa fecha en adelante", async () => {
    await deleteRepeatingOccurrence("following", TASK_ID, "2026-09-05");

    expect(cancelNotifications).toHaveBeenCalledWith(TASK_ID, { from: "2026-09-05" });
  });

  it("si ya no quedan más ocurrencias, la original vuelve a ser una tarea normal", async () => {
    await deleteRepeatingOccurrence("following", TASK_ID, "2026-09-02"); // la serie solo tendría el día 1

    expect(repeating().repeatingPatterns).toEqual([]);
    expect(original()).toMatchObject({ id: TASK_ID, text: "Tomar vitaminas", repeat: "none" });
    expect(daysWithInstance()).toEqual([]);
  });

  it("una semanal cortada en su segunda ocurrencia también vuelve a ser normal", async () => {
    repeating().removeRepeatingPattern(TASK_ID);
    startSeries("weekly");

    await deleteRepeatingOccurrence("following", TASK_ID, "2026-09-08");

    expect(repeating().repeatingPatterns).toEqual([]);
    expect(original()?.repeat).toBe("none");
  });
});

describe("saltar la última ocurrencia que quedaba", () => {
  it("cuando una serie acotada se queda sin ocurrencias, vuelve a ser una tarea normal", async () => {
    await deleteRepeatingOccurrence("following", TASK_ID, "2026-09-04"); // quedan 2 y 3
    await deleteRepeatingOccurrence("this", TASK_ID, "2026-09-02");
    expect(repeating().repeatingPatterns).toHaveLength(1); // aún queda la del 3
    expect(daysWithInstance()).toEqual(["2026-09-03"]);

    await deleteRepeatingOccurrence("this", TASK_ID, "2026-09-03");

    expect(repeating().repeatingPatterns).toEqual([]);
    expect(original()?.repeat).toBe("none");
  });

  it("en una serie sin fin, saltar días nunca la deshace", async () => {
    for (const day of ["2026-09-02", "2026-09-03", "2026-09-04"]) {
      await deleteRepeatingOccurrence("this", TASK_ID, day);
    }

    expect(repeating().repeatingPatterns).toHaveLength(1);
    expect(original()?.repeat).toBe("daily");
  });
});

describe("toda la serie", () => {
  it("borra el patrón, la tarea original y los completados", async () => {
    repeating().toggleRepeatingTaskCompletion(TASK_ID, "2026-09-03");
    repeating().toggleRepeatingTaskCompletion(OTHER_ID, "2026-09-03");

    await deleteRepeatingOccurrence("all", TASK_ID, "2026-09-03");

    expect(repeating().repeatingPatterns).toEqual([]);
    expect(original()).toBeUndefined();
    expect(daysWithInstance()).toEqual([]);
    expect(repeating().repeatingTaskCompletions).toEqual({ [`${OTHER_ID}-2026-09-03`]: true });
  });

  it("no toca otras tareas del día de la original", async () => {
    await deleteRepeatingOccurrence("all", TASK_ID, "2026-09-03");

    expect(agenda().tasksByDate[D1]?.[2]?.id).toBe(OTHER_ID);
  });

  it("cancela todos los avisos programados de la serie", async () => {
    await deleteRepeatingOccurrence("all", TASK_ID, "2026-09-03");

    expect(cancelNotifications).toHaveBeenCalledWith(TASK_ID);
  });

  it("si la tarea original ya no existía (patrón huérfano), no falla y limpia el patrón", async () => {
    useAgendaTasksStore.setState({ tasksByDate: {} });

    await expect(deleteRepeatingOccurrence("all", TASK_ID, "2026-09-03")).resolves.toBeUndefined();

    expect(repeating().repeatingPatterns).toEqual([]);
  });

  it("se puede borrar la serie pulsando desde el propio día de la original", async () => {
    await deleteRepeatingOccurrence("all", TASK_ID, D1);

    expect(original()).toBeUndefined();
    expect(repeating().repeatingPatterns).toEqual([]);
  });
});
