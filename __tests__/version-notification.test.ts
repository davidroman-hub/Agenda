import esCommon from "../locales/es/common.json";
import enCommon from "../locales/en/common.json";
import frCommon from "../locales/fr/common.json";
import itCommon from "../locales/it/common.json";

// AsyncStorage en memoria: el store de versión persiste con él
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const STORAGE_KEY = "version-storage";
const resources = {
  es: { common: esCommon },
  en: { common: enCommon },
  fr: { common: frCommon },
  it: { common: itCommon },
};

// Argumentos con los que se llama a Alert.alert
type AlertCall = [
  title: string,
  message: string,
  buttons: { text: string; onPress?: () => void }[]
];

type Saved = {
  currentVersion: string | null;
  previousVersion: string | null;
  hasShownUpdateNotification?: boolean;
  isFirstLaunch?: boolean;
};

// Carga módulos nuevos en cada test (nada compartido) con lo guardado en AsyncStorage ya puesto,
// como pasa al abrir la app: el store empieza sin hidratar y termina de forma asíncrona.
const load = async (options: { saved?: Saved; storedFormat?: number; language?: string } = {}) => {
  const { saved, storedFormat = 1, language = "es" } = options;
  jest.resetModules();

  // El mock exporta el objeto directamente (sin .default)
  const AsyncStorage = require("@react-native-async-storage/async-storage");
  await AsyncStorage.clear();
  if (saved) {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { hasShownUpdateNotification: false, isFirstLaunch: false, ...saved },
        version: storedFormat,
      })
    );
  }

  // El build CommonJS de i18next exporta la instancia directamente (sin .default)
  const i18nModule = require("i18next");
  const i18n = i18nModule.default ?? i18nModule;
  await i18n.init({
    lng: language,
    fallbackLng: "en",
    defaultNS: "common",
    resources,
    interpolation: { escapeValue: false },
  });

  const { Alert } = require("react-native");
  const alert = jest
    .spyOn(Alert, "alert")
    .mockImplementation(() => {}) as unknown as jest.Mock<void, AlertCall>;
  const { useVersionStore } = require("../stores/version-store");
  const { VersionNotificationService } = require("../services/version-notification-service");

  return { alert, i18n, useVersionStore, VersionNotificationService, AsyncStorage };
};

const hydrated = (store: { persist: { hasHydrated: () => boolean; rehydrate: () => unknown } }) =>
  Promise.resolve(store.persist.rehydrate());

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("store de versión", () => {
  it("primer arranque: registra la versión y no hay nada que avisar", async () => {
    const { useVersionStore } = await load();
    await hydrated(useVersionStore);

    useVersionStore.getState().updateVersion("1.9.0");

    const state = useVersionStore.getState();
    expect(state.currentVersion).toBe("1.9.0");
    expect(state.previousVersion).toBeNull();
    expect(state.checkForVersionUpdate()).toBe(false);
  });

  it("actualización: guarda la versión anterior y pide avisar una vez", async () => {
    const { useVersionStore } = await load({ saved: { currentVersion: "1.9.0", previousVersion: null } });
    await hydrated(useVersionStore);

    useVersionStore.getState().updateVersion("1.9.1");

    const state = useVersionStore.getState();
    expect([state.previousVersion, state.currentVersion]).toEqual(["1.9.0", "1.9.1"]);
    expect(state.checkForVersionUpdate()).toBe(true);

    state.markNotificationShown();
    expect(useVersionStore.getState().checkForVersionUpdate()).toBe(false);
  });

  it("abrir la misma versión otra vez no cambia nada", async () => {
    const { useVersionStore } = await load({ saved: { currentVersion: "1.9.0", previousVersion: "1.8.1", hasShownUpdateNotification: true } });
    await hydrated(useVersionStore);

    const before = useVersionStore.getState();
    before.updateVersion("1.9.0");

    expect(useVersionStore.getState()).toBe(before);
  });

  it("estado guardado por la versión antigua (que mentía con '1.4.0'): se descarta y no genera un aviso falso", async () => {
    const { useVersionStore } = await load({
      saved: { currentVersion: "1.4.0", previousVersion: null, isFirstLaunch: true },
      storedFormat: 0,
    });
    await hydrated(useVersionStore);
    expect(useVersionStore.getState().currentVersion).toBeNull();

    useVersionStore.getState().updateVersion("1.9.0");

    expect(useVersionStore.getState().previousVersion).toBeNull();
    expect(useVersionStore.getState().checkForVersionUpdate()).toBe(false);
  });
});

describe("VersionNotificationService", () => {
  it("al actualizar, avisa a los 2 s con la versión anterior y la nueva, y ofrece ver los cambios", async () => {
    const { alert, useVersionStore, VersionNotificationService } = await load({
      saved: { currentVersion: "1.8.1", previousVersion: null },
      language: "en",
    });
    await hydrated(useVersionStore);

    VersionNotificationService.start("1.9.0");
    expect(alert).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(2000);

    expect(alert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alert.mock.calls[0];
    expect(title).toBe("🎉 New version installed");
    expect(message).toContain("from version 1.8.1 to 1.9.0");
    expect(buttons.map((button: { text: string }) => button.text)).toEqual(["View changes", "Got it"]);

    // "View changes" enseña el bloque de la 1.9.0 (no el de otra versión) y sin marcas **
    buttons[0].onPress?.();
    const [changesTitle, changes] = alert.mock.calls[1];
    expect(changesTitle).toBe("📋 What's new in version 1.9.0");
    expect(changes).toContain("Version 1.9.0");
    expect(changes).not.toContain("Version 1.8.1");
    expect(changes).not.toContain("**");
  });

  it("no vuelve a avisar en el siguiente arranque de la misma versión", async () => {
    const { alert, useVersionStore, VersionNotificationService } = await load({
      saved: { currentVersion: "1.8.1", previousVersion: null },
    });
    await hydrated(useVersionStore);

    const stop = VersionNotificationService.start("1.9.0");
    await jest.advanceTimersByTimeAsync(2000);
    stop();
    expect(alert).toHaveBeenCalledTimes(1);

    VersionNotificationService.start("1.9.0");
    await jest.advanceTimersByTimeAsync(2000);
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it("primer arranque de una instalación nueva: no avisa de nada", async () => {
    const { alert, useVersionStore, VersionNotificationService } = await load();
    await hydrated(useVersionStore);

    VersionNotificationService.start("1.9.0");
    await jest.advanceTimersByTimeAsync(5000);

    expect(alert).not.toHaveBeenCalled();
    expect(useVersionStore.getState().currentVersion).toBe("1.9.0");
  });

  it("si la versión nueva no tiene entrada en el changelog, avisa pero sin botón de cambios", async () => {
    const { alert, useVersionStore, VersionNotificationService } = await load({
      saved: { currentVersion: "1.9.0", previousVersion: null },
    });
    await hydrated(useVersionStore);

    VersionNotificationService.start("99.0.0");
    await jest.advanceTimersByTimeAsync(2000);

    const buttons = alert.mock.calls[0][2];
    expect(buttons.map((button: { text: string }) => button.text)).toEqual(["Entendido"]);
  });

  it("espera a que el store termine de hidratarse (si no, trataría la actualización como primer arranque)", async () => {
    const { alert, useVersionStore, VersionNotificationService } = await load({
      saved: { currentVersion: "1.8.1", previousVersion: null },
    });
    // Sin `await hydrated(...)`: el store acaba de crearse y AsyncStorage aún no ha respondido
    expect(useVersionStore.persist.hasHydrated()).toBe(false);

    VersionNotificationService.start("1.9.0");
    expect(useVersionStore.getState().currentVersion).toBeNull(); // todavía no ha registrado nada

    await jest.advanceTimersByTimeAsync(2500);

    expect(useVersionStore.getState().previousVersion).toBe("1.8.1");
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][1]).toContain("1.8.1");
  });

  it("cancelar (desmontar) antes de que pase el retraso evita el aviso", async () => {
    const { alert, useVersionStore, VersionNotificationService } = await load({
      saved: { currentVersion: "1.8.1", previousVersion: null },
    });
    await hydrated(useVersionStore);

    const stop = VersionNotificationService.start("1.9.0");
    stop();
    await jest.advanceTimersByTimeAsync(5000);

    expect(alert).not.toHaveBeenCalled();
  });

  it.each(["es", "en", "fr", "it"])("%s: título, mensaje y botones están traducidos", async (language) => {
    const { alert, useVersionStore, VersionNotificationService } = await load({
      saved: { currentVersion: "1.8.1", previousVersion: null },
      language,
    });
    await hydrated(useVersionStore);

    VersionNotificationService.start("1.9.0");
    await jest.advanceTimersByTimeAsync(2000);

    const [title, message, buttons] = alert.mock.calls[0];
    const everything = [title, message, ...buttons.map((button: { text: string }) => button.text)].join("|");
    // Una clave sin traducir se vería como "versionUpdate.algo"; una variable sin resolver, como {{...}}
    expect(everything).not.toMatch(/versionUpdate\./);
    expect(everything).not.toMatch(/\{\{/);
    expect(message).toContain("1.8.1");
    expect(message).toContain("1.9.0");
  });
});
