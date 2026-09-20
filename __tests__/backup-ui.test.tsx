/**
 * Renderiza el botón y el modal de copia de seguridad con `react-test-renderer` y pulsa lo que un
 * usuario pulsaría. No comprueba cómo se ve, pero caza flujos que no hacen lo que dicen: que no se
 * pueda crear una copia con una contraseña floja, que restaurar pida confirmación, que un error deje
 * reintentar, y que no se pueda cerrar en mitad del trabajo. El servicio es el límite: se falsea.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../hooks/use-i18n", () => ({
  useI18n: () => ({
    tCommon: (key: string, opts?: object) => (opts ? `${key}${JSON.stringify(opts)}` : key),
    tAgenda: (key: string) => key,
  }),
}));
jest.mock("../services/backup-service", () => ({
  createBackupFile: jest.fn(),
  pickBackupFile: jest.fn(),
  restoreBackup: jest.fn(),
  shareBackupFile: jest.fn(),
}));

import React from "react";
import { Alert, Text, TextInput, TouchableOpacity } from "react-native";
import TestRenderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import BackupButton from "../components/settings/BackupButton";
import BackupModal from "../components/settings/BackupModal";
import {
  createBackupFile,
  pickBackupFile,
  restoreBackup,
  shareBackupFile,
} from "../services/backup-service";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const create = createBackupFile as jest.Mock;
const pick = pickBackupFile as jest.Mock;
const restore = restoreBackup as jest.Mock;
const share = shareBackupFile as jest.Mock;

const flat = (value: unknown): string => [value].flat(Infinity).filter((part) => typeof part === "string").join("");
const texts = (root: ReactTestInstance) => root.findAllByType(Text).map((node) => flat(node.props.children));
const buttons = (root: ReactTestInstance) => root.findAllByType(TouchableOpacity);
const buttonWith = (root: ReactTestInstance, label: string) =>
  buttons(root).find((button) => button.findAllByType(Text).some((node) => flat(node.props.children) === label));
const inputs = (root: ReactTestInstance) => root.findAllByType(TextInput);

const mounted: ReactTestRenderer[] = [];
async function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  mounted.push(renderer);
  return renderer;
}

async function press(root: ReactTestInstance, label: string) {
  const button = buttonWith(root, label);
  if (!button) throw new Error(`no hay un botón «${label}»; hay: ${texts(root).join(" | ")}`);
  await act(async () => {
    await button.props.onPress();
  });
}

async function type(root: ReactTestInstance, index: number, text: string) {
  await act(async () => {
    inputs(root)[index].props.onChangeText(text);
  });
}

const PASSWORD = "contraseña-segura";
const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(async () => {
  for (const renderer of mounted.splice(0)) await act(async () => renderer.unmount());
  jest.restoreAllMocks();
});

const openModal = async () => (await render(<BackupModal visible onClose={onClose} />)).root;

describe("el botón de Ajustes", () => {
  it("enseña el título y la pista, y abre la copia de seguridad", async () => {
    const { root } = await render(<BackupButton />);

    expect(texts(root).some((text) => text.includes("backup.title"))).toBe(true);
    expect(texts(root)).toContain("backup.hint");
    expect(texts(root)).not.toContain("backup.intro");

    await act(async () => {
      buttons(root)[0].props.onPress();
    });

    expect(texts(root)).toContain("backup.intro");
  });
});

describe("el menú", () => {
  it("ofrece crear y restaurar, y explica que el archivo va cifrado", async () => {
    const root = await openModal();

    expect(texts(root)).toContain("backup.intro");
    expect(buttonWith(root, "backup.createButton")).toBeDefined();
    expect(buttonWith(root, "backup.restoreButton")).toBeDefined();
  });

  it("se cierra con la ✕", async () => {
    const root = await openModal();

    await act(async () => {
      buttons(root).find((button) => button.props.accessibilityLabel === "buttons.close")!.props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("crear la copia", () => {
  const toCreateScreen = async () => {
    const root = await openModal();
    await press(root, "backup.createButton");
    return root;
  };

  it("pide la contraseña dos veces y avisa de que sin ella no se recupera", async () => {
    const root = await toCreateScreen();

    expect(inputs(root)).toHaveLength(2);
    expect(inputs(root).every((input) => input.props.secureTextEntry === true)).toBe(true);
    expect(texts(root)).toContain("backup.passwordWarning");
  });

  it("el botón está desactivado hasta que se escribe algo", async () => {
    const root = await toCreateScreen();

    expect(buttonWith(root, "backup.createAndShare")!.props.disabled).toBe(true);
    await type(root, 0, "a");
    expect(buttonWith(root, "backup.createAndShare")!.props.disabled).toBe(false);
  });

  it("no crea la copia con una contraseña corta", async () => {
    const root = await toCreateScreen();
    await type(root, 0, "corta");
    await type(root, 1, "corta");

    await press(root, "backup.createAndShare");

    expect(texts(root)).toContain('backup.passwordTooShort{"min":8}');
    expect(create).not.toHaveBeenCalled();
  });

  it("no crea la copia si las contraseñas no coinciden", async () => {
    const root = await toCreateScreen();
    await type(root, 0, PASSWORD);
    await type(root, 1, `${PASSWORD}x`);

    await press(root, "backup.createAndShare");

    expect(texts(root)).toContain("backup.passwordsDontMatch");
    expect(create).not.toHaveBeenCalled();
  });

  it("al escribir se quita el error", async () => {
    const root = await toCreateScreen();
    await press(root, "backup.createAndShare"); // vacío: no hace nada, pero con algo corto sí avisa
    await type(root, 0, "corta");
    await press(root, "backup.createAndShare");
    expect(texts(root)).toContain('backup.passwordTooShort{"min":8}');

    await type(root, 0, "corta2");

    expect(texts(root)).not.toContain('backup.passwordTooShort{"min":8}');
  });

  it("crea la copia con la contraseña, abre compartir y enseña el archivo y las notas que no entraron", async () => {
    create.mockResolvedValueOnce({ status: "created", uri: "file:///cache/backups/a.json", fileName: "a.json", droppedNotes: 2 });
    share.mockResolvedValueOnce("shared");
    const root = await toCreateScreen();
    await type(root, 0, PASSWORD);
    await type(root, 1, PASSWORD);

    await press(root, "backup.createAndShare");

    expect(create).toHaveBeenCalledWith(PASSWORD, expect.objectContaining({ onProgress: expect.any(Function) }));
    expect(share).toHaveBeenCalledWith("file:///cache/backups/a.json", "a.json");
    expect(texts(root)).toContain("backup.createdMessage");
    expect(texts(root)).toContain("a.json");
    expect(texts(root)).toContain('backup.droppedNotes{"total":2}');
    // La contraseña ya no está en pantalla
    expect(inputs(root)).toHaveLength(0);
  });

  it("no habla de notas descartadas si no hubo ninguna", async () => {
    create.mockResolvedValueOnce({ status: "created", uri: "u", fileName: "a.json", droppedNotes: 0 });
    share.mockResolvedValueOnce("shared");
    const root = await toCreateScreen();
    await type(root, 0, PASSWORD);
    await type(root, 1, PASSWORD);

    await press(root, "backup.createAndShare");

    expect(texts(root).some((text) => text.startsWith("backup.droppedNotes"))).toBe(false);
  });

  it("se puede compartir de nuevo, y si no se puede compartir en este dispositivo lo dice", async () => {
    create.mockResolvedValueOnce({ status: "created", uri: "u", fileName: "a.json", droppedNotes: 0 });
    share.mockResolvedValueOnce("shared").mockResolvedValueOnce("unavailable");
    const root = await toCreateScreen();
    await type(root, 0, PASSWORD);
    await type(root, 1, PASSWORD);
    await press(root, "backup.createAndShare");
    expect(texts(root)).not.toContain("backup.shareUnavailable");

    await press(root, "backup.shareAgain");

    expect(share).toHaveBeenCalledTimes(2);
    expect(texts(root)).toContain("backup.shareUnavailable");
  });

  it("si falla, dice por qué y deja las contraseñas para reintentar", async () => {
    create.mockResolvedValueOnce({ status: "error", reason: "failed" });
    const root = await toCreateScreen();
    await type(root, 0, PASSWORD);
    await type(root, 1, PASSWORD);

    await press(root, "backup.createAndShare");

    expect(texts(root)).toContain("backup.errorFailed");
    expect(inputs(root).map((input) => input.props.value)).toEqual([PASSWORD, PASSWORD]);
    expect(share).not.toHaveBeenCalled();
  });

  it("«Atrás» vuelve al menú y borra lo escrito", async () => {
    const root = await toCreateScreen();
    await type(root, 0, PASSWORD);

    await press(root, "backup.back");
    await press(root, "backup.createButton");

    expect(inputs(root).map((input) => input.props.value)).toEqual(["", ""]);
  });
});

describe("restaurar una copia", () => {
  const toRestoreScreen = async () => {
    const root = await openModal();
    await press(root, "backup.restoreButton");
    return root;
  };

  const withFileChosen = async () => {
    pick.mockResolvedValueOnce({ status: "picked", text: "contenido-del-archivo" });
    const root = await toRestoreScreen();
    await press(root, "backup.pickFile");
    return root;
  };

  // Pulsa «Reemplazar» en el aviso de confirmación
  const confirmReplace = async () => {
    const [, , buttonsOfAlert] = (Alert.alert as jest.Mock).mock.calls.at(-1)!;
    const replace = buttonsOfAlert.find((button: { text: string }) => button.text === "backup.restoreConfirmButton");
    await act(async () => {
      await replace.onPress();
    });
  };

  it("avisa de que reemplaza lo que hay y empieza por elegir el archivo", async () => {
    const root = await toRestoreScreen();

    expect(texts(root)).toContain("backup.restoreWarning");
    expect(buttonWith(root, "backup.pickFile")).toBeDefined();
    expect(inputs(root)).toHaveLength(0);
  });

  it("si se cancela el selector, no pasa nada", async () => {
    pick.mockResolvedValueOnce({ status: "cancelled" });
    const root = await toRestoreScreen();

    await press(root, "backup.pickFile");

    expect(buttonWith(root, "backup.pickFile")).toBeDefined();
    expect(inputs(root)).toHaveLength(0);
  });

  it("si el archivo no se puede leer, lo dice", async () => {
    pick.mockResolvedValueOnce({ status: "error", reason: "too-large" });
    const root = await toRestoreScreen();

    await press(root, "backup.pickFile");

    expect(texts(root)).toContain("backup.errorTooLarge");
  });

  it("con el archivo elegido pide la contraseña; sin ella no se puede restaurar", async () => {
    const root = await withFileChosen();

    expect(texts(root)).toContain("backup.fileReady");
    expect(inputs(root)).toHaveLength(1);
    expect(buttonWith(root, "backup.restoreAction")!.props.disabled).toBe(true);
  });

  it("pide confirmación antes de reemplazar, y si se cancela no restaura", async () => {
    const root = await withFileChosen();
    await type(root, 0, PASSWORD);

    await press(root, "backup.restoreAction");

    expect(Alert.alert).toHaveBeenCalledWith(
      "backup.restoreConfirmTitle",
      "backup.restoreConfirmMessage",
      expect.arrayContaining([expect.objectContaining({ text: "backup.restoreConfirmButton", style: "destructive" })])
    );
    expect(restore).not.toHaveBeenCalled();
  });

  it("al confirmar restaura con el archivo y la contraseña, y enseña la fecha de la copia", async () => {
    restore.mockResolvedValueOnce({ status: "restored", createdAt: "2026-09-20T12:00:00.000Z" });
    const root = await withFileChosen();
    await type(root, 0, PASSWORD);
    await press(root, "backup.restoreAction");

    await confirmReplace();

    expect(restore).toHaveBeenCalledWith("contenido-del-archivo", PASSWORD, expect.objectContaining({ onProgress: expect.any(Function) }));
    expect(texts(root)).toContain('backup.restoredMessage{"date":"2026-09-20"}');
    expect(inputs(root)).toHaveLength(0);
  });

  it("con una contraseña equivocada lo dice y deja reintentar sin volver a elegir el archivo", async () => {
    restore
      .mockResolvedValueOnce({ status: "error", reason: "wrong-password" })
      .mockResolvedValueOnce({ status: "restored", createdAt: "2026-09-20T12:00:00.000Z" });
    const root = await withFileChosen();
    await type(root, 0, "equivocada");
    await press(root, "backup.restoreAction");
    await confirmReplace();

    expect(texts(root)).toContain("backup.errorWrongPassword");
    expect(inputs(root)[0].props.value).toBe("equivocada");

    await type(root, 0, PASSWORD);
    await press(root, "backup.restoreAction");
    await confirmReplace();

    expect(restore).toHaveBeenLastCalledWith("contenido-del-archivo", PASSWORD, expect.anything());
    expect(texts(root)).toContain('backup.restoredMessage{"date":"2026-09-20"}');
  });

  it.each([
    ["invalid-file", "backup.errorInvalidFile"],
    ["unsupported-version", "backup.errorUnsupportedVersion"],
    ["failed", "backup.errorFailed"],
  ])("el error «%s» sale con su texto", async (reason, key) => {
    restore.mockResolvedValueOnce({ status: "error", reason });
    const root = await withFileChosen();
    await type(root, 0, PASSWORD);
    await press(root, "backup.restoreAction");

    await confirmReplace();

    expect(texts(root)).toContain(key);
  });
});

describe("mientras trabaja", () => {
  it("enseña que está trabajando y no deja cerrar hasta que termina", async () => {
    let finish!: (value: unknown) => void;
    restore.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    pick.mockResolvedValueOnce({ status: "picked", text: "x" });
    const root = await openModal();
    await press(root, "backup.restoreButton");
    await press(root, "backup.pickFile");
    await type(root, 0, PASSWORD);
    await press(root, "backup.restoreAction");
    const [, , alertButtons] = (Alert.alert as jest.Mock).mock.calls.at(-1)!;
    let running!: Promise<void>;
    await act(async () => {
      running = alertButtons.find((b: { text: string }) => b.text === "backup.restoreConfirmButton").onPress();
    });

    expect(texts(root)).toContain("backup.working");
    expect(texts(root)).toContain("backup.workingHint");
    const close = buttons(root).find((button) => button.props.accessibilityLabel === "buttons.close")!;
    expect(close.props.disabled).toBe(true);
    await act(async () => {
      close.props.onPress();
    });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      finish({ status: "restored", createdAt: "2026-09-20T12:00:00.000Z" });
      await running;
    });

    expect(texts(root)).not.toContain("backup.working");
    expect(texts(root)).toContain('backup.restoredMessage{"date":"2026-09-20"}');
  });

  it("la barra sigue el avance que informa el servicio", async () => {
    let report!: (fraction: number) => void;
    let finish!: (value: unknown) => void;
    create.mockImplementationOnce((_password: string, options: { onProgress: (fraction: number) => void }) => {
      report = options.onProgress;
      return new Promise((resolve) => (finish = resolve));
    });
    const root = await openModal();
    await press(root, "backup.createButton");
    await type(root, 0, PASSWORD);
    await type(root, 1, PASSWORD);
    let running!: Promise<void>;
    await act(async () => {
      running = buttonWith(root, "backup.createAndShare")!.props.onPress();
    });

    const barWidth = () =>
      root
        .findAll((node) => typeof node.type === "string" && node.props.style !== undefined)
        .map((node) => [node.props.style].flat(Infinity).find((style) => style && typeof style === "object" && "width" in style && typeof style.width === "string" && style.width.endsWith("%") && style.width !== "100%"))
        .find(Boolean)?.width;

    expect(barWidth()).toBe("0%");
    await act(async () => report(0.5));
    expect(barWidth()).toBe("50%");

    share.mockResolvedValueOnce("shared");
    await act(async () => {
      finish({ status: "created", uri: "u", fileName: "a.json", droppedNotes: 0 });
      await running;
    });
    expect(texts(root)).toContain("backup.createdMessage");
  });
});
