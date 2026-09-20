/**
 * Copia de seguridad de punta a punta, con un disco falso en memoria y sin módulos nativos:
 * se guarda desde un "móvil viejo", se borra todo, y se restaura en el "móvil nuevo".
 * Lo importante: los datos llegan, sin adjuntos; los recordatorios se programan en el móvil nuevo;
 * y una contraseña mala o un archivo roto no tocan NADA de lo que ya hay.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("../services/notifications/notification-service", () => ({
  notificationService: {
    scheduleTaskReminder: jest.fn(async () => "id-nuevo"),
    cancelTaskReminder: jest.fn(async () => undefined),
    cancelAllTaskReminders: jest.fn(async () => undefined),
  },
}));
jest.mock("../services/repeated-task-notification-service", () => ({
  RepeatedTaskNotificationService: { syncScheduledNotifications: jest.fn(async () => undefined) },
}));

jest.mock("expo-crypto", () => ({
  getRandomBytes: (length: number) => new Uint8Array(require("node:crypto").randomBytes(length)),
}));

// Sistema de archivos falso: solo lo que usa el servicio (File, Directory, Paths)
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const directories = new Set<string>();
  const state = { failNextWrite: false };

  const join = (parts: unknown[]): string => {
    const [first, ...rest] = parts.map((part) =>
      typeof part === "string" ? part : (part as { uri: string }).uri
    );
    const path = [first.replace(/^file:\/\//, ""), ...rest].join("/").replace(/\/+/g, "/").replace(/\/$/, "");
    return `file://${path}`;
  };

  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts) + "/";
    }
    get exists() {
      return directories.has(this.uri);
    }
    create() {
      directories.add(this.uri);
    }
    delete() {
      directories.delete(this.uri);
      for (const uri of [...files.keys()]) if (uri.startsWith(this.uri)) files.delete(uri);
    }
  }

  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return files.has(this.uri);
    }
    get size() {
      return Buffer.byteLength(files.get(this.uri) ?? "");
    }
    create() {
      if (files.has(this.uri)) throw new Error("ya existe");
      files.set(this.uri, "");
    }
    write(content: string) {
      if (state.failNextWrite) {
        state.failNextWrite = false;
        throw new Error("sin espacio");
      }
      if (!files.has(this.uri)) throw new Error("no existe");
      files.set(this.uri, content);
    }
    async text() {
      if (!files.has(this.uri)) throw new Error("no existe");
      return files.get(this.uri)!;
    }
    delete() {
      files.delete(this.uri);
    }
  }

  return {
    __fs: { files, directories, state },
    Directory,
    File,
    Paths: { cache: { uri: "file:///cache/" } },
  };
});

const mockPicker = { getDocumentAsync: jest.fn() };
jest.mock("expo-document-picker", () => mockPicker);
const mockSharing = { isAvailableAsync: jest.fn(), shareAsync: jest.fn() };
jest.mock("expo-sharing", () => mockSharing);

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { RepeatedTaskNotificationService } from "../services/repeated-task-notification-service";
import { notificationService } from "../services/notifications/notification-service";
import { createBackupFile, pickBackupFile, restoreBackup, shareBackupFile } from "../services/backup-service";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useNotesStore from "../stores/notes-store";
import useRepeatingTasksStore from "../stores/repeating-tasks-store";
import useTaskTypesStore from "../stores/task-types-store";
import useThemeStore from "../stores/theme-store";

const fs = (FileSystem as unknown as {
  __fs: { files: Map<string, string>; directories: Set<string>; state: { failNextWrite: boolean } };
}).__fs;

const PASSWORD = "contraseña-segura";
const NOW = new Date("2026-09-20T12:00:00.000Z");
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const attachment = { id: "a1", name: "foto.png", fileName: "a1-foto.png", mimeType: "image/png", size: 10, addedAt: "2026-09-20T00:00:00.000Z" };
const iso = "2026-09-20T00:00:00.000Z";

const task = (id: string, text: string, extra: Record<string, unknown> = {}) => ({
  id,
  text,
  completed: false,
  createdAt: iso,
  updatedAt: iso,
  ...extra,
});

// Lo que tiene el "móvil viejo"
async function fillOldPhone() {
  useAgendaTasksStore.setState({
    tasksByDate: {
      "2026-09-20": {
        0: task("t-pasado", "Recordatorio ya pasado", { reminder: "2026-09-20T08:00:00.000Z", notificationId: "viejo-1" }),
        1: task("t-futuro", "Dentista", { reminder: "2026-09-25T09:00:00.000Z", notificationId: "viejo-2", typeId: "type-1" }),
        2: task("t-adjunto", "Contrato", { attachments: [attachment] }),
      },
    },
    linesStatus: { "2026-09-20": { occupiedLines: [0, 1, 2], availableLines: [], extraLines: 0 } },
  });
  useNotesStore.setState({
    notes: [
      { id: "n1", text: "Comprar leche 🥛", color: "pink", createdAt: iso, updatedAt: iso },
      { id: "n2", text: "", color: "yellow", createdAt: iso, updatedAt: iso, attachments: [attachment] },
    ],
  });
  useRepeatingTasksStore.setState({
    repeatingPatterns: [
      { id: "p1", originalTaskId: "t-futuro", repeatOption: "weekly", startDate: "2026-09-20", isActive: true, createdAt: iso } as never,
    ],
    repeatingTaskCompletions: { "t-futuro-2026-09-27": true },
  });
  useTaskTypesStore.setState({ types: [{ id: "type-1", name: "Salud", color: "#ff0000" }] as never });
  useThemeStore.setState({ colorScheme: "dark" });
  await flush();
}

// Un móvil recién estrenado: sin nada guardado ni en memoria
async function wipePhone() {
  await AsyncStorage.clear();
  useAgendaTasksStore.setState({ tasksByDate: {}, linesStatus: {} });
  useNotesStore.setState({ notes: [] });
  useRepeatingTasksStore.setState({ repeatingPatterns: [], repeatingTaskCompletions: {} });
  useTaskTypesStore.setState({ types: [] });
  useThemeStore.setState({ colorScheme: "light" });
  await flush();
  await AsyncStorage.clear();
}

const backupText = () => {
  const [uri] = [...fs.files.keys()].filter((key) => key.includes("/backups/"));
  return fs.files.get(uri)!;
};

const created = async () => {
  const result = await createBackupFile(PASSWORD, { now: NOW });
  if (result.status !== "created") throw new Error(`no se creó la copia: ${JSON.stringify(result)}`);
  return result;
};

beforeEach(async () => {
  jest.clearAllMocks();
  fs.files.clear();
  fs.directories.clear();
  fs.state.failNextWrite = false;
  await wipePhone();
});

describe("crear la copia", () => {
  it("deja un archivo cifrado en la caché, con nombre con fecha, y cuenta las notas que solo tenían archivos", async () => {
    await fillOldPhone();

    const result = await created();

    expect(result.fileName).toBe("justAnAgenda-backup-2026-09-20.json");
    expect(result.uri).toBe("file:///cache/backups/justAnAgenda-backup-2026-09-20.json");
    expect(result.droppedNotes).toBe(1);
    const text = backupText();
    expect(JSON.parse(text).format).toBe("justAnAgenda-backup");
    for (const secret of ["Dentista", "Comprar leche", "Contrato", "a1-foto.png"]) expect(text).not.toContain(secret);
  });

  it("avisa del avance de la clave", async () => {
    const seen: number[] = [];
    await createBackupFile(PASSWORD, { now: NOW, onProgress: (fraction) => seen.push(fraction) });

    expect(Math.max(...seen)).toBe(1);
  });

  it("solo guarda una copia en la caché: la nueva sustituye a la anterior", async () => {
    await createBackupFile(PASSWORD, { now: new Date(2026, 8, 19, 10) });
    await createBackupFile(PASSWORD, { now: new Date(2026, 8, 20, 10) });

    expect([...fs.files.keys()]).toEqual(["file:///cache/backups/justAnAgenda-backup-2026-09-20.json"]);
  });

  it("crea una copia también cuando no hay nada guardado", async () => {
    const result = await createBackupFile(PASSWORD, { now: NOW });

    expect(result.status).toBe("created");
  });

  it("si el disco falla, lo dice y no deja un archivo a medias que parezca bueno", async () => {
    await fillOldPhone();
    fs.state.failNextWrite = true;

    const result = await createBackupFile(PASSWORD, { now: NOW });

    expect(result).toEqual({ status: "error", reason: "failed" });
  });

  it("no modifica lo que hay guardado", async () => {
    await fillOldPhone();
    const before = await AsyncStorage.multiGet(await AsyncStorage.getAllKeys());

    await created();

    expect(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys())).toEqual(before);
  });
});

describe("restaurar en otro móvil", () => {
  it("llegan tareas, notas, repeticiones, tipos y ajustes, pero sin adjuntos", async () => {
    await fillOldPhone();
    await created();
    const text = backupText();

    await wipePhone(); // el móvil nuevo
    const result = await restoreBackup(text, PASSWORD, { now: NOW });

    expect(result).toEqual({ status: "restored", createdAt: NOW.toISOString() });
    const day = useAgendaTasksStore.getState().tasksByDate["2026-09-20"];
    expect(day[0]).toMatchObject({ text: "Recordatorio ya pasado" });
    expect(day[1]).toMatchObject({ text: "Dentista", typeId: "type-1", reminder: "2026-09-25T09:00:00.000Z" });
    expect(day[2]).toMatchObject({ text: "Contrato" });
    expect(day[2]).not.toHaveProperty("attachments");
    expect(useAgendaTasksStore.getState().linesStatus["2026-09-20"].occupiedLines).toEqual([0, 1, 2]);
    expect(useNotesStore.getState().notes).toEqual([{ id: "n1", text: "Comprar leche 🥛", color: "pink", createdAt: iso, updatedAt: iso }]);
    expect(useRepeatingTasksStore.getState().repeatingPatterns.map((pattern) => pattern.id)).toEqual(["p1"]);
    expect(useRepeatingTasksStore.getState().repeatingTaskCompletions).toEqual({ "t-futuro-2026-09-27": true });
    expect(useTaskTypesStore.getState().types).toEqual([{ id: "type-1", name: "Salud", color: "#ff0000" }]);
    expect(useThemeStore.getState().colorScheme).toBe("dark");
  });

  it("programa en este móvil solo los recordatorios que aún no han pasado y guarda sus identificadores nuevos", async () => {
    await fillOldPhone();
    await created();
    const text = backupText();
    await wipePhone();

    await restoreBackup(text, PASSWORD, { now: NOW });
    await flush();

    expect(notificationService.cancelAllTaskReminders).toHaveBeenCalledTimes(1);
    expect(notificationService.scheduleTaskReminder).toHaveBeenCalledTimes(1);
    expect(notificationService.scheduleTaskReminder).toHaveBeenCalledWith(
      "t-futuro",
      "Dentista",
      expect.stringContaining("2026-09-20"),
      new Date("2026-09-25T09:00:00.000Z"),
      "2026-09-20"
    );
    const day = useAgendaTasksStore.getState().tasksByDate["2026-09-20"];
    expect(day[1]?.notificationId).toBe("id-nuevo"); // no el "viejo-2" del otro móvil
    expect(day[0]?.notificationId).toBeNull();
    expect(RepeatedTaskNotificationService.syncScheduledNotifications).toHaveBeenCalledTimes(1);
    // Y queda guardado en el disco de este móvil
    const stored = JSON.parse((await AsyncStorage.getItem("agenda-tasks-storage"))!);
    expect(stored.state.tasksByDate["2026-09-20"]["1"].notificationId).toBe("id-nuevo");
  });

  it("los datos de este móvil se reemplazan, no se mezclan", async () => {
    await fillOldPhone();
    await created();
    const text = backupText();

    // El móvil nuevo ya tenía sus cosas, y una copia sin notas ni tipos las vacía
    await wipePhone();
    useAgendaTasksStore.setState({ tasksByDate: { "2026-01-01": { 0: task("propia", "Tarea de este móvil") as never } } });
    useNotesStore.setState({ notes: [{ id: "propia", text: "Nota de este móvil", color: "yellow", createdAt: iso, updatedAt: iso }] });
    await flush();
    await restoreBackup(text, PASSWORD, { now: NOW });

    expect(Object.keys(useAgendaTasksStore.getState().tasksByDate)).toEqual(["2026-09-20"]);
    expect(useNotesStore.getState().notes.map((note) => note.id)).toEqual(["n1"]);
  });

  it("una copia de un móvil sin notas deja las notas de este vacías", async () => {
    await wipePhone();
    useAgendaTasksStore.setState({ tasksByDate: { "2026-09-20": { 0: task("t", "Solo tareas") as never } } });
    await flush();
    await created();
    const text = backupText();

    useNotesStore.setState({ notes: [{ id: "propia", text: "Nota de este móvil", color: "yellow", createdAt: iso, updatedAt: iso }] });
    await flush();
    await restoreBackup(text, PASSWORD, { now: NOW });

    expect(useNotesStore.getState().notes).toEqual([]);
    expect(useAgendaTasksStore.getState().tasksByDate["2026-09-20"][0]).toMatchObject({ text: "Solo tareas" });
  });

  it("los ajustes que la copia no trae se quedan como estaban", async () => {
    await wipePhone();
    await created();
    const text = backupText();

    useThemeStore.setState({ colorScheme: "dark" });
    await flush();
    await restoreBackup(text, PASSWORD, { now: NOW });

    expect(useThemeStore.getState().colorScheme).toBe("dark");
  });

  it("avisa del avance de la clave", async () => {
    await fillOldPhone();
    await created();
    const seen: number[] = [];

    await restoreBackup(backupText(), PASSWORD, { now: NOW, onProgress: (fraction) => seen.push(fraction) });

    expect(Math.max(...seen)).toBe(1);
  });

  it("si los recordatorios fallan, los datos se restauran igualmente", async () => {
    await fillOldPhone();
    await created();
    const text = backupText();
    await wipePhone();
    (notificationService.cancelAllTaskReminders as jest.Mock).mockRejectedValueOnce(new Error("sin permiso"));

    const result = await restoreBackup(text, PASSWORD, { now: NOW });

    expect(result.status).toBe("restored");
    expect(useNotesStore.getState().notes).toHaveLength(1);
  });
});

describe("restaurar algo que no se puede abrir no toca nada", () => {
  const dataOfThisPhone = async () => {
    useAgendaTasksStore.setState({ tasksByDate: { "2026-01-01": { 0: task("propia", "Tarea de este móvil") as never } } });
    useNotesStore.setState({ notes: [{ id: "propia", text: "Nota de este móvil", color: "yellow", createdAt: iso, updatedAt: iso }] });
    await flush();
    return AsyncStorage.multiGet(await AsyncStorage.getAllKeys());
  };

  const untouched = async (before: unknown) => {
    expect(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys())).toEqual(before);
    expect(useNotesStore.getState().notes.map((note) => note.id)).toEqual(["propia"]);
    expect(useAgendaTasksStore.getState().tasksByDate["2026-01-01"][0]).toMatchObject({ text: "Tarea de este móvil" });
    expect(notificationService.cancelAllTaskReminders).not.toHaveBeenCalled();
    expect(notificationService.scheduleTaskReminder).not.toHaveBeenCalled();
    expect(RepeatedTaskNotificationService.syncScheduledNotifications).not.toHaveBeenCalled();
  };

  it("con una contraseña equivocada", async () => {
    await fillOldPhone();
    await created();
    const text = backupText();
    await wipePhone();
    const before = await dataOfThisPhone();

    expect(await restoreBackup(text, "otra-contraseña", { now: NOW })).toEqual({ status: "error", reason: "wrong-password" });

    await untouched(before);
  });

  it.each([
    ["un archivo que no es una copia", "hola, esto no es una copia", "invalid-file"],
    ["un archivo vacío", "", "invalid-file"],
    ["una copia de una versión más nueva", JSON.stringify({ format: "justAnAgenda-backup", version: 99 }), "unsupported-version"],
  ])("con %s", async (_name, text, reason) => {
    const before = await dataOfThisPhone();

    expect(await restoreBackup(text, PASSWORD, { now: NOW })).toEqual({ status: "error", reason });

    await untouched(before);
  });

  it("con una copia manipulada", async () => {
    await fillOldPhone();
    await created();
    const file = JSON.parse(backupText());
    file.data = file.data.slice(0, 8) + (file.data[8] === "a" ? "b" : "a") + file.data.slice(9);
    await wipePhone();
    const before = await dataOfThisPhone();

    expect(await restoreBackup(JSON.stringify(file), PASSWORD, { now: NOW })).toEqual({ status: "error", reason: "wrong-password" });

    await untouched(before);
  });
});

describe("elegir el archivo", () => {
  const pick = (asset: unknown) => mockPicker.getDocumentAsync.mockResolvedValueOnce(asset);

  it("lee el archivo elegido y borra la copia temporal del selector", async () => {
    fs.files.set("file:///cache/DocumentPicker/copia.json", '{"hola":1}');
    pick({ canceled: false, assets: [{ uri: "file:///cache/DocumentPicker/copia.json", name: "copia.json" }] });

    const result = await pickBackupFile();

    expect(result).toEqual({ status: "picked", text: '{"hola":1}' });
    expect(fs.files.has("file:///cache/DocumentPicker/copia.json")).toBe(false);
    expect(mockPicker.getDocumentAsync).toHaveBeenCalledWith(expect.objectContaining({ type: "*/*", copyToCacheDirectory: true }));
  });

  it("nunca borra un archivo fuera de la caché de la app", async () => {
    fs.files.set("file:///documentos/copia.json", "x");
    pick({ canceled: false, assets: [{ uri: "file:///documentos/copia.json", name: "copia.json" }] });

    await pickBackupFile();

    expect(fs.files.has("file:///documentos/copia.json")).toBe(true);
  });

  it("si el usuario cancela, no pasa nada", async () => {
    pick({ canceled: true, assets: null });

    expect(await pickBackupFile()).toEqual({ status: "cancelled" });
  });

  it("no lee un archivo enorme", async () => {
    fs.files.set("file:///cache/DocumentPicker/grande.bin", "x".repeat(31 * 1024 * 1024));
    pick({ canceled: false, assets: [{ uri: "file:///cache/DocumentPicker/grande.bin", name: "grande.bin" }] });

    expect(await pickBackupFile()).toEqual({ status: "error", reason: "too-large" });
    expect(fs.files.has("file:///cache/DocumentPicker/grande.bin")).toBe(false);
  });

  it("si el archivo no se puede leer, lo dice", async () => {
    pick({ canceled: false, assets: [{ uri: "file:///cache/DocumentPicker/fantasma.json", name: "fantasma.json" }] });

    expect(await pickBackupFile()).toEqual({ status: "error", reason: "failed" });
  });

  it("si el selector no está en esta compilación, lo dice", async () => {
    mockPicker.getDocumentAsync.mockRejectedValueOnce(new Error("módulo nativo no encontrado"));

    expect(await pickBackupFile()).toEqual({ status: "error", reason: "unavailable" });
  });
});

describe("compartir la copia", () => {
  it("abre la hoja de compartir con el archivo", async () => {
    mockSharing.isAvailableAsync.mockResolvedValueOnce(true);
    mockSharing.shareAsync.mockResolvedValueOnce(undefined);

    expect(await shareBackupFile("file:///cache/backups/a.json", "a.json")).toBe("shared");
    expect(mockSharing.shareAsync).toHaveBeenCalledWith(
      "file:///cache/backups/a.json",
      expect.objectContaining({ mimeType: "application/json", UTI: "public.json", dialogTitle: "a.json" })
    );
  });

  it("si no se puede compartir en este dispositivo, lo dice", async () => {
    mockSharing.isAvailableAsync.mockResolvedValueOnce(false);
    expect(await shareBackupFile("file:///x", "x")).toBe("unavailable");

    mockSharing.isAvailableAsync.mockRejectedValueOnce(new Error("sin módulo"));
    expect(await shareBackupFile("file:///x", "x")).toBe("unavailable");
  });
});
