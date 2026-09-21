/**
 * El arrastre de notas del tablero, sin móvil: el hook `useNoteDrag` (con vistas medidas de mentira) y el
 * tablero con sus gestos, disparando a mano los callbacks que lanzaría el dedo. Lo que no se puede probar
 * aquí es lo táctil de verdad (cuánto cuesta coger un post-it, si se ve bien): eso, en un móvil.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: { scheduleTaskReminder: jest.fn(async () => null), cancelTaskReminder: jest.fn(async () => undefined) },
}));
jest.mock("../hooks/use-i18n", () => ({
  useI18n: () => ({ tCommon: (key: string) => key, tAgenda: (key: string) => key }),
}));
jest.mock("expo-image", () => ({ Image: "ExpoImage" }));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Medium: "medium" },
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("../services/attachments-service", () => ({
  getAttachmentUri: jest.fn(() => null),
  attachmentExists: jest.fn(() => true),
  pickAndStoreAttachment: jest.fn(),
  openAttachment: jest.fn(),
  shareAttachment: jest.fn(),
  deleteStoredFiles: jest.fn(),
  listStoredFileNames: jest.fn(() => []),
}));

import React from "react";
import { LayoutAnimation, ScrollView, Text, TextInput, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import TestRenderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import NotesBoard from "../components/agendaComponents/notes/NotesBoard";
import { LONG_PRESS_TO_DRAG_MS } from "../components/agendaComponents/notes/DraggableNote";
import { type NoteDrag, useNoteDrag } from "../hooks/use-note-drag";
import useAgendaSectionStore from "../stores/agenda-section-store";
import useNotesNavigationStore from "../stores/notes-navigation-store";
import useNotesStore from "../stores/notes-store";
import { sortNotes } from "../utils/notes";
import type { Rect } from "../utils/notes-drag";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: ReactTestRenderer[] = [];
async function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(element); });
  mounted.push(renderer);
  return renderer;
}
afterEach(async () => {
  await act(async () => { while (mounted.length) mounted.pop()!.unmount(); });
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

// ------------------------------------------------------------------------------------------------
// useNoteDrag
// ------------------------------------------------------------------------------------------------

// Cuatro notas en dos columnas (a b / c d), de 100x100 con 20 de hueco, en un tablero que ocupa y 100..700
const RECTS: Record<string, Rect> = {
  a: { x: 0, y: 100, width: 100, height: 100 },
  b: { x: 120, y: 100, width: 100, height: 100 },
  c: { x: 0, y: 220, width: 100, height: 100 },
  d: { x: 120, y: 220, width: 100, height: 100 },
};
const fakeNode = ({ x, y, width, height }: Rect) =>
  ({ measureInWindow: (callback: (...args: number[]) => void) => callback(x, y, width, height) }) as unknown as View;

function setup(ids: string[] = ["a", "b", "c", "d"]) {
  const onReorder = jest.fn();
  const scrollTo = jest.fn();
  const scrollRef = {
    current: { measureInWindow: (callback: (...args: number[]) => void) => callback(0, 100, 300, 600), scrollTo },
  } as unknown as React.RefObject<ScrollView | null>;

  let api!: NoteDrag;
  const Harness = ({ list }: { list: string[] }) => {
    api = useNoteDrag({ ids: list, scrollRef, onReorder });
    return null;
  };
  return { Harness, onReorder, scrollTo, ids, get api() { return api; } };
}

async function startDragging(t: ReturnType<typeof setup>, id: string) {
  for (const [noteId, rect] of Object.entries(RECTS)) t.api.setNode(noteId, fakeNode(rect));
  await act(async () => { t.api.begin(id, centerOf(RECTS[id])); });
  await flush();
}

const at = (x: number, y: number) => ({ x, y });
const centerOf = (rect: Rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

describe("useNoteDrag", () => {
  it("empieza: marca la nota que se lleva y todavía no hay destino", async () => {
    const t = setup();
    await render(<t.Harness list={t.ids} />);

    await startDragging(t, "a");

    expect(t.api.dragId).toBe("a");
    expect(t.api.targetId).toBeNull();
  });

  it("al llevarla sobre otra, esa pasa a ser el destino, y la nota sigue al dedo", async () => {
    const t = setup();
    await render(<t.Harness list={t.ids} />);
    await startDragging(t, "a");

    await act(async () => { t.api.move(at(170, 150), { x: 120, y: 50 }); });

    expect(t.api.targetId).toBe("b");
    expect((t.api.translate.x as unknown as { _value: number })._value).toBe(120);
    expect((t.api.translate.y as unknown as { _value: number })._value).toBe(50);
  });

  it("soltar sobre otra nota la coloca en su sitio y avisa con la lista completa", async () => {
    const t = setup();
    await render(<t.Harness list={t.ids} />);
    await startDragging(t, "a");
    await act(async () => { t.api.move(at(50, 270), { x: 50, y: 170 }); }); // sobre 'c'

    await act(async () => { t.api.end(true); });

    expect(t.onReorder).toHaveBeenCalledTimes(1);
    expect(t.onReorder).toHaveBeenCalledWith(["b", "c", "a", "d"]);
    expect(t.api.dragId).toBeNull();
    expect(t.api.targetId).toBeNull();
  });

  it("llevar una nota hacia arriba: ocupa el sitio de la que tenía encima", async () => {
    const t = setup();
    await render(<t.Harness list={t.ids} />);
    await startDragging(t, "d");
    await act(async () => { t.api.move(at(50, 150), { x: -70, y: -120 }); }); // sobre 'a'

    await act(async () => { t.api.end(true); });

    expect(t.onReorder).toHaveBeenCalledWith(["d", "a", "b", "c"]);
  });

  it("cancelar (el sistema corta el gesto) no mueve nada y deja la nota en su sitio", async () => {
    const t = setup();
    await render(<t.Harness list={t.ids} />);
    await startDragging(t, "a");
    await act(async () => { t.api.move(at(170, 150), { x: 120, y: 50 }); });

    await act(async () => { t.api.end(false); });

    expect(t.onReorder).not.toHaveBeenCalled();
    expect(t.api.dragId).toBeNull();
    expect((t.api.translate.x as unknown as { _value: number })._value).toBe(0);
    expect((t.api.translate.y as unknown as { _value: number })._value).toBe(0);
  });

  it("con una sola nota no hay a dónde llevarla: no avisa de nada", async () => {
    const t = setup(["a"]);
    await render(<t.Harness list={t.ids} />);
    t.api.setNode("a", fakeNode(RECTS.a));
    await act(async () => { t.api.begin("a", centerOf(RECTS.a)); });
    await flush();
    await act(async () => { t.api.move(at(400, 400), { x: 300, y: 300 }); });

    await act(async () => { t.api.end(true); });

    expect(t.onReorder).not.toHaveBeenCalled();
  });

  it("mantener pulsada una nota sin moverla y soltarla no cambia nada (el dedo sigue sobre su propio hueco)", async () => {
    const t = setup();
    await render(<t.Harness list={t.ids} />);
    await startDragging(t, "b");

    expect(t.api.targetId).toBeNull();
    await act(async () => { t.api.end(true); });

    expect(t.onReorder).not.toHaveBeenCalled();
  });

  it("llevarla sobre otra y devolverla a su hueco antes de soltar: no cambia nada", async () => {
    const t = setup();
    await render(<t.Harness list={t.ids} />);
    await startDragging(t, "a");
    await act(async () => { t.api.move(at(170, 150), { x: 120, y: 50 }); });
    expect(t.api.targetId).toBe("b");

    await act(async () => { t.api.move(at(50, 150), { x: 0, y: 0 }); });
    expect(t.api.targetId).toBeNull();
    await act(async () => { t.api.end(true); });

    expect(t.onReorder).not.toHaveBeenCalled();
  });

  it("si el dedo se mueve antes de acabar de medir, al acabar ya cuenta dónde está", async () => {
    const t = setup();
    await render(<t.Harness list={t.ids} />);
    for (const [noteId, rect] of Object.entries(RECTS)) t.api.setNode(noteId, fakeNode(rect));

    await act(async () => {
      t.api.begin("a", centerOf(RECTS.a));
      t.api.move(at(170, 150), { x: 120, y: 50 }); // aún sin medidas
    });
    await flush();

    expect(t.api.targetId).toBe("b");
  });

  it("un movimiento sin arrastre en curso se ignora", async () => {
    const t = setup();
    await render(<t.Harness list={t.ids} />);

    await act(async () => { t.api.move(at(10, 10), { x: 5, y: 5 }); });
    await act(async () => { t.api.end(true); });

    expect(t.api.dragId).toBeNull();
    expect(t.onReorder).not.toHaveBeenCalled();
  });

  it("usa el orden de ahora, no el de cuando empezó el arrastre", async () => {
    const t = setup();
    const r = await render(<t.Harness list={["a", "b", "c", "d"]} />);
    await startDragging(t, "a");
    await act(async () => { t.api.move(at(170, 150), { x: 120, y: 50 }); }); // sobre 'b'
    // Mientras se arrastra llega una nota nueva por delante
    await act(async () => { r.update(<t.Harness list={["z", "a", "b", "c", "d"]} />); });

    await act(async () => { t.api.end(true); });

    expect(t.onReorder).toHaveBeenCalledWith(["z", "b", "a", "c", "d"]);
  });

  it("anima el recolocado antes de avisar del orden nuevo", async () => {
    const calls: string[] = [];
    jest.spyOn(LayoutAnimation, "configureNext").mockImplementation(() => { calls.push("animación"); });
    const t = setup();
    t.onReorder.mockImplementation(() => { calls.push("reorden"); });
    await render(<t.Harness list={t.ids} />);
    await startDragging(t, "a");
    await act(async () => { t.api.move(at(170, 150), { x: 120, y: 50 }); });

    await act(async () => { t.api.end(true); });

    expect(calls).toEqual(["animación", "reorden"]);
  });

  describe("desplazamiento del tablero", () => {
    it("cerca del borde de abajo, el tablero baja solo y la nota sigue al dedo", async () => {
      jest.useFakeTimers();
      const t = setup();
      await render(<t.Harness list={t.ids} />);
      await startDragging(t, "a");

      await act(async () => { t.api.move(at(50, 690), { x: 50, y: 590 }); }); // a 10 px del borde de abajo
      await act(async () => { jest.advanceTimersByTime(48); });

      expect(t.scrollTo).toHaveBeenCalled();
      const lastY = t.scrollTo.mock.calls.at(-1)![0].y;
      expect(lastY).toBeGreaterThan(0);
      // La nota se desplazó lo mismo que el tablero, además de lo que movió el dedo
      expect((t.api.translate.y as unknown as { _value: number })._value).toBe(590 + lastY);
    });

    it("cerca del borde de arriba, sube, pero nunca por encima del principio", async () => {
      jest.useFakeTimers();
      const t = setup();
      await render(<t.Harness list={t.ids} />);
      await startDragging(t, "c");

      await act(async () => { t.api.move(at(50, 105), { x: 50, y: -115 }); });
      await act(async () => { jest.advanceTimersByTime(160); });

      // El tablero está arriba del todo (0): no hay a dónde subir
      expect(t.scrollTo).not.toHaveBeenCalled();
    });

    it("en el centro no se desplaza", async () => {
      jest.useFakeTimers();
      const t = setup();
      await render(<t.Harness list={t.ids} />);
      await startDragging(t, "a");

      await act(async () => { t.api.move(at(50, 400), { x: 50, y: 300 }); });
      await act(async () => { jest.advanceTimersByTime(160); });

      expect(t.scrollTo).not.toHaveBeenCalled();
    });

    it("al soltar deja de desplazarse", async () => {
      jest.useFakeTimers();
      const t = setup();
      await render(<t.Harness list={t.ids} />);
      await startDragging(t, "a");
      await act(async () => { t.api.move(at(50, 690), { x: 50, y: 590 }); });
      await act(async () => { jest.advanceTimersByTime(48); });
      await act(async () => { t.api.end(false); });
      t.scrollTo.mockClear();

      await act(async () => { jest.advanceTimersByTime(160); });

      expect(t.scrollTo).not.toHaveBeenCalled();
    });

    it("al desmontar el tablero deja de desplazarse", async () => {
      jest.useFakeTimers();
      const t = setup();
      const r = await render(<t.Harness list={t.ids} />);
      await startDragging(t, "a");
      await act(async () => { t.api.move(at(50, 690), { x: 50, y: 590 }); });
      await act(async () => { r.unmount(); });
      mounted.pop();
      t.scrollTo.mockClear();

      await act(async () => { jest.advanceTimersByTime(160); });

      expect(t.scrollTo).not.toHaveBeenCalled();
    });

    it("si el tablero se desplaza, el destino se recalcula con las notas donde están ahora", async () => {
      const t = setup();
      await render(<t.Harness list={t.ids} />);
      await startDragging(t, "d");
      await act(async () => { t.api.move(at(50, 150), { x: -70, y: -70 }); }); // sobre 'a'
      expect(t.api.targetId).toBe("a");

      // El tablero baja 120 px (las notas suben): bajo el mismo dedo queda ahora 'c'
      await act(async () => {
        t.api.onScroll({ nativeEvent: { contentOffset: { x: 0, y: 120 } } } as never);
      });

      expect(t.api.targetId).toBe("c");
    });
  });
});

// ------------------------------------------------------------------------------------------------
// NotesBoard con gestos
// ------------------------------------------------------------------------------------------------

const seed = () => {
  jest.useFakeTimers();
  for (const [index, text] of ["Vieja", "Media", "Nueva"].entries()) {
    jest.setSystemTime(new Date(2026, 8, 20, 10, index));
    useNotesStore.getState().addNote({ text });
  }
  jest.useRealTimers();
};

const texts = (root: ReactTestInstance) =>
  root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).filter((c) => typeof c === "string") as string[];
const cardTexts = (root: ReactTestInstance) => texts(root).filter((text) => ["Vieja", "Media", "Nueva"].includes(text));
const scrollEnabled = (root: ReactTestInstance) => root.findByType(ScrollView).props.scrollEnabled;
const handlersOf = (detector: ReactTestInstance) =>
  (detector.props.gesture as unknown as { handlers: Record<string, (...args: unknown[]) => void> }).handlers;

beforeEach(() => {
  useNotesStore.setState({ notes: [] });
  useNotesNavigationStore.setState({ target: null });
  useAgendaSectionStore.setState({ section: "notes", agendaView: "book" });
});

describe("NotesBoard: arrastrar", () => {
  it("cada post-it lleva un gesto de arrastre que solo se activa con una pulsación larga", async () => {
    seed();
    const r = await render(<NotesBoard />);

    const detectors = r.root.findAllByType(GestureDetector);
    expect(detectors).toHaveLength(3);
    for (const detector of detectors) {
      const gesture = detector.props.gesture as unknown as { config: { activateAfterLongPress?: number; runOnJS?: boolean } };
      expect(gesture.config.activateAfterLongPress).toBe(LONG_PRESS_TO_DRAG_MS);
    }
  });

  it("mientras se lleva una nota el tablero no se desplaza con el dedo, y al soltar vuelve a hacerlo", async () => {
    seed();
    const r = await render(<NotesBoard />);
    expect(scrollEnabled(r.root)).toBe(true);
    const first = handlersOf(r.root.findAllByType(GestureDetector)[0]);

    await act(async () => { first.onStart({ absoluteX: 10, absoluteY: 10 }); });
    expect(scrollEnabled(r.root)).toBe(false);

    await act(async () => { first.onEnd({}, false); first.onFinalize({}, false); });
    expect(scrollEnabled(r.root)).toBe(true);
  });

  it("empezar y soltar sin mover no cambia el orden ni lo guardado", async () => {
    seed();
    const before = useNotesStore.getState().notes;
    const r = await render(<NotesBoard />);
    const first = handlersOf(r.root.findAllByType(GestureDetector)[0]);

    await act(async () => { first.onStart({ absoluteX: 10, absoluteY: 10 }); });
    await act(async () => { first.onEnd({}, true); first.onFinalize({}, true); });

    expect(useNotesStore.getState().notes).toBe(before);
    expect(cardTexts(r.root)).toEqual(["Nueva", "Media", "Vieja"]);
  });

  it("el tablero pinta el orden que hay guardado", async () => {
    seed();
    const [vieja, media, nueva] = useNotesStore.getState().notes;
    useNotesStore.getState().reorderNotes([vieja.id, nueva.id, media.id]);

    const r = await render(<NotesBoard />);

    expect(cardTexts(r.root)).toEqual(["Vieja", "Nueva", "Media"]);
  });

  it("al reordenar con el tablero abierto, se repinta en el orden nuevo", async () => {
    seed();
    const r = await render(<NotesBoard />);
    expect(cardTexts(r.root)).toEqual(["Nueva", "Media", "Vieja"]);
    const [vieja, media, nueva] = useNotesStore.getState().notes;

    await act(async () => { useNotesStore.getState().reorderNotes([vieja.id, media.id, nueva.id]); });

    expect(cardTexts(r.root)).toEqual(["Vieja", "Media", "Nueva"]);
  });
});

describe("NotesBoard: lo que ya funcionaba (widget y edición) sigue igual con el arrastre", () => {
  it("una nota pedida desde el widget se abre por su id, esté donde esté en el tablero", async () => {
    seed();
    const [vieja, media, nueva] = useNotesStore.getState().notes;
    useNotesStore.getState().reorderNotes([media.id, nueva.id, vieja.id]);
    const r = await render(<NotesBoard />);

    await act(async () => { useNotesNavigationStore.getState().requestNote(vieja.id); });

    expect(r.root.findAllByType(TextInput)).toHaveLength(1);
    expect(r.root.findByType(TextInput).props.value).toBe("Vieja");
    expect(useNotesNavigationStore.getState().target).toBeNull();
  });

  it("la petición del widget de una nota nueva abre el editor vacío", async () => {
    seed();
    const r = await render(<NotesBoard />);

    await act(async () => { useNotesNavigationStore.getState().requestNewNote(); });

    expect(r.root.findByType(TextInput).props.value).toBe("");
  });

  it("una nota que ya no existe (se borró desde que el widget la mostró) no abre nada y consume la petición", async () => {
    seed();
    const r = await render(<NotesBoard />);

    await act(async () => { useNotesNavigationStore.getState().requestNote("nota-que-ya-no-existe"); });

    expect(r.root.findAllByType(TextInput)).toHaveLength(0);
    expect(useNotesNavigationStore.getState().target).toBeNull();
  });

  it("tras mover una nota, sigue siendo la misma (mismo id, texto y fechas)", async () => {
    seed();
    const before = useNotesStore.getState().notes.map(({ id, text, createdAt, updatedAt }) => ({ id, text, createdAt, updatedAt }));
    const [vieja, media, nueva] = useNotesStore.getState().notes;

    useNotesStore.getState().reorderNotes([vieja.id, nueva.id, media.id]);

    const after = useNotesStore.getState().notes.map(({ id, text, createdAt, updatedAt }) => ({ id, text, createdAt, updatedAt }));
    expect(after).toEqual(before);
    expect(sortNotes(useNotesStore.getState().notes).map((n) => n.id)).toEqual([vieja.id, nueva.id, media.id]);
  });
});
