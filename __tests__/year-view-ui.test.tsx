/**
 * Renderiza la vista de año con los stores reales y pulsa lo que un usuario pulsaría: elegir un día o
 * un mes, marcar tareas, cambiar de año, abrir en el libro, el filtro por tipo y las dos distribuciones
 * (móvil y pantalla ancha). No comprueba cómo se ve, sí que cada cosa hace lo que dice.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: { scheduleTaskReminder: jest.fn(async () => null), cancelTaskReminder: jest.fn(async () => undefined) },
}));
jest.mock("../hooks/use-i18n", () => ({
  useI18n: () => ({
    tCommon: (key: string, options?: object) => (options ? `${key}${JSON.stringify(options)}` : key),
    tAgenda: (key: string) => key,
    currentLanguage: "es",
  }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("react-native-reanimated", () => ({ useSharedValue: (value: unknown) => ({ value }) }));
jest.mock("../components/agendaComponents/bookFragments/BookSpine", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: () => React.createElement(View, { testID: "spine" }) };
});
// El botón de horizontal solo sale donde se puede girar la pantalla
let mockCanRotate = true;
jest.mock("../services/screen-orientation", () => ({
  isLandscapeLockAvailable: () => mockCanRotate,
  forceLandscape: jest.fn(async () => true),
  restoreOrientation: jest.fn(async () => undefined),
}));
// El "hoy" de las pruebas: domingo 20 de septiembre de 2026
jest.mock("../utils/date-utils", () => ({
  ...jest.requireActual("../utils/date-utils"),
  getCurrentLocalDateString: () => "2026-09-20",
}));
// El tamaño de la pantalla, que cada prueba puede cambiar
let mockWindow = { width: 800, height: 1000, scale: 2, fontScale: 1 };
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow,
}));

import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import TestRenderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import { COMPACT_RING_WIDTH, COMPACT_SPINE_WIDTH, RING_WIDTH, SPINE_WIDTH } from "../components/agendaComponents/bookStyles";
import YearView from "../components/agendaComponents/yearView/YearView";
import useAgendaSectionStore from "../stores/agenda-section-store";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useBookNavigationStore from "../stores/book-navigation-store";
import useRepeatingTasksStore from "../stores/repeating-tasks-store";
import useTaskTypesStore from "../stores/task-types-store";
import useYearSplitStore from "../stores/year-split-store";
import { getSideSplit, SIDE_HANDLE_WIDTH } from "../utils/year-view";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const agenda = () => useAgendaTasksStore.getState();
const repeating = () => useRepeatingTasksStore.getState();

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const mounted: ReactTestRenderer[] = [];

// Dibuja la vista y le da el ancho que tendría el calendario (los meses no se dibujan hasta medirlo)
async function renderYear(window = { width: 800, height: 1000 }) {
  mockWindow = { ...mockWindow, ...window };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<YearView />);
  });
  mounted.push(renderer);

  const calendar = renderer.root.findAll((n) => n.props.accessibilityLabel === "yearView.calendarLabel" && typeof n.props.onLayout === "function")[0];
  await act(async () => {
    calendar.props.onLayout({ nativeEvent: { layout: { width: window.width < 600 ? window.width - 16 : window.width / 2 - 16, height: 400 } } });
  });
  return renderer.root;
}

afterEach(async () => {
  await act(async () => {
    while (mounted.length) mounted.pop()!.unmount();
  });
});

const texts = (root: ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    // Los números (el año) también se pintan como texto
    .filter((child) => typeof child === "string" || typeof child === "number")
    .map(String);
const has = (root: ReactTestInstance, text: string) => texts(root).includes(text);
const count = (root: ReactTestInstance, text: string) => texts(root).filter((value) => value === text).length;

const button = (root: ReactTestInstance, label: string) => {
  const found = root.findAllByType(TouchableOpacity).filter((node) => node.props.accessibilityLabel === label);
  if (found.length === 0) throw new Error(`No hay botón «${label}»`);
  return found[0];
};
const press = async (root: ReactTestInstance, label: string) => {
  await act(async () => {
    button(root, label).props.onPress();
  });
};
// Los botones de texto (sin etiqueta de accesibilidad): se buscan por el texto que llevan
const pressText = async (root: ReactTestInstance, text: string) => {
  const target = root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((t) => t.props.children === text));
  if (!target) throw new Error(`No hay botón con el texto «${text}»`);
  await act(async () => {
    target.props.onPress();
  });
};
const monthProps = (root: ReactTestInstance, month: number) => root.findAll((n) => n.props.marks !== undefined && n.props.month === month)[0].props;

beforeEach(async () => {
  mockWindow = { width: 800, height: 1000, scale: 2, fontScale: 1 };
  useAgendaTasksStore.setState({ tasksByDate: {}, linesStatus: {} });
  useRepeatingTasksStore.setState({ repeatingPatterns: [], repeatingTaskCompletions: {} });
  useTaskTypesStore.setState({ types: [], activeFilter: "all" });
  useBookNavigationStore.setState({ target: null });
  useAgendaSectionStore.setState({ yearFocus: null, landscapeYear: false });
  mockCanRotate = true;

  await agenda().addTask("2026-03-02", 3, "Suelta");
  await agenda().addTask("2026-03-02", 1, "Semanal");
  const weekly = agenda().getTaskForLine("2026-03-02", 1)!;
  repeating().addRepeatingPattern({ originalTaskId: weekly.id, repeatOption: "weekly", startDate: "2026-03-02" });
  await agenda().addTask("2026-09-01", 1, "De septiembre");
});

// Cuántos lunes hay tras el 2 de marzo de 2026 dentro de ese año (las ocurrencias semanales)
const weeklyOccurrences = (() => {
  let total = 0;
  for (let date = Date.UTC(2026, 2, 9); new Date(date).getUTCFullYear() === 2026; date += 7 * 86400000) total++;
  return total;
})();

describe("al abrir", () => {
  it("empieza en el año actual, con su título y los doce meses", async () => {
    const root = await renderYear();
    expect(has(root, "2026")).toBe(true);
    expect(has(root, 'yearView.titleYear{"year":2026}')).toBe(true);

    for (const name of MONTH_NAMES) expect(button(root, `${name} 2026`)).toBeDefined();
    expect(root.findAll((n) => n.props.marks !== undefined && n.props.month !== undefined).map((n) => n.props.month)).toEqual(
      expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    );
  });

  it("el año entero lista los días con tareas propias, y las series aparte", async () => {
    const root = await renderYear();

    expect(has(root, "Lun. 2 Mar.")).toBe(true);
    expect(has(root, "Mar. 1 Sep.")).toBe(true);
    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "De septiembre")).toBe(true);

    // "Semanal" sale dos veces: el día que se creó y en el apartado de series (no una vez por semana)
    expect(count(root, "Semanal")).toBe(2);
    expect(has(root, "yearView.repeatsTitle")).toBe(true);
    // La regla y el número de veces son dos textos seguidos en la misma línea
    expect(has(root, "taskRepeat.weekly · ")).toBe(true);
    expect(has(root, `yearView.occurrences{"count":${weeklyOccurrences}}`)).toBe(true);
  });

  it("enseña cuántas tareas hay, cuántas están hechas y cuántas faltan", async () => {
    const root = await renderYear();
    expect(has(root, 'yearView.summaryTotal{"total":3}')).toBe(true);
    expect(has(root, 'yearView.summaryDone{"done":0}')).toBe(true);
    expect(has(root, 'yearView.summaryPending{"pending":3}')).toBe(true);
  });

  it("sin ninguna tarea, dice que no hay", async () => {
    useAgendaTasksStore.setState({ tasksByDate: {} });
    useRepeatingTasksStore.setState({ repeatingPatterns: [] });
    const root = await renderYear();
    expect(has(root, "yearView.empty")).toBe(true);
  });

  it("marca el día de hoy solo en su mes, y los días con tareas en el suyo", async () => {
    const root = await renderYear();
    expect(monthProps(root, 9).today).toBe("2026-09-20");
    expect(monthProps(root, 3).today).toBeNull();
    expect(monthProps(root, 9).marks["2026-09-01"]).toBe("pending");
    expect(monthProps(root, 3).marks["2026-03-02"]).toBe("pending");
    expect(monthProps(root, 3).marks["2026-03-09"]).toBe("pending"); // una ocurrencia de la serie semanal
    expect(monthProps(root, 2).marks).toEqual({});
  });
});

describe("elegir un día, un mes o el año", () => {
  it("pulsar un día enseña solo lo de ese día, con las ocurrencias de las series", async () => {
    const root = await renderYear();
    await press(root, "9 Marzo 2026");

    expect(has(root, 'yearView.titleDay{"date":"Lun. 9 Mar."}')).toBe(true);
    expect(has(root, "Semanal")).toBe(true);
    expect(has(root, "Suelta")).toBe(false);
    expect(has(root, "yearView.repeatsTitle")).toBe(false);
    expect(has(root, "yearView.showYear")).toBe(true);
    expect(has(root, "yearView.openInBook")).toBe(true);
  });

  it("el día elegido se marca en su mes y no en los demás", async () => {
    const root = await renderYear();
    await press(root, "9 Marzo 2026");

    expect(monthProps(root, 3).selectedDay).toBe("2026-03-09");
    expect(monthProps(root, 3).highlighted).toBe(true);
    for (const month of [1, 2, 4, 9, 12]) {
      expect(monthProps(root, month).selectedDay).toBeNull();
      expect(monthProps(root, month).highlighted).toBe(false);
    }
  });

  it("un día sin tareas dice que no hay", async () => {
    const root = await renderYear();
    await press(root, "15 Febrero 2026");
    expect(has(root, "yearView.empty")).toBe(true);
  });

  it("pulsar un mes lista todo ese mes, ocurrencias incluidas", async () => {
    const root = await renderYear();
    await press(root, "Marzo 2026");

    expect(has(root, 'yearView.titleMonth{"month":"Marzo","year":2026}')).toBe(true);
    // El 2, el 9, el 16, el 23 y el 30 de marzo
    expect(count(root, "Semanal")).toBe(5);
    expect(count(root, "Suelta")).toBe(1);
    expect(has(root, "De septiembre")).toBe(false);
    expect(monthProps(root, 3).highlighted).toBe(true);
    expect(monthProps(root, 3).selectedDay).toBeNull();
  });

  it("«Ver todo el año» y pulsar el año devuelven a la lista del año entero", async () => {
    const root = await renderYear();
    await press(root, "9 Marzo 2026");
    await pressText(root, "yearView.showYear");
    expect(has(root, 'yearView.titleYear{"year":2026}')).toBe(true);

    await press(root, "Marzo 2026");
    await press(root, 'yearView.titleYear{"year":2026}');
    expect(has(root, 'yearView.titleYear{"year":2026}')).toBe(true);
    expect(has(root, "yearView.showYear")).toBe(false);
  });
});

describe("cambiar de año", () => {
  it("las flechas cambian de año y vuelven a la lista del año entero", async () => {
    const root = await renderYear();
    await press(root, "9 Marzo 2026");
    await press(root, "yearView.prevYear");

    expect(has(root, "2025")).toBe(true);
    expect(has(root, 'yearView.titleYear{"year":2025}')).toBe(true);
    expect(has(root, "yearView.empty")).toBe(true);
    expect(button(root, "Marzo 2025")).toBeDefined();

    await press(root, "yearView.nextYear");
    await press(root, "yearView.nextYear");
    expect(has(root, "2027")).toBe(true);
  });

  it("en otro año las series que siguen activas se ven, con sus ocurrencias de ese año", async () => {
    const root = await renderYear();
    await press(root, "yearView.nextYear");
    expect(has(root, "yearView.repeatsTitle")).toBe(true);
    expect(has(root, "Semanal")).toBe(true);
    expect(has(root, "Suelta")).toBe(false);
  });

  it("«Hoy» vuelve al año actual y elige el día de hoy", async () => {
    const root = await renderYear();
    await press(root, "yearView.nextYear");
    await pressText(root, "yearView.today");

    expect(has(root, "2026")).toBe(true);
    expect(has(root, 'yearView.titleDay{"date":"Dom. 20 Sep."}')).toBe(true);
    expect(monthProps(root, 9).selectedDay).toBe("2026-09-20");
  });
});

describe("recordar dónde se estaba", () => {
  it("al volver del libro, la vista sigue en el día que se estaba mirando", async () => {
    const first = await renderYear();
    await press(first, "9 Marzo 2026");
    await act(async () => {
      mounted.pop()!.unmount(); // se va al libro: la vista de año se desmonta
    });

    const back = await renderYear();
    expect(has(back, 'yearView.titleDay{"date":"Lun. 9 Mar."}')).toBe(true);
    expect(monthProps(back, 3).selectedDay).toBe("2026-03-09");
  });

  it("y en el año que se estaba viendo, no en el actual", async () => {
    const first = await renderYear();
    await press(first, "yearView.nextYear");
    await press(first, "yearView.nextYear");
    await act(async () => {
      mounted.pop()!.unmount();
    });

    const back = await renderYear();
    expect(has(back, "2028")).toBe(true);
    expect(has(back, 'yearView.titleYear{"year":2028}')).toBe(true);
  });

  it("también un mes elegido", async () => {
    const first = await renderYear();
    await press(first, "Marzo 2026");
    await act(async () => {
      mounted.pop()!.unmount();
    });

    const back = await renderYear();
    expect(has(back, 'yearView.titleMonth{"month":"Marzo","year":2026}')).toBe(true);
  });

  it("la primera vez que se abre, empieza en el año actual con el año entero", async () => {
    const root = await renderYear();
    expect(has(root, 'yearView.titleYear{"year":2026}')).toBe(true);
    expect(useAgendaSectionStore.getState().yearFocus).toEqual({ year: 2026, scope: { kind: "year" } });
  });

  it("«Hoy» también se recuerda", async () => {
    const first = await renderYear();
    await press(first, "yearView.nextYear");
    await pressText(first, "yearView.today");
    await act(async () => {
      mounted.pop()!.unmount();
    });

    const back = await renderYear();
    expect(has(back, 'yearView.titleDay{"date":"Dom. 20 Sep."}')).toBe(true);
  });
});

describe("botón de horizontal", () => {
  const rotateButton = (root: ReactTestInstance) =>
    root.findAllByType(TouchableOpacity).filter((n) => /^yearView\.(landscape|portrait)Label$/.test(n.props.accessibilityLabel ?? ""));

  it("sale donde se puede girar la pantalla, con «Horizontal» y sin marcar", async () => {
    const root = await renderYear();
    const [button] = rotateButton(root);
    expect(button.props.accessibilityLabel).toBe("yearView.landscapeLabel");
    expect(button.props.accessibilityState.selected).toBe(false);
    expect(has(root, "yearView.landscape")).toBe(true);
    expect(has(root, "yearView.portrait")).toBe(false);
  });

  it("no sale si no se puede girar (iPhone, o un binario sin el módulo nativo)", async () => {
    mockCanRotate = false;
    const root = await renderYear();
    expect(rotateButton(root)).toHaveLength(0);
    // Y el resto de la cabecera sigue ahí
    expect(button(root, "yearView.prevYear")).toBeDefined();
    expect(has(root, "yearView.today")).toBe(true);
  });

  it("pulsarlo pide el horizontal y el botón pasa a ofrecer «Vertical»", async () => {
    const root = await renderYear();
    await press(root, "yearView.landscapeLabel");

    expect(useAgendaSectionStore.getState().landscapeYear).toBe(true);
    const [button] = rotateButton(root);
    expect(button.props.accessibilityLabel).toBe("yearView.portraitLabel");
    expect(button.props.accessibilityState.selected).toBe(true);
    expect(has(root, "yearView.portrait")).toBe(true);
    expect(has(root, "yearView.landscape")).toBe(false);
  });

  it("pulsarlo otra vez vuelve a vertical, sin salir del año", async () => {
    const root = await renderYear();
    await press(root, "yearView.landscapeLabel");
    await press(root, "yearView.portraitLabel");

    expect(useAgendaSectionStore.getState().landscapeYear).toBe(false);
    expect(rotateButton(root)[0].props.accessibilityLabel).toBe("yearView.landscapeLabel");
    expect(has(root, 'yearView.titleYear{"year":2026}')).toBe(true);
  });

  it("al volver a la vista de año se encuentra como se dejó (horizontal pedido)", async () => {
    const first = await renderYear();
    await press(first, "yearView.landscapeLabel");
    await act(async () => {
      mounted.pop()!.unmount();
    });

    const back = await renderYear();
    expect(rotateButton(back)[0].props.accessibilityLabel).toBe("yearView.portraitLabel");
  });

  it("no toca lo que se está viendo: mismo año, mismo ámbito y las mismas tareas", async () => {
    const root = await renderYear();
    await press(root, "9 Marzo 2026");
    await press(root, "yearView.landscapeLabel");

    expect(has(root, 'yearView.titleDay{"date":"Lun. 9 Mar."}')).toBe(true);
    expect(monthProps(root, 3).selectedDay).toBe("2026-03-09");
  });
});

describe("marcar tareas", () => {
  it("la casilla de una tarea propia la marca en su línea, y se ve marcada", async () => {
    const root = await renderYear();
    await press(root, "9 Marzo 2026"); // día sin tareas propias: prueba con una propia en su día
    await press(root, "2 Marzo 2026");

    const checkboxes = root.findAllByType(TouchableOpacity).filter((n) => n.props.accessibilityRole === "checkbox");
    expect(checkboxes).toHaveLength(2);
    await act(async () => {
      checkboxes[1].props.onPress(); // línea 3: "Suelta"
    });

    expect(agenda().getTaskForLine("2026-03-02", 3)?.completed).toBe(true);
    expect(root.findAllByType(TouchableOpacity).filter((n) => n.props.accessibilityRole === "checkbox").map((n) => n.props.accessibilityState.checked)).toEqual([false, true]);
    expect(has(root, 'yearView.summaryTotal{"total":2}')).toBe(true);
    expect(has(root, 'yearView.summaryDone{"done":1}')).toBe(true);
    expect(has(root, 'yearView.summaryPending{"pending":1}')).toBe(true);
  });

  it("la casilla de una ocurrencia repetida la marca solo ese día", async () => {
    const root = await renderYear();
    const weekly = agenda().getTaskForLine("2026-03-02", 1)!;
    await press(root, "9 Marzo 2026");

    await act(async () => {
      root.findAllByType(TouchableOpacity).find((n) => n.props.accessibilityRole === "checkbox")!.props.onPress();
    });

    expect(repeating().isRepeatingTaskCompleted(weekly.id, "2026-03-09")).toBe(true);
    expect(repeating().isRepeatingTaskCompleted(weekly.id, "2026-03-16")).toBe(false);
    // El calendario lo refleja: ese día pasa a "hecho"
    expect(monthProps(root, 3).marks["2026-03-09"]).toBe("done");
    expect(monthProps(root, 3).marks["2026-03-16"]).toBe("pending");
  });
});

describe("abrir en el libro", () => {
  // El modal que se abre en el sitio, con el borrador que trae la tarea
  const editor = (root: ReactTestInstance) => root.findAll((n) => typeof n.props.onSave === "function" && "initialText" in n.props)[0];

  it("pulsar una tarea la edita aquí mismo, sin llevar al libro", async () => {
    const root = await renderYear();
    await press(root, "2 Marzo 2026");
    await pressText(root, "Suelta");

    expect(editor(root).props).toMatchObject({ visible: true, initialText: "Suelta", date: "2026-03-02", lineNumber: 3 });
    expect(useBookNavigationStore.getState().target).toBeNull();
  });

  it("pulsar una ocurrencia repetida abre la de ese día", async () => {
    const root = await renderYear();
    await press(root, "16 Marzo 2026");
    await pressText(root, "Semanal");

    expect(editor(root).props).toMatchObject({ visible: true, initialText: "Semanal", date: "2026-03-16" });
    expect(useBookNavigationStore.getState().target).toBeNull();
  });

  it("cancelar cierra el editor y la vista sigue donde estaba", async () => {
    const root = await renderYear();
    await press(root, "2 Marzo 2026");
    await pressText(root, "Suelta");
    await act(async () => {
      editor(root).props.onCancel();
    });

    expect(editor(root)).toBeUndefined();
  });

  it("«Abrir en el libro» en un día pide solo ese día", async () => {
    const root = await renderYear();
    await press(root, "2 Marzo 2026");
    await pressText(root, "yearView.openInBook");

    expect(useBookNavigationStore.getState().target).toMatchObject({ date: "2026-03-02", taskId: "" });
  });

  it("pulsar una serie edita su primera ocurrencia del año", async () => {
    const root = await renderYear();
    const seriesRow = root.findAllByType(TouchableOpacity).find((n) => n.findAllByType(Text).some((t) => String(t.props.children).includes("taskRepeat.weekly")))!;
    await act(async () => {
      seriesRow.props.onPress();
    });

    expect(editor(root).props).toMatchObject({ visible: true, date: "2026-03-09" });
  });
});

describe("filtro por tipo (las pestañas de arriba)", () => {
  beforeEach(() => {
    useTaskTypesStore.getState().addType("Trabajo");
    useTaskTypesStore.getState().addType("Casa");
    const [work, home] = useTaskTypesStore.getState().types;
    const day = agenda().tasksByDate["2026-03-02"];
    agenda().updateTask("2026-03-02", 3, { typeId: work.id });
    agenda().updateTask("2026-03-02", 1, { typeId: home.id });
    expect(day).toBeDefined();
  });

  it("solo aparecen las tareas del tipo activo, en la lista y en las marcas", async () => {
    const [work] = useTaskTypesStore.getState().types;
    useTaskTypesStore.getState().setActiveFilter(work.id);
    const root = await renderYear();

    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "Semanal")).toBe(false);
    expect(has(root, "De septiembre")).toBe(false); // sin tipo
    expect(has(root, "yearView.repeatsTitle")).toBe(false);
    expect(monthProps(root, 3).marks["2026-03-02"]).toBe("pending");
    expect(monthProps(root, 3).marks["2026-03-09"]).toBeUndefined(); // la serie es de otro tipo
    expect(monthProps(root, 9).marks).toEqual({});
  });

  it("con «Todas» sale todo", async () => {
    const root = await renderYear();
    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "Semanal")).toBe(true);
    expect(has(root, "De septiembre")).toBe(true);
  });

  it("cambiar de pestaña con la vista abierta la actualiza", async () => {
    const [work, home] = useTaskTypesStore.getState().types;
    const root = await renderYear();
    await act(async () => useTaskTypesStore.getState().setActiveFilter(home.id));
    expect(has(root, "Suelta")).toBe(false);
    expect(has(root, "yearView.repeatsTitle")).toBe(true);

    await act(async () => useTaskTypesStore.getState().setActiveFilter(work.id));
    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "yearView.repeatsTitle")).toBe(false);
  });

  it("las tareas con tipo llevan la franja de su color", async () => {
    const [work] = useTaskTypesStore.getState().types;
    const root = await renderYear();
    await press(root, "2 Marzo 2026");
    const row = root.findAll((n) => Array.isArray(n.props.style) && JSON.stringify(n.props.style).includes(work.color) && JSON.stringify(n.props.style).includes("borderLeftWidth"));
    expect(row.length).toBeGreaterThan(0);
  });
});

describe("distribución", () => {
  it("en pantalla ancha son dos páginas con el lomo de aros en medio", async () => {
    const root = await renderYear({ width: 800, height: 1000 });
    await act(async () => {
      root.findAll((n) => n.props.style && JSON.stringify(n.props.style).includes('"flexDirection":"row"') && typeof n.props.onLayout === "function" && n.props.accessibilityLabel === undefined)
        .forEach((n) => n.props.onLayout({ nativeEvent: { layout: { width: 800, height: 700 } } }));
    });
    expect(root.findAll((n) => n.props.testID === "spine").length).toBeGreaterThan(0);
  });

  it("en pantalla ancha, dos columnas de meses hasta 900 y tres a partir de ahí", async () => {
    const narrow = await renderYear({ width: 800, height: 1000 });
    const monthWidthNarrow = monthProps(narrow, 1).metrics.cellWidth;
    await act(async () => {
      mounted.pop()!.unmount();
    });
    const wide = await renderYear({ width: 1200, height: 1000 });
    // Con tres columnas en vez de dos, cada mes es más estrecho aunque la página sea más ancha
    expect(monthProps(wide, 1).metrics.cellWidth).toBeLessThan(monthWidthNarrow * 1.6);
    expect(monthProps(wide, 1).metrics.cellWidth).toBeGreaterThan(0);
  });

  it("en el móvil van apiladas y no hay lomo", async () => {
    const root = await renderYear({ width: 360, height: 640 });
    expect(root.findAll((n) => n.props.testID === "spine")).toHaveLength(0);
    // Y sigue habiendo calendario y lista
    expect(button(root, "Marzo 2026")).toBeDefined();
    expect(has(root, "Suelta")).toBe(true);
  });

  it("el móvil usa meses compactos y la tablet días más grandes", async () => {
    const phone = await renderYear({ width: 360, height: 640 });
    const phoneCell = monthProps(phone, 1).metrics.cellHeight;
    await act(async () => {
      mounted.pop()!.unmount();
    });
    const tablet = await renderYear({ width: 1000, height: 800 });
    expect(monthProps(tablet, 1).metrics.cellHeight).toBeGreaterThanOrEqual(phoneCell);
  });
});

describe("filtrar por hechas y faltantes", () => {
  const DONE = 'yearView.summaryDone{"done":1}';
  const PENDING = 'yearView.summaryPending{"pending":1}';
  const TOTAL = 'yearView.summaryTotal{"total":2}';

  const summaryButton = (root: ReactTestInstance, text: string) =>
    root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((t) => t.props.children === text))!;
  const isSelected = (root: ReactTestInstance, text: string) => summaryButton(root, text).props.accessibilityState.selected;
  const checkboxes = (root: ReactTestInstance) => root.findAllByType(TouchableOpacity).filter((n) => n.props.accessibilityRole === "checkbox");

  // El 2 de marzo tiene dos tareas: "Suelta" hecha y "Semanal" por hacer
  async function openMixedDay() {
    const root = await renderYear();
    await press(root, "2 Marzo 2026");
    await act(async () => {
      checkboxes(root)[1].props.onPress();
    });
    expect(has(root, DONE)).toBe(true);
    return root;
  }

  it("«Hechas» deja solo las hechas, y los números no cambian", async () => {
    const root = await openMixedDay();
    await pressText(root, DONE);

    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "Semanal")).toBe(false);
    expect(has(root, 'yearView.summaryTotal{"total":2}')).toBe(true);
    expect(has(root, DONE)).toBe(true);
    expect(has(root, PENDING)).toBe(true);
    expect(isSelected(root, DONE)).toBe(true);
    expect(isSelected(root, PENDING)).toBe(false);
  });

  it("«Faltantes» deja solo las que faltan", async () => {
    const root = await openMixedDay();
    await pressText(root, PENDING);

    expect(has(root, "Semanal")).toBe(true);
    expect(has(root, "Suelta")).toBe(false);
    expect(isSelected(root, PENDING)).toBe(true);
    expect(isSelected(root, DONE)).toBe(false);
  });

  it("volver a tocar el filtro lo quita", async () => {
    const root = await openMixedDay();
    await pressText(root, DONE);
    await pressText(root, DONE);

    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "Semanal")).toBe(true);
    expect(isSelected(root, DONE)).toBe(false);
  });

  it("«Tareas» quita el filtro y enseña hechas y faltantes juntas", async () => {
    const root = await openMixedDay();
    expect(isSelected(root, TOTAL)).toBe(true); // sin filtro, «Tareas» es lo marcado

    await pressText(root, DONE);
    expect(has(root, "Semanal")).toBe(false);
    expect(isSelected(root, TOTAL)).toBe(false);

    await pressText(root, TOTAL);
    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "Semanal")).toBe(true);
    expect(isSelected(root, TOTAL)).toBe(true);
    expect(isSelected(root, DONE)).toBe(false);

    await pressText(root, PENDING);
    expect(has(root, "Suelta")).toBe(false);
    await pressText(root, TOTAL);
    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "Semanal")).toBe(true);
    expect(isSelected(root, PENDING)).toBe(false);
  });

  it("tocar «Tareas» sin filtro no cambia nada", async () => {
    const root = await openMixedDay();
    await pressText(root, TOTAL);

    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "Semanal")).toBe(true);
    expect(isSelected(root, TOTAL)).toBe(true);
  });

  it("desde una lista vacía por el filtro, «Tareas» devuelve las tareas", async () => {
    const root = await renderYear(); // ninguna hecha todavía
    await pressText(root, 'yearView.summaryDone{"done":0}');
    expect(has(root, "yearView.emptyFiltered")).toBe(true);

    await pressText(root, 'yearView.summaryTotal{"total":3}');
    expect(has(root, "yearView.emptyFiltered")).toBe(false);
    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "De septiembre")).toBe(true);
  });

  it("pasar de un filtro al otro cambia la lista sin quitarlo antes", async () => {
    const root = await openMixedDay();
    await pressText(root, DONE);
    await pressText(root, PENDING);

    expect(has(root, "Semanal")).toBe(true);
    expect(has(root, "Suelta")).toBe(false);
    expect(isSelected(root, PENDING)).toBe(true);
    expect(isSelected(root, DONE)).toBe(false);
  });

  it("marcar una tarea con «Faltantes» activo la saca de la lista", async () => {
    const root = await openMixedDay();
    await pressText(root, PENDING);
    expect(checkboxes(root)).toHaveLength(1);

    await act(async () => {
      checkboxes(root)[0].props.onPress(); // "Semanal"
    });

    expect(has(root, "Semanal")).toBe(false);
    expect(has(root, "yearView.emptyFiltered")).toBe(true);
    expect(has(root, 'yearView.summaryDone{"done":2}')).toBe(true);
    expect(has(root, 'yearView.summaryPending{"pending":0}')).toBe(true);
  });

  it("si no hay ninguna de esa clase, no dice que no hay tareas", async () => {
    const root = await renderYear(); // ninguna hecha todavía
    await pressText(root, 'yearView.summaryDone{"done":0}');

    expect(has(root, "yearView.emptyFiltered")).toBe(true);
    expect(has(root, "yearView.empty")).toBe(false);
    expect(has(root, 'yearView.summaryTotal{"total":3}')).toBe(true);
  });

  it("en el año, con un filtro puesto se ocultan las series, que no tienen estado propio", async () => {
    const root = await renderYear();
    expect(has(root, "yearView.repeatsTitle")).toBe(true);

    await pressText(root, 'yearView.summaryPending{"pending":3}');
    expect(has(root, "yearView.repeatsTitle")).toBe(false);
    expect(has(root, "Suelta")).toBe(true);
    expect(has(root, "De septiembre")).toBe(true);

    await pressText(root, 'yearView.summaryPending{"pending":3}');
    expect(has(root, "yearView.repeatsTitle")).toBe(true);
  });
});

describe("reparto en horizontal", () => {
  beforeEach(() => {
    useYearSplitStore.setState({ calendarShare: null, stackedShare: null });
  });

  const flat = (node: ReactTestInstance) => StyleSheet.flatten(node.props.style) as Record<string, number | undefined>;
  const calendarPage = (root: ReactTestInstance) => root.findAll((n) => n.props.testID === "year-calendar-page")[0];
  const handle = (root: ReactTestInstance) => root.findAll((n) => n.props.testID === "year-split-handle")[0];
  const measureSpread = async (root: ReactTestInstance, width: number, height: number) => {
    const spread = root.findAll((n) => n.props.testID === "year-spread" && typeof n.props.onLayout === "function")[0];
    await act(async () => {
      spread.props.onLayout({ nativeEvent: { layout: { width, height } } });
    });
  };

  // Un móvil en horizontal: lomo compacto (8 + 2 de aire a cada lado) y argollas chicas
  const phone = { width: 900, height: 400 };
  const phoneSplit = (share: number) =>
    getSideSplit({ spreadWidth: phone.width, padding: 8, share, seamGap: COMPACT_SPINE_WIDTH + 4, ringWidth: COMPACT_RING_WIDTH });

  it("el asa no sale hasta que se ha medido el contenedor", async () => {
    const root = await renderYear(phone);
    expect(handle(root)).toBeUndefined();
    await measureSpread(root, phone.width, phone.height - 100);
    expect(handle(root)).toBeDefined();
  });

  it("en un móvil en horizontal el calendario tiene un ancho explícito, no una fracción de flex", async () => {
    const root = await renderYear(phone);
    await measureSpread(root, phone.width, phone.height - 100);

    const style = flat(calendarPage(root));
    expect(style.width).toBeCloseTo(phoneSplit(1 / 3).calendarWidth, 6);
    expect(style.flex).toBeUndefined();
  });

  it("el asa va pegada a las argollas, dentro del hueco entre las dos páginas", async () => {
    const root = await renderYear(phone);
    await measureSpread(root, phone.width, phone.height - 100);

    const split = phoneSplit(1 / 3);
    const style = flat(handle(root));
    expect(style.left).toBeCloseTo(split.handleLeft, 6);
    expect(style.width).toBe(SIDE_HANDLE_WIDTH);
    // A la derecha de las argollas y no dentro del calendario, que era donde salía
    expect(style.left!).toBeGreaterThanOrEqual(split.spineCenter + COMPACT_RING_WIDTH / 2);
    expect(style.left!).toBeGreaterThan(8 + flat(calendarPage(root)).width!);
  });

  it("en una tablet el reparto es la mitad y el asa también va junto a las argollas", async () => {
    const tablet = { width: 1200, height: 800 };
    const root = await renderYear(tablet);
    await measureSpread(root, tablet.width, tablet.height - 100);

    const split = getSideSplit({ spreadWidth: tablet.width, padding: 8, share: 0.5, seamGap: SPINE_WIDTH, ringWidth: RING_WIDTH });
    expect(flat(calendarPage(root)).width).toBeCloseTo(split.calendarWidth, 6);
    expect(flat(handle(root)).left).toBeCloseTo(split.handleLeft, 6);
    expect(split.handleLeft).toBeGreaterThanOrEqual(split.spineCenter + RING_WIDTH / 2);
  });

  it("respeta el reparto que eligió el usuario", async () => {
    useYearSplitStore.setState({ calendarShare: 0.5 });
    const root = await renderYear(phone);
    await measureSpread(root, phone.width, phone.height - 100);

    expect(flat(calendarPage(root)).width).toBeCloseTo(phoneSplit(0.5).calendarWidth, 6);
    expect(flat(handle(root)).left).toBeCloseTo(phoneSplit(0.5).handleLeft, 6);
  });
});
