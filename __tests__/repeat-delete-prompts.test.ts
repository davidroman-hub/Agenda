import { Alert, Platform } from "react-native";
import enCommon from "../locales/en/common.json";
import esCommon from "../locales/es/common.json";
import frCommon from "../locales/fr/common.json";
import itCommon from "../locales/it/common.json";
import {
  promptDeleteRepeatingOccurrence,
  promptDeleteRepeatingSeries,
} from "../utils/repeat-delete-prompts";

type AlertCall = [
  title: string,
  message: string,
  buttons: { text: string; style?: string; onPress?: () => void }[],
  options?: { cancelable?: boolean }
];

// Traduce con la propia clave, para comprobar qué texto se pide en cada botón
const tKey = (key: string) => key;

let alert: jest.Mock<void, AlertCall>;
const lastCall = () => alert.mock.calls[alert.mock.calls.length - 1];

beforeEach(() => {
  alert = jest.spyOn(Alert, "alert").mockImplementation(() => {}) as unknown as jest.Mock<void, AlertCall>;
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("promptDeleteRepeatingOccurrence", () => {
  it("Android: 3 opciones (el límite de Android) y se cancela tocando fuera", () => {
    jest.replaceProperty(Platform, "OS", "android");

    promptDeleteRepeatingOccurrence(tKey, jest.fn());

    const [title, message, buttons, options] = lastCall();
    expect(title).toBe("repeatDelete.occurrenceTitle");
    expect(message).toBe("repeatDelete.occurrenceMessage");
    expect(buttons.map((button) => button.text)).toEqual([
      "repeatDelete.onlyThis",
      "repeatDelete.thisAndFollowing",
      "repeatDelete.allSeries",
    ]);
    expect(options).toEqual({ cancelable: true });
  });

  it("iOS: las mismas 3 opciones más un botón de cancelar", () => {
    jest.replaceProperty(Platform, "OS", "ios");

    promptDeleteRepeatingOccurrence(tKey, jest.fn());

    const buttons = lastCall()[2];
    expect(buttons.map((button) => button.text)).toEqual([
      "repeatDelete.onlyThis",
      "repeatDelete.thisAndFollowing",
      "repeatDelete.allSeries",
      "buttons.cancel",
    ]);
    expect(buttons[3].style).toBe("cancel");
  });

  it("cada botón devuelve su alcance", () => {
    jest.replaceProperty(Platform, "OS", "android");
    const onSelect = jest.fn();

    promptDeleteRepeatingOccurrence(tKey, onSelect);
    const buttons = lastCall()[2];
    buttons[0].onPress?.();
    buttons[1].onPress?.();
    buttons[2].onPress?.();

    expect(onSelect.mock.calls.map(([scope]) => scope)).toEqual(["this", "following", "all"]);
  });

  it("borrar toda la serie se marca como destructivo", () => {
    jest.replaceProperty(Platform, "OS", "android");

    promptDeleteRepeatingOccurrence(tKey, jest.fn());

    expect(lastCall()[2][2].style).toBe("destructive");
  });

  it("no ejecuta nada hasta que se elige una opción", () => {
    const onSelect = jest.fn();

    promptDeleteRepeatingOccurrence(tKey, onSelect);

    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("promptDeleteRepeatingSeries", () => {
  it("ofrece cancelar o borrar la serie, y solo borra si se confirma", () => {
    const onConfirm = jest.fn();

    promptDeleteRepeatingSeries(tKey, onConfirm);

    const [title, message, buttons] = lastCall();
    expect(title).toBe("repeatDelete.seriesTitle");
    expect(message).toBe("repeatDelete.seriesMessage");
    expect(buttons.map((button) => button.text)).toEqual(["buttons.cancel", "repeatDelete.allSeries"]);

    buttons[0].onPress?.();
    expect(onConfirm).not.toHaveBeenCalled();

    buttons[1].onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("traducciones", () => {
  const locales = { es: esCommon, en: enCommon, fr: frCommon, it: itCommon };
  const KEYS = [
    "occurrenceTitle",
    "occurrenceMessage",
    "onlyThis",
    "thisAndFollowing",
    "allSeries",
    "seriesTitle",
    "seriesMessage",
  ];

  it.each(Object.entries(locales))("%s: están todos los textos y ninguno está vacío", (_language, common) => {
    const group = (common as unknown as { repeatDelete: Record<string, string> }).repeatDelete;
    expect(Object.keys(group).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) expect(group[key].trim().length).toBeGreaterThan(0);
    expect(common.buttons.cancel.trim().length).toBeGreaterThan(0);
  });

  it("las tres opciones se distinguen entre sí en cada idioma", () => {
    for (const common of Object.values(locales)) {
      const { onlyThis, thisAndFollowing, allSeries } = (common as unknown as { repeatDelete: Record<string, string> }).repeatDelete;
      expect(new Set([onlyThis, thisAndFollowing, allSeries]).size).toBe(3);
    }
  });
});
