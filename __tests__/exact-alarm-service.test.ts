import { Alert, Linking, Platform } from "react-native";
import enCommon from "../locales/en/common.json";
import esCommon from "../locales/es/common.json";
import frCommon from "../locales/fr/common.json";
import itCommon from "../locales/it/common.json";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import {
  exactAlarmSettingsAvailable,
  openExactAlarmSettings,
  promptForExactAlarmsOnce,
  shouldPromptForExactAlarms,
} from "../services/exact-alarm-service";
import useExactAlarmStore from "../stores/exact-alarm-store";

type AlertCall = [title: string, message: string, buttons: { text: string; style?: string; onPress?: () => void }[], options?: { cancelable?: boolean }];

const tKey = (key: string) => key;

let alert: jest.Mock<void, AlertCall>;
let sendIntent: jest.SpyInstance;
let openSettings: jest.SpyInstance;
let version: jest.SpyInstance;

const asAndroid = (apiLevel: number) => {
  jest.replaceProperty(Platform, "OS", "android");
  version.mockReturnValue(apiLevel);
};

beforeEach(() => {
  useExactAlarmStore.setState({ promptShown: false });
  alert = jest.spyOn(Alert, "alert").mockImplementation(() => {}) as unknown as jest.Mock<void, AlertCall>;
  sendIntent = jest.spyOn(Linking, "sendIntent").mockResolvedValue(undefined as never);
  openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined as never);
  version = jest.spyOn(Platform, "Version", "get");
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("cuándo existe y cuándo se ofrece", () => {
  it.each([
    [34, true, true],
    [35, true, true],
    [33, true, false], // Android 13: la pantalla existe, pero el permiso viene concedido
    [31, true, false],
    [30, false, false], // Android 11: no existe el permiso
  ])("Android API %i: pantalla de ajustes=%s, aviso=%s", (api, settings, prompt) => {
    asAndroid(api);

    expect(exactAlarmSettingsAvailable()).toBe(settings);
    expect(shouldPromptForExactAlarms()).toBe(prompt);
  });

  it("iOS: ni pantalla de ajustes ni aviso", () => {
    jest.replaceProperty(Platform, "OS", "ios");

    expect(exactAlarmSettingsAvailable()).toBe(false);
    expect(shouldPromptForExactAlarms()).toBe(false);
  });
});

describe("promptForExactAlarmsOnce", () => {
  it("en Android 14 explica el permiso con las opciones 'Ahora no' y 'Abrir ajustes'", () => {
    asAndroid(34);

    expect(promptForExactAlarmsOnce(tKey)).toBe(true);

    const [title, message, buttons, options] = alert.mock.calls[0];
    expect(title).toBe("exactAlarms.title");
    expect(message).toBe("exactAlarms.message");
    expect(buttons.map((button) => button.text)).toEqual(["exactAlarms.notNow", "exactAlarms.openSettings"]);
    expect(buttons[0].style).toBe("cancel");
    expect(options).toEqual({ cancelable: true });
  });

  it("solo sale una vez, aunque se guarden más recordatorios", () => {
    asAndroid(34);

    promptForExactAlarmsOnce(tKey);
    expect(promptForExactAlarmsOnce(tKey)).toBe(false);
    expect(promptForExactAlarmsOnce(tKey)).toBe(false);

    expect(alert).toHaveBeenCalledTimes(1);
    expect(useExactAlarmStore.getState().promptShown).toBe(true);
  });

  it("cuenta como mostrado aunque el usuario elija 'Ahora no'", () => {
    asAndroid(34);
    promptForExactAlarmsOnce(tKey);

    alert.mock.calls[0][2][0].onPress?.();

    expect(shouldPromptForExactAlarms()).toBe(false);
    expect(sendIntent).not.toHaveBeenCalled();
  });

  it("'Abrir ajustes' abre la pantalla de alarmas exactas", async () => {
    asAndroid(34);
    promptForExactAlarmsOnce(tKey);

    alert.mock.calls[0][2][1].onPress?.();
    await Promise.resolve();

    expect(sendIntent).toHaveBeenCalledWith("android.settings.REQUEST_SCHEDULE_EXACT_ALARM");
  });

  it.each([33, 30])("en Android API %i no muestra nada y no gasta el aviso", (api) => {
    asAndroid(api);

    expect(promptForExactAlarmsOnce(tKey)).toBe(false);

    expect(alert).not.toHaveBeenCalled();
    expect(useExactAlarmStore.getState().promptShown).toBe(false);
  });

  it("en iOS no muestra nada", () => {
    jest.replaceProperty(Platform, "OS", "ios");

    expect(promptForExactAlarmsOnce(tKey)).toBe(false);
    expect(alert).not.toHaveBeenCalled();
  });
});

describe("openExactAlarmSettings", () => {
  it("abre la pantalla de alarmas exactas", async () => {
    await openExactAlarmSettings();

    expect(sendIntent).toHaveBeenCalledWith("android.settings.REQUEST_SCHEDULE_EXACT_ALARM");
    expect(openSettings).not.toHaveBeenCalled();
  });

  it("si el dispositivo no tiene esa pantalla, abre los ajustes de la app", async () => {
    sendIntent.mockRejectedValueOnce(new Error("Activity no encontrada"));

    await openExactAlarmSettings();

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("si tampoco se pueden abrir, no lanza error", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    sendIntent.mockRejectedValueOnce(new Error("no"));
    openSettings.mockRejectedValueOnce(new Error("no"));

    await expect(openExactAlarmSettings()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("traducciones", () => {
  it.each(Object.entries({ es: esCommon, en: enCommon, fr: frCommon, it: itCommon }))("%s: están los cinco textos y ninguno está vacío", (_language, common) => {
    const group = (common as unknown as { exactAlarms: Record<string, string> }).exactAlarms;

    expect(Object.keys(group).sort()).toEqual(["message", "notNow", "openSettings", "settingsHint", "title"]);
    for (const value of Object.values(group)) expect(value.trim().length).toBeGreaterThan(0);
  });
});
