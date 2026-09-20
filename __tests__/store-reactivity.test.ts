/**
 * El libro, el calendario y el detalle del día calculan sus tareas con un useMemo cuyas
 * dependencias son estas tres referencias. Si un store mutara "en sitio" en vez de
 * devolver una referencia nueva, la pantalla se quedaría con datos viejos (antes se
 * tapaba con parches tipo forceRefresh). Este test fija ese contrato.
 */
import { buildDayTasks } from "../utils/day-tasks";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
// addTask/updateTask/deleteTask hablan con el servicio de notificaciones; aquí no hace falta
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: {
    scheduleTaskReminder: jest.fn(async () => null),
    cancelTaskReminder: jest.fn(async () => undefined),
  },
}));

import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useRepeatingTasksStore from "../stores/repeating-tasks-store";

const DAY_ONE = "2026-09-01";
const DAY_TWO = "2026-09-02";

// Lo mismo que compara React entre renders: cada elemento con Object.is
const deps = () => [
  useAgendaTasksStore.getState().tasksByDate,
  useRepeatingTasksStore.getState().repeatingPatterns,
  useRepeatingTasksStore.getState().repeatingTaskCompletions,
];
const changedIndexes = (before: unknown[], after: unknown[]) =>
  after.flatMap((value, index) => (Object.is(value, before[index]) ? [] : [index]));
const TASKS = 0;
const PATTERNS = 1;
const COMPLETIONS = 2;

const dayTwo = () => {
  const { tasksByDate } = useAgendaTasksStore.getState();
  const { repeatingPatterns, repeatingTaskCompletions } = useRepeatingTasksStore.getState();
  return buildDayTasks(DAY_TWO, tasksByDate, repeatingPatterns, repeatingTaskCompletions);
};

beforeEach(() => {
  useAgendaTasksStore.setState({ tasksByDate: {}, linesStatus: {} });
  useRepeatingTasksStore.setState({ repeatingPatterns: [], repeatingTaskCompletions: {} });
});

describe("store de tareas", () => {
  it("añadir, editar, completar y borrar una tarea devuelven un tasksByDate nuevo", async () => {
    const { addTask, updateTask, toggleTaskCompletion, deleteTask } = useAgendaTasksStore.getState();

    let before = deps();
    await addTask(DAY_ONE, 1, "Regar las plantas");
    expect(changedIndexes(before, deps())).toContain(TASKS);

    before = deps();
    await updateTask(DAY_ONE, 1, { text: "Regar las plantas del balcón" });
    expect(changedIndexes(before, deps())).toContain(TASKS);

    before = deps();
    toggleTaskCompletion(DAY_ONE, 1);
    await Promise.resolve();
    expect(changedIndexes(before, deps())).toContain(TASKS);

    before = deps();
    await deleteTask(DAY_ONE, 1);
    expect(changedIndexes(before, deps())).toContain(TASKS);
  });
});

describe("store de repeticiones", () => {
  const pattern = { originalTaskId: "t1", repeatOption: "daily" as const, startDate: DAY_ONE };

  it("crear, actualizar, pausar y quitar un patrón devuelven un repeatingPatterns nuevo", () => {
    const { addRepeatingPattern, toggleRepeatingPattern, updateRepeatingPattern, removeRepeatingPattern } =
      useRepeatingTasksStore.getState();

    let before = deps();
    addRepeatingPattern(pattern);
    expect(changedIndexes(before, deps())).toContain(PATTERNS);

    // Volver a añadir el mismo patrón lo actualiza (no lo duplica) y también cambia la referencia
    before = deps();
    addRepeatingPattern({ ...pattern, repeatOption: "weekly" });
    expect(changedIndexes(before, deps())).toContain(PATTERNS);
    expect(useRepeatingTasksStore.getState().repeatingPatterns).toHaveLength(1);

    const { id } = useRepeatingTasksStore.getState().repeatingPatterns[0];

    before = deps();
    toggleRepeatingPattern(id);
    expect(changedIndexes(before, deps())).toContain(PATTERNS);

    before = deps();
    updateRepeatingPattern(id, { repeatOption: "twice" });
    expect(changedIndexes(before, deps())).toContain(PATTERNS);

    before = deps();
    removeRepeatingPattern("t1");
    expect(changedIndexes(before, deps())).toContain(PATTERNS);
  });

  it("completar una instancia devuelve un repeatingTaskCompletions nuevo", () => {
    const before = deps();
    useRepeatingTasksStore.getState().toggleRepeatingTaskCompletion("t1", DAY_TWO);
    expect(changedIndexes(before, deps())).toContain(COMPLETIONS);
  });
});

describe("lo que ve el día 2 tras cambiar datos de OTRO día (el caso que exigía los parches)", () => {
  it("editar el texto de la original en el día 1 se refleja en la instancia del día 2", async () => {
    await useAgendaTasksStore.getState().addTask(DAY_ONE, 1, "Tomar vitaminas");
    const original = useAgendaTasksStore.getState().tasksByDate[DAY_ONE][1]!;
    useRepeatingTasksStore.getState().addRepeatingPattern({
      originalTaskId: original.id,
      repeatOption: "daily",
      startDate: DAY_ONE,
    });
    expect(dayTwo().repeatedTasks.map((task) => task.text)).toEqual(["Tomar vitaminas"]);

    const before = deps();
    await useAgendaTasksStore.getState().updateTask(DAY_ONE, 1, { text: "Tomar vitaminas D" });

    // React vería que la dependencia cambió y recalcularía el día 2
    expect(changedIndexes(before, deps())).toContain(TASKS);
    expect(dayTwo().repeatedTasks.map((task) => task.text)).toEqual(["Tomar vitaminas D"]);
  });

  it("quitar el patrón hace desaparecer la instancia del día 2", async () => {
    await useAgendaTasksStore.getState().addTask(DAY_ONE, 1, "Tomar vitaminas");
    const original = useAgendaTasksStore.getState().tasksByDate[DAY_ONE][1]!;
    useRepeatingTasksStore.getState().addRepeatingPattern({
      originalTaskId: original.id,
      repeatOption: "daily",
      startDate: DAY_ONE,
    });
    expect(dayTwo().repeatedTasks).toHaveLength(1);

    const before = deps();
    useRepeatingTasksStore.getState().removeRepeatingPattern(original.id);

    expect(changedIndexes(before, deps())).toContain(PATTERNS);
    expect(dayTwo().repeatedTasks).toEqual([]);
  });

  it("completar la instancia del día 2 no toca la original ni las de otros días", async () => {
    await useAgendaTasksStore.getState().addTask(DAY_ONE, 1, "Tomar vitaminas");
    const original = useAgendaTasksStore.getState().tasksByDate[DAY_ONE][1]!;
    useRepeatingTasksStore.getState().addRepeatingPattern({
      originalTaskId: original.id,
      repeatOption: "daily",
      startDate: DAY_ONE,
    });

    useRepeatingTasksStore.getState().toggleRepeatingTaskCompletion(original.id, DAY_TWO);

    expect(dayTwo().repeatedTasks[0].completed).toBe(true);
    const { tasksByDate, repeatingPatterns, repeatingTaskCompletions } = {
      ...useAgendaTasksStore.getState(),
      ...useRepeatingTasksStore.getState(),
    };
    expect(buildDayTasks("2026-09-03", tasksByDate, repeatingPatterns, repeatingTaskCompletions).repeatedTasks[0].completed).toBe(false);
    expect(buildDayTasks(DAY_ONE, tasksByDate, repeatingPatterns, repeatingTaskCompletions).normalTasks[1]?.completed).toBe(false);
  });
});
