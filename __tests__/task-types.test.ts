import type { DayTasks } from "../stores/agenda-tasks-store";
import {
  countTasksOfType,
  FILTER_ALL,
  FILTER_NONE,
  hasUntypedTasks,
  initialTypeChoice,
  isTypeNameTaken,
  matchesTypeFilter,
  MAX_TASK_TYPE_NAME_LENGTH,
  nextTypeColor,
  normalizeTypeName,
  resolveFilter,
  resolveTaskTypeId,
  TASK_TYPE_COLORS,
} from "../utils/task-types";

const task = (typeId?: string | null, id = "t") => ({ id, text: id, completed: false, createdAt: "x", updatedAt: "x", typeId });
const known = new Set(["work", "home"]);

describe("matchesTypeFilter", () => {
  it("'all' deja pasar todo, con o sin tipo", () => {
    expect(matchesTypeFilter(task("work"), FILTER_ALL)).toBe(true);
    expect(matchesTypeFilter(task(null), FILTER_ALL)).toBe(true);
    expect(matchesTypeFilter(task(undefined), FILTER_ALL)).toBe(true);
  });

  it("un tipo concreto solo deja pasar sus tareas", () => {
    expect(matchesTypeFilter(task("work"), "work")).toBe(true);
    expect(matchesTypeFilter(task("home"), "work")).toBe(false);
    expect(matchesTypeFilter(task(null), "work")).toBe(false);
  });

  it("'none' deja pasar solo las tareas sin tipo, sean null o de antes de existir el campo (undefined)", () => {
    expect(matchesTypeFilter(task(null), FILTER_NONE)).toBe(true);
    expect(matchesTypeFilter(task(undefined), FILTER_NONE)).toBe(true);
    expect(matchesTypeFilter(task(""), FILTER_NONE)).toBe(true);
    expect(matchesTypeFilter(task("work"), FILTER_NONE)).toBe(false);
  });

  it("una tarea con un tipo que ya no existe cuenta como sin tipo", () => {
    expect(matchesTypeFilter(task("borrado"), FILTER_NONE, known)).toBe(true);
    expect(matchesTypeFilter(task("borrado"), "work", known)).toBe(false);
    expect(matchesTypeFilter(task("work"), "work", known)).toBe(true);
  });
});

describe("resolveTaskTypeId / resolveFilter", () => {
  it("resuelve el tipo o null", () => {
    expect(resolveTaskTypeId(task("work"), known)).toBe("work");
    expect(resolveTaskTypeId(task("borrado"), known)).toBeNull();
    expect(resolveTaskTypeId(task(undefined), known)).toBeNull();
    expect(resolveTaskTypeId(task("cualquiera"))).toBe("cualquiera"); // sin lista de tipos conocidos no se valida
  });

  it("un filtro sobre un tipo borrado vuelve a 'todas'; los demás se respetan", () => {
    expect(resolveFilter("work", known)).toBe("work");
    expect(resolveFilter("borrado", known)).toBe(FILTER_ALL);
    expect(resolveFilter(FILTER_NONE, known)).toBe(FILTER_NONE);
    expect(resolveFilter(FILTER_ALL, known)).toBe(FILTER_ALL);
  });
});

describe("nombres de tipo", () => {
  it("se recortan y colapsan los espacios, y se limita el largo", () => {
    expect(normalizeTypeName("   Mi   trabajo  ")).toBe("Mi trabajo");
    expect(normalizeTypeName("x".repeat(60))).toHaveLength(MAX_TASK_TYPE_NAME_LENGTH);
    expect(normalizeTypeName("   ")).toBe("");
  });

  it("dos nombres iguales salvo mayúsculas, acentos o espacios cuentan como repetidos", () => {
    const types = [{ id: "a", name: "Trabajo" }];

    expect(isTypeNameTaken(types, "trabajo")).toBe(true);
    expect(isTypeNameTaken(types, "  TRÁBAJO ")).toBe(true);
    expect(isTypeNameTaken(types, "Casa")).toBe(false);
  });

  it("al renombrar, el propio tipo no cuenta como repetido", () => {
    const types = [{ id: "a", name: "Trabajo" }, { id: "b", name: "Casa" }];

    expect(isTypeNameTaken(types, "trabajo", "a")).toBe(false);
    expect(isTypeNameTaken(types, "casa", "a")).toBe(true);
  });
});

describe("nextTypeColor", () => {
  it("empieza por el primer color y salta los ya usados", () => {
    expect(nextTypeColor([])).toBe(TASK_TYPE_COLORS[0]);
    expect(nextTypeColor([{ color: TASK_TYPE_COLORS[0] }, { color: TASK_TYPE_COLORS[1] }])).toBe(TASK_TYPE_COLORS[2]);
    expect(nextTypeColor([{ color: TASK_TYPE_COLORS[1] }])).toBe(TASK_TYPE_COLORS[0]);
  });

  it("cuando se acaban los colores, reparte cíclicamente en vez de fallar", () => {
    const all = TASK_TYPE_COLORS.map((color) => ({ color }));
    // Con todos usados, vuelve a empezar: el siguiente color es el que toca por número de tipos
    expect(nextTypeColor(all)).toBe(TASK_TYPE_COLORS[0]);
    expect(nextTypeColor([...all, { color: "#000" }])).toBe(TASK_TYPE_COLORS[1]);
    expect(nextTypeColor([...all, { color: "#000" }, { color: "#111" }])).toBe(TASK_TYPE_COLORS[2]);
  });
});

describe("recuento de tareas", () => {
  const tasksByDate: Record<string, DayTasks> = {
    "2026-09-01": { 1: task("work", "a"), 2: task(null, "b"), 3: task("home", "c") },
    "2026-09-02": { 1: task("work", "d"), 2: null },
    "2026-09-03": { 5: task(undefined, "e") },
  };

  it("cuenta las tareas de un tipo", () => {
    expect(countTasksOfType(tasksByDate, "work")).toBe(2);
    expect(countTasksOfType(tasksByDate, "home")).toBe(1);
    expect(countTasksOfType(tasksByDate, "nada")).toBe(0);
  });

  it("detecta si hay tareas sin tipo, contando también las de un tipo borrado", () => {
    expect(hasUntypedTasks(tasksByDate, known)).toBe(true);
    expect(hasUntypedTasks({ d: { 1: task("work") } }, known)).toBe(false);
    expect(hasUntypedTasks({ d: { 1: task("borrado") } }, known)).toBe(true);
    expect(hasUntypedTasks({}, known)).toBe(false);
  });
});

describe("initialTypeChoice (qué tipo lleva el modal al abrirse)", () => {
  const types = [{ id: "work" }, { id: "home" }];

  it("una tarea nueva toma el tipo de la pestaña activa", () => {
    expect(initialTypeChoice({ isNewTask: true, types, activeFilter: "work" })).toBe("work");
  });

  it("una tarea nueva con 'Todas' o 'Sin tipo' activa empieza sin tipo, ya decidido", () => {
    expect(initialTypeChoice({ isNewTask: true, types, activeFilter: FILTER_ALL })).toBeNull();
    expect(initialTypeChoice({ isNewTask: true, types, activeFilter: FILTER_NONE })).toBeNull();
  });

  it("una pestaña que ya no existe no se aplica", () => {
    expect(initialTypeChoice({ isNewTask: true, types, activeFilter: "borrado" })).toBeNull();
  });

  it("una tarea con tipo conserva el suyo", () => {
    expect(initialTypeChoice({ isNewTask: false, taskTypeId: "home", types, activeFilter: "work" })).toBe("home");
  });

  it("una tarea antigua sin tipo, existiendo tipos, queda SIN DECIDIR (undefined): hay que elegir al guardar", () => {
    expect(initialTypeChoice({ isNewTask: false, taskTypeId: null, types, activeFilter: FILTER_ALL })).toBeUndefined();
    expect(initialTypeChoice({ isNewTask: false, taskTypeId: undefined, types, activeFilter: "work" })).toBeUndefined();
  });

  it("una tarea con un tipo borrado también queda sin decidir", () => {
    expect(initialTypeChoice({ isNewTask: false, taskTypeId: "borrado", types, activeFilter: FILTER_ALL })).toBeUndefined();
  });

  it("si no hay tipos no hay nada que decidir", () => {
    expect(initialTypeChoice({ isNewTask: false, taskTypeId: null, types: [], activeFilter: FILTER_ALL })).toBeNull();
    expect(initialTypeChoice({ isNewTask: true, types: [], activeFilter: FILTER_ALL })).toBeNull();
  });
});
