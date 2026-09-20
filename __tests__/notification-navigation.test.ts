jest.mock("expo-router", () => ({ router: { navigate: jest.fn() } }));

import type { NotificationResponse } from "expo-notifications";
import { router } from "expo-router";
import {
  handleNotificationResponse,
  parseNotificationTarget,
  resetLastNotificationTap,
} from "../services/notification-navigation";
import useBookNavigationStore from "../stores/book-navigation-store";

const navigate = router.navigate as jest.Mock;

const response = (data: Record<string, unknown>, identifier = "n1"): NotificationResponse =>
  ({
    actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
    notification: { date: 1, request: { identifier, content: { data }, trigger: null } },
  }) as unknown as NotificationResponse;

const repeatedData = { type: "repeated-task-reminder", originalTaskId: "t1", occurrenceDate: "2026-09-25", signature: "s" };
const normalData = { type: "task-reminder", taskId: "t2", taskDate: "2026-09-20", taskTitle: "x", taskDescription: "y" };

beforeEach(() => {
  navigate.mockReset();
  resetLastNotificationTap();
  useBookNavigationStore.setState({ target: null });
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 20, 12, 0));
});
afterEach(() => {
  jest.useRealTimers();
});

describe("parseNotificationTarget", () => {
  it("aviso de tarea repetida: la tarea original y la fecha de la ocurrencia", () => {
    expect(parseNotificationTarget(repeatedData)).toEqual({ taskId: "t1", date: "2026-09-25" });
  });

  it("recordatorio normal: la tarea y su día", () => {
    expect(parseNotificationTarget(normalData)).toEqual({ taskId: "t2", date: "2026-09-20" });
  });

  it.each([
    ["sin datos", undefined],
    ["datos nulos", null],
    ["otro tipo de notificación", { type: "otra-cosa", taskId: "t", taskDate: "2026-09-20" }],
    ["aviso repetido de la versión antigua (sin fecha de ocurrencia)", { isRepeatedTask: true, taskId: "t1", repeatOption: "daily" }],
    ["fecha con formato inválido", { type: "task-reminder", taskId: "t", taskDate: "20/09/2026" }],
    ["fecha que no es texto", { type: "task-reminder", taskId: "t", taskDate: 20260920 }],
    ["sin id de tarea", { type: "task-reminder", taskDate: "2026-09-20" }],
    ["repetido sin id de la original", { type: "repeated-task-reminder", occurrenceDate: "2026-09-25" }],
  ])("%s: no lleva a ninguna parte", (_name, data) => {
    expect(parseNotificationTarget(data as any)).toBeNull();
  });
});

describe("handleNotificationResponse", () => {
  it("pide al libro el día y la tarea, y vuelve a la agenda", () => {
    expect(handleNotificationResponse(response(repeatedData))).toBe(true);

    expect(useBookNavigationStore.getState().target).toMatchObject({ date: "2026-09-25", taskId: "t1" });
    expect(navigate).toHaveBeenCalledWith("/(tabs)");
  });

  it("funciona igual con un recordatorio normal", () => {
    handleNotificationResponse(response(normalData));

    expect(useBookNavigationStore.getState().target).toMatchObject({ date: "2026-09-20", taskId: "t2" });
  });

  it("una notificación que no es de una tarea no hace nada", () => {
    expect(handleNotificationResponse(response({ type: "otra" }))).toBe(false);

    expect(useBookNavigationStore.getState().target).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("si la navegación aún no está lista (arranque en frío), el destino se guarda igualmente", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    navigate.mockImplementation(() => {
      throw new Error("Attempted to navigate before mounting the Root Layout component");
    });

    expect(handleNotificationResponse(response(repeatedData))).toBe(true);

    expect(useBookNavigationStore.getState().target).toMatchObject({ date: "2026-09-25", taskId: "t1" });
    warn.mockRestore();
  });

  it("el mismo toque recibido dos veces seguidas cuenta como uno", () => {
    expect(handleNotificationResponse(response(repeatedData))).toBe(true);
    expect(handleNotificationResponse(response(repeatedData))).toBe(false);

    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("tocar de nuevo la misma notificación más tarde sí vuelve a llevar a la tarea", () => {
    handleNotificationResponse(response(repeatedData));
    useBookNavigationStore.getState().clearTarget();

    jest.setSystemTime(new Date(2026, 8, 20, 12, 0, 5)); // 5 s después
    expect(handleNotificationResponse(response(repeatedData))).toBe(true);

    expect(useBookNavigationStore.getState().target).toMatchObject({ taskId: "t1" });
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it("notificaciones distintas seguidas no se confunden", () => {
    handleNotificationResponse(response(repeatedData, "n1"));
    expect(handleNotificationResponse(response(normalData, "n2"))).toBe(true);

    expect(useBookNavigationStore.getState().target).toMatchObject({ taskId: "t2" });
  });
});

describe("store de destino del libro", () => {
  it("guarda el destino y se puede consumir", () => {
    useBookNavigationStore.getState().requestTarget("2026-09-25", "t1");
    expect(useBookNavigationStore.getState().target).toMatchObject({ date: "2026-09-25", taskId: "t1" });

    useBookNavigationStore.getState().clearTarget();
    expect(useBookNavigationStore.getState().target).toBeNull();
  });

  it("dos peticiones al mismo destino se distinguen por el momento", () => {
    useBookNavigationStore.getState().requestTarget("2026-09-25", "t1");
    const first = useBookNavigationStore.getState().target!.requestedAt;

    jest.setSystemTime(new Date(2026, 8, 20, 12, 0, 1));
    useBookNavigationStore.getState().requestTarget("2026-09-25", "t1");

    expect(useBookNavigationStore.getState().target!.requestedAt).toBeGreaterThan(first);
  });
});
