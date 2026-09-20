import { AppState } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: {
    scheduleTaskReminder: jest.fn(async () => null),
    cancelTaskReminder: jest.fn(async () => undefined),
  },
}));
// expo-notifications falso, en memoria: lo programado queda en `__state.scheduled`
jest.mock("expo-notifications", () => {
  const state: { scheduled: any[]; nextId: number } = { scheduled: [], nextId: 1 };
  return {
    __state: state,
    getAllScheduledNotificationsAsync: jest.fn(async () => [...state.scheduled]),
    scheduleNotificationAsync: jest.fn(async ({ content, trigger }: any) => {
      const identifier = `n${state.nextId++}`;
      state.scheduled.push({ identifier, content, trigger });
      return identifier;
    }),
    cancelScheduledNotificationAsync: jest.fn(async (identifier: string) => {
      state.scheduled = state.scheduled.filter((item) => item.identifier !== identifier);
    }),
    SchedulableTriggerInputTypes: { DATE: "date" },
  };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { RepeatedTaskNotificationService as Service } from "../services/repeated-task-notification-service";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useRepeatingTasksStore from "../stores/repeating-tasks-store";

const TASK_ID = "2026-09-01-1-1789000000000";
const OTHER_ID = "2026-09-01-2-1789000000001";

const mocked = Notifications as unknown as {
  __state: { scheduled: any[]; nextId: number };
  getAllScheduledNotificationsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
};
const os = mocked.__state;

// Hoy es 4-sep-2026 a las 08:00; el recordatorio de la tarea es a las 10:00
const NOW = new Date(2026, 8, 4, 8, 0);
const reminderAt = (hours: number) => new Date(2026, 8, 1, hours, 0).toISOString();

const repeated = () => os.scheduled.filter((item) => item.content.data?.type === "repeated-task-reminder");
const repeatedDates = () => repeated().map((item) => item.content.data.occurrenceDate).sort();
const fireHours = () => [...new Set(repeated().map((item) => (item.trigger.date as Date).getHours()))];

const setTask = (overrides: Record<string, unknown> = {}) =>
  useAgendaTasksStore.setState({
    tasksByDate: {
      "2026-09-01": {
        1: { id: TASK_ID, text: "Tomar vitaminas", completed: false, createdAt: "x", updatedAt: "x", reminder: reminderAt(10), ...overrides },
      },
    },
  });
const startSeries = () => {
  useRepeatingTasksStore.setState({ repeatingPatterns: [], repeatingTaskCompletions: {} });
  useRepeatingTasksStore.getState().addRepeatingPattern({ originalTaskId: TASK_ID, repeatOption: "daily", startDate: "2026-09-01" });
};
const seedOtherReminder = (count = 1) => {
  for (let i = 0; i < count; i++) {
    os.scheduled.push({ identifier: `otro${i}`, content: { data: { type: "task-reminder", taskId: `x${i}` } }, trigger: {} });
  }
};

const flush = () => jest.advanceTimersByTimeAsync(0);

beforeAll(async () => {
  jest.useFakeTimers();
  await flush();
});
beforeEach(async () => {
  jest.setSystemTime(NOW);
  os.scheduled = [];
  os.nextId = 1;
  mocked.getAllScheduledNotificationsAsync.mockClear();
  mocked.scheduleNotificationAsync.mockClear();
  mocked.cancelScheduledNotificationAsync.mockClear();
  await AsyncStorage.clear();
  setTask();
  startSeries();
});

describe("programar por adelantado", () => {
  it("deja programados los próximos 14 días aunque no se abra la app, a la hora del recordatorio", async () => {
    await Service.syncScheduledNotifications();

    expect(repeatedDates()).toEqual(Array.from({ length: 14 }, (_, i) => `2026-09-${String(i + 4).padStart(2, "0")}`));
    expect(fireHours()).toEqual([10]);
  });

  it("cada aviso lleva los datos para reconocerlo, y no lleva taskId (cancelTaskReminder no debe tocarlos)", async () => {
    await Service.syncScheduledNotifications();

    const { data } = repeated()[0].content;
    expect(data).toMatchObject({ type: "repeated-task-reminder", isRepeatedTask: true, originalTaskId: TASK_ID, occurrenceDate: "2026-09-04" });
    expect(data.signature).toEqual(expect.any(String));
    expect(data).not.toHaveProperty("taskId");
  });

  it("no hay aviso el día de la propia tarea original (ese lo programa su recordatorio normal)", async () => {
    useAgendaTasksStore.setState({
      tasksByDate: { "2026-09-04": { 1: { id: TASK_ID, text: "Tomar vitaminas", completed: false, createdAt: "x", updatedAt: "x", reminder: reminderAt(10) } } },
    });
    useRepeatingTasksStore.setState({ repeatingPatterns: [] });
    useRepeatingTasksStore.getState().addRepeatingPattern({ originalTaskId: TASK_ID, repeatOption: "daily", startDate: "2026-09-04" });

    await Service.syncScheduledNotifications();

    expect(repeatedDates()).not.toContain("2026-09-04");
    expect(repeatedDates()[0]).toBe("2026-09-05");
  });

  it("una tarea repetida sin recordatorio no programa nada", async () => {
    setTask({ reminder: null });

    await Service.syncScheduledNotifications();

    expect(repeated()).toEqual([]);
  });
});

describe("renovar", () => {
  it("es idempotente: sincronizar otra vez no programa ni cancela nada", async () => {
    await Service.syncScheduledNotifications();
    mocked.scheduleNotificationAsync.mockClear();

    await Service.syncScheduledNotifications();
    await Service.syncScheduledNotifications();

    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(repeated()).toHaveLength(14);
  });

  it("al pasar los días la ventana se desplaza: se quitan los pasados y se añaden solo los nuevos", async () => {
    await Service.syncScheduledNotifications();
    mocked.scheduleNotificationAsync.mockClear();

    jest.setSystemTime(new Date(2026, 8, 10, 8, 0)); // seis días después, sin haber tocado nada
    await Service.syncScheduledNotifications();

    expect(repeatedDates()[0]).toBe("2026-09-10");
    expect(repeatedDates()[13]).toBe("2026-09-23");
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(6); // del 18 al 23
    expect(repeated()).toHaveLength(14);
  });

  it("si hoy la hora ya pasó, empieza mañana", async () => {
    jest.setSystemTime(new Date(2026, 8, 4, 10, 30));

    await Service.syncScheduledNotifications();

    expect(repeatedDates()[0]).toBe("2026-09-05");
    expect(repeated()).toHaveLength(13);
  });
});

describe("mantener los avisos al día cuando cambian las tareas", () => {
  beforeEach(async () => {
    await Service.syncScheduledNotifications();
    mocked.scheduleNotificationAsync.mockClear();
    mocked.cancelScheduledNotificationAsync.mockClear();
  });

  it("saltar una ocurrencia cancela solo ese aviso", async () => {
    useRepeatingTasksStore.getState().skipOccurrence(TASK_ID, "2026-09-06");
    await Service.syncScheduledNotifications();

    expect(repeatedDates()).not.toContain("2026-09-06");
    expect(repeated()).toHaveLength(13);
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("terminar la serie cancela los avisos de esa fecha en adelante", async () => {
    useRepeatingTasksStore.getState().endSeriesBefore(TASK_ID, "2026-09-10");
    await Service.syncScheduledNotifications();

    expect(repeatedDates()).toEqual(["2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09"]);
  });

  it("completar la ocurrencia de hoy cancela su aviso", async () => {
    useRepeatingTasksStore.getState().toggleRepeatingTaskCompletion(TASK_ID, "2026-09-04");
    await Service.syncScheduledNotifications();

    expect(repeatedDates()).not.toContain("2026-09-04");
    expect(repeated()).toHaveLength(13);
  });

  it("cambiar la hora del recordatorio sustituye todos los avisos por otros a la hora nueva", async () => {
    setTask({ reminder: reminderAt(11) });
    await Service.syncScheduledNotifications();

    expect(repeated()).toHaveLength(14);
    expect(fireHours()).toEqual([11]);
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(14);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(14);
  });

  it("cambiar el texto de la tarea sustituye los avisos (el título los lleva)", async () => {
    setTask({ text: "Tomar vitaminas D" });
    await Service.syncScheduledNotifications();

    expect(repeated().every((item) => item.content.title.includes("Tomar vitaminas D"))).toBe(true);
    expect(repeated()).toHaveLength(14);
  });

  it("borrar la serie cancela todos sus avisos", async () => {
    useRepeatingTasksStore.getState().removeRepeatingPattern(TASK_ID);
    await Service.syncScheduledNotifications();

    expect(repeated()).toEqual([]);
  });

  it("una serie nueva con recordatorio se programa al momento, sin esperar a otro día", async () => {
    useRepeatingTasksStore.setState({ repeatingPatterns: [] });
    await Service.syncScheduledNotifications();
    expect(repeated()).toEqual([]);

    useRepeatingTasksStore.getState().addRepeatingPattern({ originalTaskId: TASK_ID, repeatOption: "daily", startDate: "2026-09-01" });
    await Service.syncScheduledNotifications();

    expect(repeated()).toHaveLength(14);
  });
});

describe("convivencia con otros avisos y con el sistema antiguo", () => {
  it("no toca los recordatorios normales", async () => {
    seedOtherReminder(3);

    await Service.syncScheduledNotifications();
    useRepeatingTasksStore.getState().removeRepeatingPattern(TASK_ID);
    await Service.syncScheduledNotifications();

    expect(os.scheduled.map((item) => item.identifier)).toEqual(["otro0", "otro1", "otro2"]);
  });

  it("respeta el tope de 60 avisos pendientes del sistema contando los recordatorios normales", async () => {
    seedOtherReminder(55);

    await Service.syncScheduledNotifications();

    expect(repeated()).toHaveLength(5);
    expect(os.scheduled).toHaveLength(60);
    // Se conservan los más próximos
    expect(repeatedDates()).toEqual(["2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08"]);
  });

  it("sustituye los avisos del sistema antiguo (sin fecha de ocurrencia) sin dejar duplicados", async () => {
    os.scheduled.push({
      identifier: "antiguo",
      content: { data: { taskId: TASK_ID, isRepeatedTask: true, repeatOption: "daily", startDate: "2026-09-01" } },
      trigger: {},
    });

    await Service.syncScheduledNotifications();

    expect(os.scheduled.map((item) => item.identifier)).not.toContain("antiguo");
    expect(repeated()).toHaveLength(14);
  });

  it("borra el estado guardado por el sistema antiguo", async () => {
    await AsyncStorage.setItem("DAILY_NOTIFICATION_CHECK", JSON.stringify({ lastCheckDate: "2026-09-03", scheduledNotifications: [] }));
    (Service as any).legacyStateRemoved = false;

    await Service.syncScheduledNotifications();

    expect(await AsyncStorage.getItem("DAILY_NOTIFICATION_CHECK")).toBeNull();
  });

  it("si un aviso falla al programarse, sigue con los demás", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    mocked.scheduleNotificationAsync.mockRejectedValueOnce(new Error("fallo"));

    await Service.syncScheduledNotifications();

    expect(repeated()).toHaveLength(13);
    consoleError.mockRestore();
  });
});

describe("concurrencia y arranque", () => {
  it("varias sincronizaciones a la vez no duplican avisos", async () => {
    await Promise.all([Service.syncScheduledNotifications(), Service.syncScheduledNotifications(), Service.syncScheduledNotifications()]);

    expect(repeated()).toHaveLength(14);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(14);
  });

  it("un cambio que llega cuando el plan ya estaba calculado se recoge en una pasada posterior", async () => {
    // La primera pasada se queda parada al empezar a programar, con el plan ya calculado
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mocked.scheduleNotificationAsync.mockImplementationOnce(async ({ content, trigger }: any) => {
      await gate;
      const identifier = `n${os.nextId++}`;
      os.scheduled.push({ identifier, content, trigger });
      return identifier;
    });

    const first = Service.syncScheduledNotifications();
    await flush();
    useRepeatingTasksStore.getState().skipOccurrence(TASK_ID, "2026-09-06"); // el plan viejo aún incluye el día 6
    const second = Service.syncScheduledNotifications();
    release();
    await Promise.all([first, second]);

    expect(repeatedDates()).not.toContain("2026-09-06");
    expect(repeated()).toHaveLength(13);
  });

  it("no cancela nada mientras los stores no han terminado de cargarse", async () => {
    await Service.syncScheduledNotifications();
    mocked.cancelScheduledNotificationAsync.mockClear();

    // Simula el arranque: stores aún vacíos y sin hidratar
    const realPatterns = useRepeatingTasksStore.getState().repeatingPatterns;
    useRepeatingTasksStore.setState({ repeatingPatterns: [] });
    let finishHydration: () => void = () => {};
    const hasHydrated = jest.spyOn(useRepeatingTasksStore.persist, "hasHydrated").mockReturnValue(false);
    const onFinish = jest.spyOn(useRepeatingTasksStore.persist, "onFinishHydration").mockImplementation((listener) => {
      finishHydration = () => listener(useRepeatingTasksStore.getState());
      return () => {};
    });

    const pending = Service.syncScheduledNotifications();
    await flush();
    expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled();

    // Termina de cargarse con los datos reales
    useRepeatingTasksStore.setState({ repeatingPatterns: realPatterns });
    hasHydrated.mockReturnValue(true);
    finishHydration();
    await pending;

    expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(repeated()).toHaveLength(14);
    hasHydrated.mockRestore();
    onFinish.mockRestore();
  });
});

describe("cancelNotificationsForTask", () => {
  beforeEach(async () => {
    await Service.syncScheduledNotifications();
    mocked.cancelScheduledNotificationAsync.mockClear();
  });

  it("cancela un solo día", async () => {
    await Service.cancelNotificationsForTask(TASK_ID, { from: "2026-09-06", to: "2026-09-06" });

    expect(repeatedDates()).not.toContain("2026-09-06");
    expect(repeated()).toHaveLength(13);
  });

  it("cancela desde una fecha en adelante", async () => {
    await Service.cancelNotificationsForTask(TASK_ID, { from: "2026-09-10" });

    expect(repeatedDates()[repeatedDates().length - 1]).toBe("2026-09-09");
  });

  it("sin rango cancela todos los de la tarea, y no toca los de otra ni los recordatorios normales", async () => {
    seedOtherReminder(1);
    os.scheduled.push({ identifier: "de-otra", content: { data: { type: "repeated-task-reminder", originalTaskId: OTHER_ID, occurrenceDate: "2026-09-05" } }, trigger: {} });

    await Service.cancelNotificationsForTask(TASK_ID);

    expect(os.scheduled.map((item) => item.identifier)).toEqual(["otro0", "de-otra"]);
  });

  it("los avisos del sistema antiguo se cancelan siempre", async () => {
    os.scheduled.push({ identifier: "antiguo", content: { data: { taskId: TASK_ID, isRepeatedTask: true } }, trigger: {} });

    await Service.cancelNotificationsForTask(TASK_ID, { from: "2026-09-06", to: "2026-09-06" });

    expect(os.scheduled.map((item) => item.identifier)).not.toContain("antiguo");
  });

  it("sin avisos programados no falla", async () => {
    os.scheduled = [];
    await expect(Service.cancelNotificationsForTask(TASK_ID)).resolves.toBeUndefined();
  });
});

describe("startAutoSync", () => {
  let stops: (() => void)[] = [];
  const start = (debounceMs = 800) => {
    const stop = Service.startAutoSync(debounceMs);
    stops.push(stop);
    return stop;
  };

  let appStateHandler: (state: string) => void = () => {};
  let appStateRemove: jest.Mock;
  let addListener: jest.SpyInstance;

  beforeEach(() => {
    appStateRemove = jest.fn();
    addListener = jest.spyOn(AppState, "addEventListener").mockImplementation(((_type: string, handler: (state: string) => void) => {
      appStateHandler = handler;
      return { remove: appStateRemove };
    }) as any);
  });
  afterEach(() => {
    stops.forEach((stop) => stop());
    stops = [];
    addListener.mockRestore();
  });

  it("sincroniza al empezar", async () => {
    start();
    await flush();

    expect(repeated()).toHaveLength(14);
  });

  it("cuando cambia una tarea sincroniza tras la espera, no antes", async () => {
    start();
    await flush();

    setTask({ reminder: reminderAt(11) });
    await jest.advanceTimersByTimeAsync(799);
    expect(fireHours()).toEqual([10]);

    await jest.advanceTimersByTimeAsync(2);
    expect(fireHours()).toEqual([11]);
  });

  it("varios cambios seguidos se juntan en una sola sincronización", async () => {
    start();
    await flush();
    mocked.getAllScheduledNotificationsAsync.mockClear();

    setTask({ text: "uno" });
    await jest.advanceTimersByTimeAsync(300);
    setTask({ text: "dos" });
    await jest.advanceTimersByTimeAsync(300);
    setTask({ text: "tres" });
    await jest.advanceTimersByTimeAsync(2000);

    expect(mocked.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(repeated().every((item) => item.content.title.includes("tres"))).toBe(true);
  });

  it("reacciona a cambios de patrones y de completados", async () => {
    start();
    await flush();

    useRepeatingTasksStore.getState().skipOccurrence(TASK_ID, "2026-09-06");
    await jest.advanceTimersByTimeAsync(1000);
    expect(repeatedDates()).not.toContain("2026-09-06");

    useRepeatingTasksStore.getState().toggleRepeatingTaskCompletion(TASK_ID, "2026-09-07");
    await jest.advanceTimersByTimeAsync(1000);
    expect(repeatedDates()).not.toContain("2026-09-07");
  });

  it("ignora los cambios que no afectan a los avisos", async () => {
    start();
    await flush();
    mocked.getAllScheduledNotificationsAsync.mockClear();

    useAgendaTasksStore.setState({ linesStatus: { "2026-09-04": { occupiedLines: [], availableLines: [], extraLines: 2 } } });
    await jest.advanceTimersByTimeAsync(2000);

    expect(mocked.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it("al volver a primer plano sincroniza, y con otros estados no", async () => {
    start();
    await flush();
    setTask({ reminder: reminderAt(11) }); // cambia sin dejar pasar la espera
    mocked.getAllScheduledNotificationsAsync.mockClear();

    appStateHandler("background");
    await flush();
    expect(mocked.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();

    appStateHandler("active");
    await flush();
    expect(fireHours()).toEqual([11]);
  });

  it("varias pantallas lo piden a la vez: una sola suscripción, y solo se desactiva cuando la última lo deja", async () => {
    const stopFirst = start();
    const stopSecond = start();
    await flush();
    expect(addListener).toHaveBeenCalledTimes(1);

    stopFirst();
    stopFirst(); // parar dos veces la misma no cuenta doble
    expect(appStateRemove).not.toHaveBeenCalled();
    setTask({ reminder: reminderAt(11) });
    await jest.advanceTimersByTimeAsync(1000);
    expect(fireHours()).toEqual([11]); // sigue activo

    stopSecond();
    expect(appStateRemove).toHaveBeenCalledTimes(1);
    setTask({ reminder: reminderAt(12) });
    await jest.advanceTimersByTimeAsync(2000);
    expect(fireHours()).toEqual([11]); // ya no reacciona
  });

  it("parar cancela una sincronización que estaba esperando", async () => {
    const stop = start();
    await flush();

    setTask({ reminder: reminderAt(11) });
    stop();
    await jest.advanceTimersByTimeAsync(2000);

    expect(fireHours()).toEqual([10]);
  });
});

describe("estadísticas", () => {
  it("cuenta solo los avisos de repetidas y da la fecha de la última sincronización", async () => {
    seedOtherReminder(2);
    await Service.syncScheduledNotifications();

    const stats = await Service.getNotificationStats();

    expect(stats.activeNotifications).toBe(14);
    expect(stats.lastCheckDate).toBe("2026-09-04");
    expect(stats.notifications[0]).toEqual({ notificationId: expect.any(String), taskId: TASK_ID, date: "2026-09-04" });
  });
});
