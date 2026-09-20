jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: {
    scheduleTaskReminder: jest.fn(async () => null),
    cancelTaskReminder: jest.fn(async () => undefined),
  },
}));

import { countTasksUsingType, deleteTaskType } from "../services/task-types-service";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useTaskTypesStore from "../stores/task-types-store";
import { FILTER_ALL, MAX_TASK_TYPES, TASK_TYPE_COLORS } from "../utils/task-types";

const types = () => useTaskTypesStore.getState();
const agenda = () => useAgendaTasksStore.getState();

beforeEach(() => {
  useTaskTypesStore.setState({ types: [], activeFilter: FILTER_ALL });
  useAgendaTasksStore.setState({ tasksByDate: {}, linesStatus: {} });
});

describe("store de tipos", () => {
  it("añade un tipo con nombre limpio y el primer color libre", () => {
    const result = types().addType("  Mi   trabajo ");

    expect(result.ok).toBe(true);
    expect(types().types).toHaveLength(1);
    expect(types().types[0]).toMatchObject({ name: "Mi trabajo", color: TASK_TYPE_COLORS[0] });
    expect(types().types[0].id).toMatch(/^type-/);
  });

  it("cada tipo nuevo toma un color distinto", () => {
    types().addType("A");
    types().addType("B");
    types().addType("C");

    expect(new Set(types().types.map((type) => type.color)).size).toBe(3);
  });

  it.each([
    ["vacío", "   ", "empty"],
    ["repetido (sin distinguir mayúsculas ni acentos)", "TRÁBAJO", "taken"],
  ])("rechaza un nombre %s", (_label, name, reason) => {
    types().addType("Trabajo");

    expect(types().addType(name)).toEqual({ ok: false, reason });
    expect(types().types).toHaveLength(1);
  });

  it("rechaza pasar del máximo de tipos", () => {
    for (let i = 0; i < MAX_TASK_TYPES; i++) types().addType(`Tipo ${i}`);

    expect(types().addType("Uno más")).toEqual({ ok: false, reason: "limit" });
    expect(types().types).toHaveLength(MAX_TASK_TYPES);
  });

  it("renombra un tipo, respetando las mismas reglas", () => {
    const work = (types().addType("Trabajo") as { type: { id: string } }).type;
    types().addType("Casa");

    expect(types().renameType(work.id, "Oficina").ok).toBe(true);
    expect(types().types[0].name).toBe("Oficina");
    expect(types().renameType(work.id, "casa")).toEqual({ ok: false, reason: "taken" });
    expect(types().renameType(work.id, " ")).toEqual({ ok: false, reason: "empty" });
    expect(types().renameType("no-existe", "X")).toEqual({ ok: false, reason: "notFound" });
  });

  it("volver a guardar un tipo con su mismo nombre no cuenta como repetido", () => {
    const work = (types().addType("Trabajo") as { type: { id: string } }).type;

    expect(types().renameType(work.id, "trabajo").ok).toBe(true);
  });

  it("cambia el color, pero solo a uno de la paleta", () => {
    const work = (types().addType("Trabajo") as { type: { id: string } }).type;

    types().setTypeColor(work.id, TASK_TYPE_COLORS[4]);
    expect(types().types[0].color).toBe(TASK_TYPE_COLORS[4]);

    types().setTypeColor(work.id, "#123456");
    expect(types().types[0].color).toBe(TASK_TYPE_COLORS[4]);
  });

  it("borrar el tipo activo devuelve el filtro a 'todas'; borrar otro no lo toca", () => {
    const a = (types().addType("A") as { type: { id: string } }).type;
    const b = (types().addType("B") as { type: { id: string } }).type;

    types().setActiveFilter(a.id);
    types().removeType(b.id);
    expect(types().activeFilter).toBe(a.id);

    types().removeType(a.id);
    expect(types().activeFilter).toBe(FILTER_ALL);
  });

  it("el filtro activo no se guarda en disco, solo los tipos", () => {
    const partialize = useTaskTypesStore.persist.getOptions().partialize!;
    types().addType("Trabajo");
    types().setActiveFilter("lo-que-sea");

    expect(Object.keys(partialize(types()) as object)).toEqual(["types"]);
  });

  it("los cambios devuelven una lista nueva (las pantallas se actualizan)", () => {
    const before = types().types;
    const added = types().addType("A") as { type: { id: string } };
    expect(types().types).not.toBe(before);

    const afterAdd = types().types;
    types().renameType(added.type.id, "B");
    expect(types().types).not.toBe(afterAdd);
  });
});

describe("el tipo en las tareas", () => {
  it("una tarea nueva lleva el tipo indicado, o null si no se indica", async () => {
    await agenda().addTask("2026-09-01", 1, "con tipo", null, "none", "work");
    await agenda().addTask("2026-09-01", 2, "sin tipo");

    expect(agenda().tasksByDate["2026-09-01"][1]?.typeId).toBe("work");
    expect(agenda().tasksByDate["2026-09-01"][2]?.typeId).toBeNull();
  });

  it("cambiar el tipo de una tarea existente", async () => {
    await agenda().addTask("2026-09-01", 1, "tarea");

    await agenda().updateTask("2026-09-01", 1, { typeId: "home" });

    expect(agenda().tasksByDate["2026-09-01"][1]?.typeId).toBe("home");
  });

  it("clearTaskType quita ese tipo de todas las tareas de todos los días y deja las demás", () => {
    useAgendaTasksStore.setState({
      tasksByDate: {
        "2026-09-01": { 1: { id: "a", text: "a", completed: false, createdAt: "x", updatedAt: "x", typeId: "work" }, 2: { id: "b", text: "b", completed: false, createdAt: "x", updatedAt: "x", typeId: "home" } },
        "2026-09-02": { 1: { id: "c", text: "c", completed: false, createdAt: "x", updatedAt: "x", typeId: "work" } },
      },
    });

    agenda().clearTaskType("work");

    expect(agenda().tasksByDate["2026-09-01"][1]?.typeId).toBeNull();
    expect(agenda().tasksByDate["2026-09-01"][2]?.typeId).toBe("home");
    expect(agenda().tasksByDate["2026-09-02"][1]?.typeId).toBeNull();
    expect(agenda().tasksByDate["2026-09-01"][1]?.text).toBe("a"); // no se pierde nada más
  });

  it("clearTaskType sin tareas de ese tipo no cambia nada (ni la referencia)", () => {
    useAgendaTasksStore.setState({ tasksByDate: { d: { 1: { id: "a", text: "a", completed: false, createdAt: "x", updatedAt: "x", typeId: "home" } } } });
    const before = agenda().tasksByDate;

    agenda().clearTaskType("work");

    expect(agenda().tasksByDate).toBe(before);
  });

  it("clearTaskType devuelve un tasksByDate nuevo cuando cambia algo (las pantallas se actualizan)", () => {
    useAgendaTasksStore.setState({ tasksByDate: { d: { 1: { id: "a", text: "a", completed: false, createdAt: "x", updatedAt: "x", typeId: "work" } } } });
    const before = agenda().tasksByDate;

    agenda().clearTaskType("work");

    expect(agenda().tasksByDate).not.toBe(before);
  });

  it("las tareas antiguas, guardadas sin el campo, se comportan como sin tipo y siguen funcionando", async () => {
    useAgendaTasksStore.setState({
      tasksByDate: { d: { 1: { id: "vieja", text: "vieja", completed: false, createdAt: "x", updatedAt: "x" } } },
    });

    await agenda().updateTask("d", 1, { text: "editada" });
    agenda().clearTaskType("work");

    expect(agenda().tasksByDate.d[1]?.text).toBe("editada");
    expect(agenda().tasksByDate.d[1]?.typeId).toBeUndefined();
  });
});

describe("services/task-types-service", () => {
  it("cuenta las tareas que usan un tipo", async () => {
    await agenda().addTask("2026-09-01", 1, "a", null, "none", "work");
    await agenda().addTask("2026-09-02", 1, "b", null, "none", "work");
    await agenda().addTask("2026-09-02", 2, "c", null, "none", "home");

    expect(countTasksUsingType("work")).toBe(2);
    expect(countTasksUsingType("home")).toBe(1);
  });

  it("borrar un tipo lo quita, deja sus tareas sin tipo (no las borra) y no toca otros tipos", async () => {
    const work = (types().addType("Trabajo") as { type: { id: string } }).type;
    const home = (types().addType("Casa") as { type: { id: string } }).type;
    await agenda().addTask("2026-09-01", 1, "informe", null, "none", work.id);
    await agenda().addTask("2026-09-01", 2, "limpiar", null, "none", home.id);
    types().setActiveFilter(work.id);

    deleteTaskType(work.id);

    expect(types().types.map((type) => type.id)).toEqual([home.id]);
    expect(types().activeFilter).toBe(FILTER_ALL);
    expect(agenda().tasksByDate["2026-09-01"][1]).toMatchObject({ text: "informe", typeId: null });
    expect(agenda().tasksByDate["2026-09-01"][2]?.typeId).toBe(home.id);
  });
});
