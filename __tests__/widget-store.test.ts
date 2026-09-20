const mockSave = jest.fn();
const mockForce = jest.fn();

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: {
    get WidgetDataManager() {
      return { saveWidgetData: mockSave, forceWidgetUpdate: mockForce };
    },
  },
}));

import WidgetStore from "../stores/widget-store";
import type { WidgetPayload } from "../utils/widget-data";

const payload = (total: number): WidgetPayload => ({
  days: { "2026-09-21": { total, completed: 0, tasks: [] } },
});

beforeEach(() => {
  mockSave.mockReset().mockResolvedValue(undefined);
  mockForce.mockReset().mockResolvedValue(undefined);
  // @ts-expect-error: se reinicia el estado interno entre tests
  WidgetStore.lastSent = null;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe("WidgetStore.updateWidgetData", () => {
  it("guarda con la clave que lee el widget y lo repinta", async () => {
    await WidgetStore.updateWidgetData(payload(1));

    expect(mockSave).toHaveBeenCalledWith("widget-days-v2", JSON.stringify(payload(1)));
    expect(mockForce).toHaveBeenCalledTimes(1);
  });

  it("no reenvía si los datos no han cambiado", async () => {
    await WidgetStore.updateWidgetData(payload(1));
    await WidgetStore.updateWidgetData(payload(1));
    await WidgetStore.updateWidgetData(payload(2));

    expect(mockSave).toHaveBeenCalledTimes(2);
  });

  it("si el guardado falla, la siguiente llamada lo reintenta con los mismos datos", async () => {
    mockSave.mockRejectedValueOnce(new Error("fallo"));

    await WidgetStore.updateWidgetData(payload(1));
    await WidgetStore.updateWidgetData(payload(1));

    expect(mockSave).toHaveBeenCalledTimes(2);
    expect(mockForce).toHaveBeenCalledTimes(1);
  });
});
