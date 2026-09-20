/**
 * El libro alterna entre la agenda y el tablero de notas sin desmontarse (sus hooks de recordatorios,
 * migración de fechas y widget tienen que seguir vivos). Se renderiza con sus piezas pesadas
 * simuladas para comprobar solo esa lógica: qué se enseña, que en Notas no actúe el gesto de pasar
 * página, y que una notificación te saque de las notas para abrir la tarea.
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
jest.mock("react-native-reanimated", () => ({ useSharedValue: (value: unknown) => ({ value }) }));

// Hooks con efectos de fondo: solo interesa saber que se siguen ejecutando
const mockBackgroundHooks = { notifications: jest.fn(), widget: jest.fn(), migration: jest.fn() };
jest.mock("../hooks/use-repeated-task-notifications", () => ({
  useRepeatedTaskNotifications: () => mockBackgroundHooks.notifications(),
}));
jest.mock("../hooks/use-widget-sync", () => ({ useWidgetSync: () => mockBackgroundHooks.widget() }));
jest.mock("../hooks/use-date-migration", () => ({
  useDateMigration: () => mockBackgroundHooks.migration(),
  useForceDateMigration: () => ({ forceMigration: jest.fn() }),
}));

const mockGoToPage = jest.fn();
const mockPanHandlers = { onMoveShouldSetResponder: () => true };
// La pantalla que se fuerza o se devuelve: aquí solo interesa cuándo se pide una cosa u otra
const mockForce = jest.fn(async () => true);
const mockRestore = jest.fn(async () => undefined);
jest.mock("../services/screen-orientation", () => ({
  forceLandscape: () => mockForce(),
  restoreOrientation: () => mockRestore(),
  isLandscapeLockAvailable: () => true,
}));

jest.mock("../components/agendaComponents/bookFragments", () => {
  const React = require("react");
  const { View } = require("react-native");
  const stub = (testID: string) => () => React.createElement(View, { testID });
  return {
    BookPagesContent: stub("pages"),
    BookSpread: stub("spread"),
    calculateDays: () => [],
    NavigationControls: stub("navigation"),
    PageTurn: ({ children }: { children: unknown }) => React.createElement(View, { testID: "page-turn" }, children),
    useBookPageLogic: () => ({
      currentPageIndex: 0,
      isFlipping: false,
      turn: null,
      endTurn: jest.fn(),
      goToNextPage: jest.fn(),
      goToPrevPage: jest.fn(),
      goToPage: mockGoToPage,
      goToToday: jest.fn(),
      panResponder: { panHandlers: mockPanHandlers },
      getTranslateX: () => 0,
    }),
  };
});
jest.mock("../components/agendaComponents/bookSettings", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: () => React.createElement(View, { testID: "book-actions" }) };
});
jest.mock("../components/agendaComponents/notes/NotesBoard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: () => React.createElement(View, { testID: "notes-board" }) };
});
jest.mock("../components/agendaComponents/yearView/YearView", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: () => React.createElement(View, { testID: "year-view" }) };
});
jest.mock("../components/agendaComponents/typeTabs/TypeTabs", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: () => React.createElement(View, { testID: "type-tabs" }) };
});

import React from "react";
import TestRenderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import Book from "../components/agendaComponents/book";
import useAgendaSectionStore from "../stores/agenda-section-store";
import useBookNavigationStore from "../stores/book-navigation-store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const has = (root: ReactTestInstance, testID: string) => root.findAll((node) => node.props.testID === testID).length > 0;
// El contenedor del libro es el que recibe (o no) los gestos de pasar página
const hasSwipeHandlers = (root: ReactTestInstance) =>
  root.findAll((node) => node.props.onMoveShouldSetResponder === mockPanHandlers.onMoveShouldSetResponder).length > 0;

let renderer: ReactTestRenderer | null = null;
async function renderBook() {
  await act(async () => {
    renderer = TestRenderer.create(<Book />);
  });
  return renderer!.root;
}

beforeEach(() => {
  jest.clearAllMocks();
  useAgendaSectionStore.setState({ section: "agenda", agendaView: "book", landscapeYear: false });
  mockForce.mockImplementation(async () => true);
  useBookNavigationStore.setState({ target: null });
});

afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
    renderer = null;
  });
});

describe("Book: agenda o notas", () => {
  it("en la agenda enseña el libro y sus controles, y no las notas", async () => {
    const root = await renderBook();
    expect(has(root, "type-tabs")).toBe(true);
    expect(has(root, "page-turn")).toBe(true);
    expect(has(root, "pages")).toBe(true);
    expect(has(root, "navigation")).toBe(true);
    expect(has(root, "book-actions")).toBe(true);
    expect(has(root, "notes-board")).toBe(false);
  });

  it("en la agenda el gesto de pasar página está activo", async () => {
    expect(hasSwipeHandlers(await renderBook())).toBe(true);
  });

  it("en notas enseña el tablero en lugar del libro, y la tira de pestañas sigue ahí", async () => {
    useAgendaSectionStore.setState({ section: "notes" });
    const root = await renderBook();
    expect(has(root, "notes-board")).toBe(true);
    expect(has(root, "type-tabs")).toBe(true);
    expect(has(root, "page-turn")).toBe(false);
    expect(has(root, "navigation")).toBe(false);
    expect(has(root, "book-actions")).toBe(false);
  });

  it("en notas el gesto de pasar página NO actúa (deslizar en el tablero no cambia de día)", async () => {
    useAgendaSectionStore.setState({ section: "notes" });
    expect(hasSwipeHandlers(await renderBook())).toBe(false);
  });

  it("cambiar de sección en marcha alterna el contenido en el mismo libro", async () => {
    const root = await renderBook();
    await act(async () => useAgendaSectionStore.getState().showNotes());
    expect(has(root, "notes-board")).toBe(true);
    expect(has(root, "page-turn")).toBe(false);

    await act(async () => useAgendaSectionStore.getState().showAgenda());
    expect(has(root, "notes-board")).toBe(false);
    expect(has(root, "page-turn")).toBe(true);
    expect(hasSwipeHandlers(root)).toBe(true);
  });

  it("en la vista de año enseña el año en lugar del libro, con la tira de pestañas encima", async () => {
    useAgendaSectionStore.setState({ section: "agenda", agendaView: "year" });
    const root = await renderBook();
    expect(has(root, "year-view")).toBe(true);
    expect(has(root, "type-tabs")).toBe(true);
    expect(has(root, "page-turn")).toBe(false);
    expect(has(root, "navigation")).toBe(false);
    expect(has(root, "book-actions")).toBe(false);
    expect(has(root, "notes-board")).toBe(false);
  });

  it("en la vista de año el gesto de pasar página NO actúa", async () => {
    useAgendaSectionStore.setState({ section: "agenda", agendaView: "year" });
    expect(hasSwipeHandlers(await renderBook())).toBe(false);
  });

  it("en el libro no se dibuja la vista de año", async () => {
    expect(has(await renderBook(), "year-view")).toBe(false);
  });

  it("las notas mandan sobre la vista: con la vista de año recordada, en notas solo se ve el tablero", async () => {
    useAgendaSectionStore.setState({ section: "notes", agendaView: "year" });
    const root = await renderBook();
    expect(has(root, "notes-board")).toBe(true);
    expect(has(root, "year-view")).toBe(false);
  });

  it("alternar entre libro, año y notas en marcha muestra siempre una sola cosa", async () => {
    const root = await renderBook();
    const visible = () => ["page-turn", "year-view", "notes-board"].filter((id) => has(root, id));

    expect(visible()).toEqual(["page-turn"]);
    await act(async () => useAgendaSectionStore.getState().showYear());
    expect(visible()).toEqual(["year-view"]);
    await act(async () => useAgendaSectionStore.getState().showNotes());
    expect(visible()).toEqual(["notes-board"]);
    await act(async () => useAgendaSectionStore.getState().showAgenda()); // vuelve al año
    expect(visible()).toEqual(["year-view"]);
    await act(async () => useAgendaSectionStore.getState().showBook());
    expect(visible()).toEqual(["page-turn"]);
  });

  it("los hooks de fondo (repetidas, widget, migración) siguen ejecutándose en las notas", async () => {
    useAgendaSectionStore.setState({ section: "notes" });
    await renderBook();
    expect(mockBackgroundHooks.notifications).toHaveBeenCalled();
    expect(mockBackgroundHooks.widget).toHaveBeenCalled();
    expect(mockBackgroundHooks.migration).toHaveBeenCalled();
  });
});

describe("Book: petición de mostrar un día (tocar una notificación)", () => {
  it("estando en notas, vuelve a la agenda y lleva el libro a ese día", async () => {
    useAgendaSectionStore.setState({ section: "notes" });
    const root = await renderBook();

    await act(async () => useBookNavigationStore.getState().requestTarget("2026-09-25", "task-1"));

    expect(useAgendaSectionStore.getState().section).toBe("agenda");
    expect(mockGoToPage).toHaveBeenCalledTimes(1);
    expect(has(root, "page-turn")).toBe(true);
    expect(has(root, "notes-board")).toBe(false);
  });

  it("estando en la vista de año, vuelve al libro (la página del día no se ve en el año) y va a ese día", async () => {
    useAgendaSectionStore.setState({ section: "agenda", agendaView: "year" });
    const root = await renderBook();

    await act(async () => useBookNavigationStore.getState().requestTarget("2026-09-25", "task-1"));

    expect(useAgendaSectionStore.getState()).toMatchObject({ section: "agenda", agendaView: "book" });
    expect(mockGoToPage).toHaveBeenCalledTimes(1);
    expect(has(root, "page-turn")).toBe(true);
    expect(has(root, "year-view")).toBe(false);
  });

  it("estando en las notas con la vista de año recordada, la petición lleva al libro (no al año)", async () => {
    useAgendaSectionStore.setState({ section: "notes", agendaView: "year" });
    await renderBook();
    await act(async () => useBookNavigationStore.getState().requestTarget("2026-09-25", "task-1"));
    expect(useAgendaSectionStore.getState()).toMatchObject({ section: "agenda", agendaView: "book" });
  });

  it("estando ya en la agenda, solo lleva el libro al día", async () => {
    await renderBook();
    await act(async () => useBookNavigationStore.getState().requestTarget("2026-09-25", "task-1"));
    expect(useAgendaSectionStore.getState().section).toBe("agenda");
    expect(mockGoToPage).toHaveBeenCalledTimes(1);
  });

  it("una petición ya atendida no vuelve a sacar de las notas", async () => {
    await renderBook();
    await act(async () => useBookNavigationStore.getState().requestTarget("2026-09-25", "task-1"));
    mockGoToPage.mockClear();

    // El usuario va a las notas; la petición sigue en el store porque el libro de la agenda aún no la ha consumido
    await act(async () => useAgendaSectionStore.getState().showNotes());
    expect(useAgendaSectionStore.getState().section).toBe("notes");
    expect(mockGoToPage).not.toHaveBeenCalled();
  });
});

describe("Book: pantalla forzada en horizontal", () => {
  const settle = () => act(async () => undefined);

  it("en el libro, o en el año sin haberlo pedido, no se fuerza nada", async () => {
    await renderBook();
    expect(mockForce).not.toHaveBeenCalled();

    await act(async () => useAgendaSectionStore.getState().showYear());
    expect(mockForce).not.toHaveBeenCalled();
  });

  it("al ver el año habiendo pedido horizontal, se fuerza la pantalla (una vez)", async () => {
    await renderBook();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    expect(mockForce).toHaveBeenCalledTimes(1);
  });

  it("al volver al libro desde el año horizontal, se devuelve la pantalla", async () => {
    await renderBook();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    mockRestore.mockClear();

    await act(async () => useAgendaSectionStore.getState().showBook());
    expect(mockRestore).toHaveBeenCalledTimes(1);
    expect(mockForce).toHaveBeenCalledTimes(1);
  });

  it("al ir a las notas desde el año horizontal, se devuelve la pantalla", async () => {
    await renderBook();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    mockRestore.mockClear();

    await act(async () => useAgendaSectionStore.getState().showNotes());
    expect(mockRestore).toHaveBeenCalledTimes(1);
  });

  it("al volver al año, se vuelve a forzar (lo pedido se recuerda)", async () => {
    await renderBook();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    await act(async () => useAgendaSectionStore.getState().showBook());
    await act(async () => useAgendaSectionStore.getState().showYear());

    expect(mockForce).toHaveBeenCalledTimes(2);
  });

  it("apagarlo con el botón «Vertical» devuelve la pantalla sin salir del año", async () => {
    await renderBook();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    mockRestore.mockClear();

    await act(async () => useAgendaSectionStore.getState().setLandscapeYear(false));
    expect(mockRestore).toHaveBeenCalledTimes(1);
    expect(useAgendaSectionStore.getState().agendaView).toBe("year");
  });

  it("una petición de mostrar un día (notificación) saca del año horizontal y devuelve la pantalla", async () => {
    await renderBook();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    mockRestore.mockClear();

    await act(async () => useBookNavigationStore.getState().requestTarget("2026-09-25", "task-1"));
    expect(useAgendaSectionStore.getState().agendaView).toBe("book");
    expect(mockRestore).toHaveBeenCalledTimes(1);
  });

  it("si el sistema no deja girar, se apaga lo pedido (el botón no puede decir «Vertical» sin estarlo)", async () => {
    mockForce.mockImplementation(async () => false);
    await renderBook();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    await settle();

    expect(useAgendaSectionStore.getState().landscapeYear).toBe(false);
    expect(useAgendaSectionStore.getState().agendaView).toBe("year");
  });

  it("si al fallar el giro ya se había salido del año, no se toca lo pedido", async () => {
    let finish: (ok: boolean) => void = () => undefined;
    mockForce.mockImplementation(() => new Promise<boolean>((resolve) => (finish = resolve)));
    await renderBook();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    await act(async () => useAgendaSectionStore.getState().showBook()); // se sale antes de que responda

    await act(async () => finish(false));
    expect(useAgendaSectionStore.getState().landscapeYear).toBe(true);
  });

  it("al desmontar el libro se devuelve la pantalla", async () => {
    await renderBook();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    mockRestore.mockClear();

    await act(async () => {
      renderer?.unmount();
      renderer = null;
    });
    expect(mockRestore).toHaveBeenCalled();
  });
});
