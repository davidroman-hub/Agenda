jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: {
    scheduleTaskReminder: jest.fn(async () => null),
    cancelTaskReminder: jest.fn(async () => undefined),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import useNotesStore from "../stores/notes-store";
import { moveInOrder, type Note, normalizeNotes, sortNotes } from "../utils/notes";
import { dragScrollSpeed, dropTargetId, type Rect } from "../utils/notes-drag";
import { buildWidgetPayload } from "../utils/widget-data";

/**
 * El orden manual de las notas (las que se arrastran en el tablero): cómo se ordena, se guarda y se recupera, y
 * que el widget de notas lo sigue. Las cuentas del propio arrastre (sobre qué nota se suelta, cuánto se desplaza).
 */

const note = (id: string, createdAt: string, overrides: Partial<Note> = {}): Note => ({
  id,
  text: `nota ${id}`,
  color: "yellow",
  createdAt,
  updatedAt: createdAt,
  ...overrides,
});

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);

describe("sortNotes con orden manual", () => {
  const a = note("a", "2026-09-01T00:00:00.000Z");
  const b = note("b", "2026-09-02T00:00:00.000Z");
  const c = note("c", "2026-09-03T00:00:00.000Z");

  it("sin ninguna reordenada, sigue siendo 'las más recientes primero'", () => {
    expect(ids(sortNotes([a, b, c]))).toEqual(["c", "b", "a"]);
  });

  it("las reordenadas van por su orden, sin importar cuándo se crearon", () => {
    expect(ids(sortNotes([{ ...a, order: 0 }, { ...b, order: 2 }, { ...c, order: 1 }]))).toEqual(["a", "c", "b"]);
  });

  it("una nota nueva (sin orden) va delante de las reordenadas, y las nuevas entre sí, la más reciente primero", () => {
    const ordered = [{ ...a, order: 0 }, { ...b, order: 1 }];
    const d = note("d", "2026-09-04T00:00:00.000Z");
    const e = note("e", "2026-09-05T00:00:00.000Z");

    expect(ids(sortNotes([...ordered, d, e]))).toEqual(["e", "d", "a", "b"]);
  });

  it("con el mismo orden desempata por id, para que no cambie de un arranque a otro", () => {
    expect(ids(sortNotes([{ ...b, order: 1 }, { ...a, order: 1 }]))).toEqual(["a", "b"]);
  });

  it("no cambia la lista que recibe", () => {
    const input = [a, b, c];
    sortNotes(input);
    expect(ids(input)).toEqual(["a", "b", "c"]);
  });
});

describe("moveInOrder", () => {
  it("lleva la nota a la posición pedida y corre las demás", () => {
    expect(moveInOrder(["a", "b", "c", "d"], "a", 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveInOrder(["a", "b", "c", "d"], "d", 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveInOrder(["a", "b", "c", "d"], "b", 1)).toEqual(["a", "b", "c", "d"]);
  });

  it("acota la posición a los límites de la lista", () => {
    expect(moveInOrder(["a", "b", "c"], "a", 99)).toEqual(["b", "c", "a"]);
    expect(moveInOrder(["a", "b", "c"], "c", -5)).toEqual(["c", "a", "b"]);
    expect(moveInOrder(["a", "b", "c"], "b", Number.NaN)).toEqual(["b", "a", "c"]);
  });

  it("un id que no está devuelve la lista igual (y no la misma referencia)", () => {
    const list = ["a", "b"];
    const result = moveInOrder(list, "z", 0);

    expect(result).toEqual(["a", "b"]);
    expect(result).not.toBe(list);
  });

  it("no cambia la lista original", () => {
    const list = ["a", "b", "c"];
    moveInOrder(list, "c", 0);
    expect(list).toEqual(["a", "b", "c"]);
  });
});

describe("normalizeNotes conserva el orden manual", () => {
  const raw = { id: "a", text: "x", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" };

  it("guarda un número válido", () => {
    expect(normalizeNotes([{ ...raw, order: 3 }])[0].order).toBe(3);
    expect(normalizeNotes([{ ...raw, order: 0 }])[0].order).toBe(0);
  });

  it.each([["texto", "3"], ["NaN", Number.NaN], ["Infinity", Infinity], ["objeto", {}], ["null", null]])(
    "%s no es un orden: la nota cuenta como nunca reordenada",
    (_name, order) => {
      expect(normalizeNotes([{ ...raw, order }])[0]).not.toHaveProperty("order");
    }
  );

  it("sin la clave, no la inventa", () => {
    expect(normalizeNotes([raw])[0]).not.toHaveProperty("order");
  });
});

describe("reorderNotes (store)", () => {
  const created = () => useNotesStore.getState().notes;
  const displayed = () => ids(sortNotes(created()));

  beforeEach(async () => {
    useNotesStore.setState({ notes: [] });
    await AsyncStorage.clear();
    jest.useFakeTimers();
    for (const [index, text] of ["primera", "segunda", "tercera"].entries()) {
      jest.setSystemTime(new Date(2026, 8, 20, 10, index));
      useNotesStore.getState().addNote({ text });
    }
    jest.useRealTimers();
  });

  it("antes de mover nada, la más reciente va primera", () => {
    expect(created().map((n) => n.text)).toEqual(["primera", "segunda", "tercera"]);
    expect(sortNotes(created()).map((n) => n.text)).toEqual(["tercera", "segunda", "primera"]);
  });

  it("fija el orden pedido", () => {
    const [primera, segunda, tercera] = created();

    useNotesStore.getState().reorderNotes([primera.id, tercera.id, segunda.id]);

    expect(displayed()).toEqual([primera.id, tercera.id, segunda.id]);
    expect(created().map((n) => n.order).sort()).toEqual([0, 1, 2]);
  });

  it("mover no cuenta como editar: no cambia el texto, las fechas ni el color", () => {
    const before = created().map(({ order: _order, ...rest }) => rest);
    const [primera, segunda, tercera] = created();

    useNotesStore.getState().reorderNotes([tercera.id, primera.id, segunda.id]);

    expect(created().map(({ order: _order, ...rest }) => rest)).toEqual(before);
  });

  it("una nota nueva aparece la primera aunque las demás estén reordenadas, y no descoloca a las otras", () => {
    const [primera, segunda, tercera] = created();
    useNotesStore.getState().reorderNotes([primera.id, tercera.id, segunda.id]);

    const nueva = useNotesStore.getState().addNote({ text: "cuarta" })!;

    expect(displayed()).toEqual([nueva.id, primera.id, tercera.id, segunda.id]);
  });

  it("ignora los ids que no existen y los repetidos", () => {
    const [primera, segunda, tercera] = created();

    useNotesStore.getState().reorderNotes(["fantasma", tercera.id, tercera.id, primera.id]);

    expect(displayed()).toEqual([tercera.id, primera.id, segunda.id]);
  });

  it("las notas que faltan en la lista van detrás, en su orden de antes", () => {
    const [primera, segunda, tercera] = created();

    useNotesStore.getState().reorderNotes([primera.id]);

    // segunda y tercera no venían: quedan detrás, la más reciente antes (como se veían)
    expect(displayed()).toEqual([primera.id, tercera.id, segunda.id]);
  });

  it("una lista vacía, o solo de ids desconocidos, no cambia nada", () => {
    const before = created();

    useNotesStore.getState().reorderNotes([]);
    useNotesStore.getState().reorderNotes(["fantasma"]);

    expect(created()).toBe(before);
  });

  it("soltar la nota donde ya estaba no toca lo guardado", () => {
    const [primera, segunda, tercera] = created();
    useNotesStore.getState().reorderNotes([tercera.id, segunda.id, primera.id]);
    const before = created();

    useNotesStore.getState().reorderNotes([tercera.id, segunda.id, primera.id]);

    expect(created()).toBe(before);
  });

  it("editar una nota reordenada no le quita su sitio", () => {
    const [primera, segunda, tercera] = created();
    useNotesStore.getState().reorderNotes([primera.id, tercera.id, segunda.id]);

    useNotesStore.getState().updateNote(tercera.id, { text: "cambiada", color: "blue" });

    expect(displayed()).toEqual([primera.id, tercera.id, segunda.id]);
  });

  it("borrar una nota deja el orden de las demás", () => {
    const [primera, segunda, tercera] = created();
    useNotesStore.getState().reorderNotes([primera.id, tercera.id, segunda.id]);

    useNotesStore.getState().deleteNote(tercera.id);

    expect(displayed()).toEqual([primera.id, segunda.id]);
  });

  it("el orden se guarda y se recupera (también el de copias de seguridad, que pasan por el mismo camino)", async () => {
    const [primera, segunda, tercera] = created();
    useNotesStore.getState().reorderNotes([primera.id, tercera.id, segunda.id]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const saved = JSON.parse((await AsyncStorage.getItem("notes-storage")) ?? "{}");
    const restored = normalizeNotes(saved.state?.notes);

    expect(ids(sortNotes(restored))).toEqual([primera.id, tercera.id, segunda.id]);
  });
});

describe("el widget de notas sigue el orden del tablero", () => {
  const a = note("a", "2026-09-01T00:00:00.000Z");
  const b = note("b", "2026-09-02T00:00:00.000Z");
  const c = note("c", "2026-09-03T00:00:00.000Z");
  const payloadIds = (notes: Note[]) => buildWidgetPayload("2026-09-21", {}, [], {}, [], notes).notes.map((n) => n.id);

  it("sin reordenar, las más recientes primero", () => {
    expect(payloadIds([a, b, c])).toEqual(["c", "b", "a"]);
  });

  it("reordenadas, en el orden que dejó el usuario", () => {
    expect(payloadIds([{ ...a, order: 0 }, { ...b, order: 2 }, { ...c, order: 1 }])).toEqual(["a", "c", "b"]);
  });

  it("cambiar el orden cambia lo que se manda (así el widget se repinta)", () => {
    const before = buildWidgetPayload("2026-09-21", {}, [], {}, [], [{ ...a, order: 0 }, { ...b, order: 1 }]);
    const after = buildWidgetPayload("2026-09-21", {}, [], {}, [], [{ ...a, order: 1 }, { ...b, order: 0 }]);

    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
  });
});

describe("dropTargetId", () => {
  // Dos columnas de dos notas: a b / c d, cada una de 100x100 con 20 de hueco
  const rects = new Map<string, Rect>([
    ["a", { x: 0, y: 0, width: 100, height: 100 }],
    ["b", { x: 120, y: 0, width: 100, height: 100 }],
    ["c", { x: 0, y: 120, width: 100, height: 100 }],
    ["d", { x: 120, y: 120, width: 100, height: 100 }],
  ]);

  it("la nota que contiene el dedo", () => {
    expect(dropTargetId(rects, "a", { x: 150, y: 50 })).toBe("b");
    expect(dropTargetId(rects, "a", { x: 50, y: 170 })).toBe("c");
  });

  it("sobre el hueco de la propia nota arrastrada no hay destino (soltarla ahí no cambia nada)", () => {
    expect(dropTargetId(rects, "a", { x: 50, y: 50 })).toBeNull();
    expect(dropTargetId(rects, "d", { x: 170, y: 170 })).toBeNull();
  });

  it("nunca devuelve la propia nota arrastrada", () => {
    for (const finger of [{ x: 50, y: 50 }, { x: 110, y: 110 }, { x: 500, y: 500 }, { x: -50, y: -50 }]) {
      expect(dropTargetId(rects, "a", finger)).not.toBe("a");
    }
  });

  it("si hay otra nota bajo el dedo gana a la propia (huecos que se tocan por la torcedura)", () => {
    const overlapping = new Map(rects).set("b", { x: 90, y: 0, width: 100, height: 100 });
    expect(dropTargetId(overlapping, "a", { x: 95, y: 50 })).toBe("b");
  });

  it("en el hueco entre notas, la de centro más cercano", () => {
    expect(dropTargetId(rects, "a", { x: 110, y: 60 })).toBe("b"); // entre a y b, más cerca de b
    expect(dropTargetId(rects, "d", { x: 60, y: 110 })).toBe("a"); // entre a y c, más cerca de a
  });

  it("fuera del tablero, la más cercana", () => {
    expect(dropTargetId(rects, "a", { x: 500, y: 500 })).toBe("d");
    expect(dropTargetId(rects, "a", { x: -200, y: 300 })).toBe("c");
  });

  it("si el tablero se ha desplazado, las notas se han movido con él", () => {
    // El tablero bajó 120 px: 'c' está ahora donde estaba 'a' (y 'a' fuera por arriba)
    expect(dropTargetId(rects, "d", { x: 50, y: 50 }, 120)).toBe("c");
  });

  it("sin otras notas, ninguna", () => {
    expect(dropTargetId(new Map([["a", rects.get("a")!]]), "a", { x: 10, y: 10 })).toBeNull();
    expect(dropTargetId(new Map(), "a", { x: 10, y: 10 })).toBeNull();
  });
});

describe("dragScrollSpeed", () => {
  const top = 100;
  const bottom = 700;

  it("en el centro, no se desplaza", () => {
    expect(dragScrollSpeed(400, top, bottom)).toBe(0);
  });

  it("cerca del borde de arriba sube (negativo) y cerca del de abajo baja (positivo)", () => {
    expect(dragScrollSpeed(120, top, bottom)).toBeLessThan(0);
    expect(dragScrollSpeed(680, top, bottom)).toBeGreaterThan(0);
  });

  it("cuanto más cerca del borde, más deprisa, hasta un máximo", () => {
    expect(Math.abs(dragScrollSpeed(100, top, bottom))).toBeGreaterThan(Math.abs(dragScrollSpeed(150, top, bottom)));
    expect(Math.abs(dragScrollSpeed(-500, top, bottom))).toBe(18);
    expect(dragScrollSpeed(5000, top, bottom)).toBe(18);
  });

  it("justo al empezar la franja del borde ya se mueve, aunque despacio", () => {
    expect(dragScrollSpeed(top + 89, top, bottom)).toBeLessThanOrEqual(-2);
  });

  it("fuera de la franja (la del borde tiene 90 px), nada", () => {
    expect(dragScrollSpeed(top + 91, top, bottom)).toBe(0);
    expect(dragScrollSpeed(bottom - 91, top, bottom)).toBe(0);
  });
});
