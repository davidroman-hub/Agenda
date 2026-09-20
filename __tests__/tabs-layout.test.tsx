/**
 * La barra de pestañas de abajo (Agenda, Tareas pasadas, Ajustes…) se oculta cuando el año está forzado
 * en horizontal, para ganar altura, y vuelve al salir. Se renderiza el layout con `Tabs` simulado para
 * ver el estilo que de verdad recibe.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Tabs = ({ children, screenOptions }: { children?: unknown; screenOptions: unknown }) =>
    React.createElement(View, { testID: "tabs", screenOptions }, children);
  Tabs.Screen = () => null;
  return { Tabs };
});
jest.mock("../hooks/use-i18n", () => ({ useI18n: () => ({ tCommon: (key: string) => key }) }));
jest.mock("../components/haptic-tab", () => ({ HapticTab: () => null }));
jest.mock("../components/ui/icon-symbol", () => ({ IconSymbol: () => null }));
jest.mock("../components/ui/notification-icon-with-badge", () => ({ __esModule: true, default: () => null }));

import React from "react";
import TestRenderer, { act, ReactTestRenderer } from "react-test-renderer";
import TabLayout from "../app/(tabs)/_layout";
import useAgendaSectionStore from "../stores/agenda-section-store";
import useLoginStore from "../stores/login-store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let renderer: ReactTestRenderer | null = null;
const tabBarStyle = () =>
  renderer!.root.findAll((node) => node.props.testID === "tabs")[0].props.screenOptions.tabBarStyle;

async function renderTabs() {
  await act(async () => {
    renderer = TestRenderer.create(<TabLayout />);
  });
}

beforeEach(() => {
  // El layout escribe en consola todo el estado de los stores en cada cambio
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  useLoginStore.setState({ isLoggedIn: true });
  useAgendaSectionStore.setState({ section: "agenda", agendaView: "book", landscapeYear: false });
});

afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
    renderer = null;
  });
  jest.restoreAllMocks();
});

describe("barra de pestañas de abajo", () => {
  it("con sesión y en vertical se ve", async () => {
    await renderTabs();
    expect(tabBarStyle()).toBeUndefined();
  });

  it("sin sesión se oculta", async () => {
    useLoginStore.setState({ isLoggedIn: false });
    await renderTabs();
    expect(tabBarStyle()).toEqual({ display: "none" });
  });

  it("con el año forzado en horizontal se oculta, y vuelve al salir", async () => {
    await renderTabs();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    expect(tabBarStyle()).toEqual({ display: "none" });

    await act(async () => useAgendaSectionStore.getState().showBook());
    expect(tabBarStyle()).toBeUndefined();
  });

  it("pedir horizontal sin estar en el año no la oculta", async () => {
    await renderTabs();
    await act(async () => useAgendaSectionStore.getState().setLandscapeYear(true));
    expect(tabBarStyle()).toBeUndefined();
  });

  it("apagar el horizontal desde el año la vuelve a mostrar sin salir del año", async () => {
    await renderTabs();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    await act(async () => useAgendaSectionStore.getState().setLandscapeYear(false));

    expect(tabBarStyle()).toBeUndefined();
    expect(useAgendaSectionStore.getState().agendaView).toBe("year");
  });

  it("las notas no la ocultan, aunque se hubiera pedido horizontal", async () => {
    await renderTabs();
    await act(async () => {
      useAgendaSectionStore.getState().showYear();
      useAgendaSectionStore.getState().setLandscapeYear(true);
    });
    await act(async () => useAgendaSectionStore.getState().showNotes());
    expect(tabBarStyle()).toBeUndefined();
  });
});
