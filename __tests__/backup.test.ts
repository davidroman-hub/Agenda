/**
 * Copia de seguridad cifrada: el formato, el cifrado y qué datos viajan.
 * Lo que más importa: sin la contraseña no se abre, un archivo tocado no se abre, y los datos
 * llegan al otro móvil sin adjuntos ni identificadores de notificación de este.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: {
    scheduleTaskReminder: jest.fn(async () => null),
    cancelTaskReminder: jest.fn(async () => undefined),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomBytes } from "node:crypto";
import useBookSettingsStore from "../stores/boook-settings";
import useFontSettingsStore from "../stores/font-settings-store";
import useNotesStore from "../stores/notes-store";
import useRepeatingTasksStore from "../stores/repeating-tasks-store";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useTaskTypesStore from "../stores/task-types-store";
import useThemeStore from "../stores/theme-store";
import {
  applyNotificationIds,
  BACKUP_DATA_KEYS,
  BACKUP_FORMAT,
  BACKUP_PREFERENCE_KEYS,
  BACKUP_STORE_KEYS,
  BackupPayload,
  backupFileName,
  buildBackupPayload,
  decryptBackup,
  encryptBackup,
  listPendingReminders,
  parsePayload,
  prepareRestore,
  sanitizeStore,
  utf8Decode,
  utf8Encode,
} from "../utils/backup";

const random = (length: number) => new Uint8Array(randomBytes(length));

const wrap = (state: unknown) => JSON.stringify({ state, version: 0 });

const attachment = { id: "a1", name: "foto.png", fileName: "a1-foto.png", mimeType: "image/png", size: 10, addedAt: "2026-09-20T00:00:00.000Z" };

const task = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  text: `tarea ${id}`,
  completed: false,
  createdAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-20T00:00:00.000Z",
  ...extra,
});

const tasksRaw = wrap({
  tasksByDate: {
    "2026-09-20": {
      0: task("t0", { attachments: [attachment], notificationId: "n-old", reminder: "2026-09-21T10:00:00.000Z" }),
      1: null,
      2: task("t2"),
    },
  },
  linesStatus: {},
});

const notesRaw = wrap({
  notes: [
    { id: "n1", text: "con texto", color: "yellow", attachments: [attachment], createdAt: "x", updatedAt: "x" },
    { id: "n2", text: "", color: "yellow", attachments: [attachment], createdAt: "x", updatedAt: "x" },
    { id: "n3", text: "  \n ", color: "yellow", createdAt: "x", updatedAt: "x" },
  ],
});

const samplePayload = (): BackupPayload => ({
  createdAt: "2026-09-20T12:00:00.000Z",
  appVersion: "1.9.0",
  stores: { "notes-storage": wrap({ notes: [{ id: "n1", text: "Comprar leche 🥛 ñandú", color: "yellow", createdAt: "x", updatedAt: "x" }] }) },
});

describe("las claves de la copia son las de los stores de verdad", () => {
  const stores = {
    "agenda-tasks-storage": useAgendaTasksStore,
    "notes-storage": useNotesStore,
    "repeating-tasks-storage": useRepeatingTasksStore,
    "task-types-storage": useTaskTypesStore,
    "book-settings-storage": useBookSettingsStore,
    "font-settings-storage": useFontSettingsStore,
    "theme-storage": useThemeStore,
  };

  it.each(BACKUP_STORE_KEYS)("%s", (key) => {
    expect(stores[key].persist.getOptions().name).toBe(key);
  });

  it("no hay claves repetidas ni fuera de los dos grupos", () => {
    expect(new Set(BACKUP_STORE_KEYS).size).toBe(BACKUP_DATA_KEYS.length + BACKUP_PREFERENCE_KEYS.length);
    expect(Object.keys(stores).sort()).toEqual([...BACKUP_STORE_KEYS].sort());
  });
});

describe("UTF-8 a mano", () => {
  const samples = ["", "abc", "ñandú áéíóú", "€ 你好 こんにちは", "🥛 emoji 👨‍👩‍👧 y más 😀", "a" + String.fromCharCode(0) + "b\n\t", "x".repeat(10_000)];

  it.each(samples)("da los mismos bytes que Node y vuelve al texto original (%#)", (text) => {
    const bytes = utf8Encode(text);
    expect(Buffer.from(bytes).equals(Buffer.from(text, "utf8"))).toBe(true);
    expect(utf8Decode(bytes)).toBe(text);
  });

  it("un sustituto suelto se cambia por el carácter de reemplazo, no rompe", () => {
    expect(utf8Decode(utf8Encode("a" + String.fromCharCode(0xd800) + "b"))).toBe("a" + String.fromCharCode(0xfffd) + "b");
  });

  it("bytes que no son UTF-8 no lanzan", () => {
    expect(() => utf8Decode(Uint8Array.from([0xff, 0xc0, 0xe2, 0x82, 0xf0, 0x9f]))).not.toThrow();
  });

  it("un texto grande no revienta la pila", () => {
    const big = "ñ".repeat(200_000);
    expect(utf8Decode(utf8Encode(big))).toBe(big);
  });
});

describe("cifrado", () => {
  it("con la contraseña correcta devuelve lo mismo que se guardó", async () => {
    const payload = samplePayload();
    const file = await encryptBackup("contraseña-segura", () => payload, random);

    const result = await decryptBackup(file, "contraseña-segura");

    expect(result).toEqual({ ok: true, payload });
  });

  it("el archivo no deja ver nada de lo que contiene", async () => {
    const file = await encryptBackup("contraseña-segura", samplePayload, random);

    expect(file).not.toContain("Comprar leche");
    expect(file).not.toContain("notes-storage");
    expect(JSON.parse(file).format).toBe(BACKUP_FORMAT);
  });

  it("con otra contraseña no se abre", async () => {
    const file = await encryptBackup("contraseña-segura", samplePayload, random);

    expect(await decryptBackup(file, "contraseña-segurA")).toEqual({ ok: false, reason: "wrong-password" });
    expect(await decryptBackup(file, "")).toEqual({ ok: false, reason: "wrong-password" });
  });

  it("dos copias iguales con la misma contraseña salen distintas (sal y nonce nuevos)", async () => {
    const a = await encryptBackup("contraseña-segura", samplePayload, random);
    const b = await encryptBackup("contraseña-segura", samplePayload, random);

    expect(a).not.toBe(b);
    expect(JSON.parse(a).data).not.toBe(JSON.parse(b).data);
  });

  it("si alguien toca los datos, no se abre", async () => {
    const file = JSON.parse(await encryptBackup("contraseña-segura", samplePayload, random));
    const flipped = file.data.slice(0, 10) + (file.data[10] === "0" ? "1" : "0") + file.data.slice(11);

    const result = await decryptBackup(JSON.stringify({ ...file, data: flipped }), "contraseña-segura");

    expect(result).toEqual({ ok: false, reason: "wrong-password" });
  });

  it("si alguien toca la sal, no se abre", async () => {
    const file = JSON.parse(await encryptBackup("contraseña-segura", samplePayload, random));
    const salt = file.kdf.salt.startsWith("0") ? "1" + file.kdf.salt.slice(1) : "0" + file.kdf.salt.slice(1);

    const result = await decryptBackup(
      JSON.stringify({ ...file, kdf: { ...file.kdf, salt } }),
      "contraseña-segura"
    );

    expect(result).toEqual({ ok: false, reason: "wrong-password" });
  });

  it("la misma contraseña escrita con acento suelto o compuesto abre igual", async () => {
    const composed = "contraseña-" + String.fromCharCode(0xe9) + "-segura"; // é en un solo carácter
    const decomposed = "contraseña-" + String.fromCharCode(0x65, 0x301) + "-segura"; // e + acento
    const file = await encryptBackup(composed, samplePayload, random);

    expect((await decryptBackup(file, decomposed)).ok).toBe(true);
  });

  it("lee los datos después de derivar la clave, no antes", async () => {
    const order: string[] = [];
    const file = await encryptBackup(
      "contraseña-segura",
      () => {
        order.push("leer datos");
        return samplePayload();
      },
      (length) => {
        order.push("aleatorio");
        return random(length);
      },
      { onProgress: (fraction) => fraction === 1 && order.push("clave lista") }
    );

    expect(file).toBeTruthy();
    expect(order.at(-1)).toBe("leer datos");
    expect(order.indexOf("clave lista")).toBeLessThan(order.indexOf("leer datos"));
  });

  it("avisa del avance", async () => {
    const seen: number[] = [];
    await encryptBackup("contraseña-segura", samplePayload, random, { onProgress: (fraction) => seen.push(fraction) });

    expect(seen.length).toBeGreaterThan(0);
    expect(Math.max(...seen)).toBe(1);
  });
});

describe("archivos que no son una copia", () => {
  let good: Record<string, any>;

  beforeAll(async () => {
    good = JSON.parse(await encryptBackup("contraseña-segura", samplePayload, random));
  });

  const open = (file: unknown) => decryptBackup(typeof file === "string" ? file : JSON.stringify(file), "contraseña-segura");

  it.each([
    ["texto cualquiera", "hola"],
    ["vacío", ""],
    ["JSON que no es una copia", { hello: "world" }],
    ["JSON que no es un objeto", [1, 2, 3]],
  ])("%s", async (_name, file) => {
    expect(await open(file)).toEqual({ ok: false, reason: "invalid-file" });
  });

  it("una copia de una versión más nueva del formato lo dice", async () => {
    expect(await open({ ...good, version: 2 })).toEqual({ ok: false, reason: "unsupported-version" });
  });

  it("un formato distinto o una versión rara es archivo inválido", async () => {
    expect(await open({ ...good, format: "otra-cosa" })).toEqual({ ok: false, reason: "invalid-file" });
    expect(await open({ ...good, version: 0 })).toEqual({ ok: false, reason: "invalid-file" });
    expect(await open({ ...good, version: "1" })).toEqual({ ok: false, reason: "invalid-file" });
  });

  it("rechaza parámetros de derivación fuera de rango, sin gastar memoria", async () => {
    expect(await open({ ...good, kdf: { ...good.kdf, log2N: 30 } })).toEqual({ ok: false, reason: "invalid-file" });
    expect(await open({ ...good, kdf: { ...good.kdf, log2N: 2 } })).toEqual({ ok: false, reason: "invalid-file" });
    expect(await open({ ...good, kdf: { ...good.kdf, log2N: 14.5 } })).toEqual({ ok: false, reason: "invalid-file" });
    expect(await open({ ...good, kdf: { ...good.kdf, r: 64 } })).toEqual({ ok: false, reason: "invalid-file" });
    expect(await open({ ...good, kdf: { ...good.kdf, name: "pbkdf2" } })).toEqual({ ok: false, reason: "invalid-file" });
  });

  it("rechaza sal, nonce o datos que no son hexadecimal del tamaño correcto", async () => {
    expect(await open({ ...good, kdf: { ...good.kdf, salt: "zz" } })).toEqual({ ok: false, reason: "invalid-file" });
    expect(await open({ ...good, cipher: { ...good.cipher, nonce: "abcd" } })).toEqual({ ok: false, reason: "invalid-file" });
    expect(await open({ ...good, data: "xyz" })).toEqual({ ok: false, reason: "invalid-file" });
    expect(await open({ ...good, data: 5 })).toEqual({ ok: false, reason: "invalid-file" });
  });

  it("unos datos truncados no se abren", async () => {
    expect(await open({ ...good, data: good.data.slice(0, 20) })).toEqual({ ok: false, reason: "wrong-password" });
  });
});

describe("lo descifrado se revisa", () => {
  it("acepta una copia bien formada y se queda solo con las claves que conoce", () => {
    const parsed = parsePayload(
      JSON.stringify({
        createdAt: "2026-09-20T00:00:00.000Z",
        appVersion: "2.0.0",
        stores: { "notes-storage": notesRaw, "algo-nuevo-storage": wrap({}) },
      })
    );

    expect(parsed).toEqual({
      createdAt: "2026-09-20T00:00:00.000Z",
      appVersion: "2.0.0",
      stores: { "notes-storage": notesRaw },
    });
  });

  it.each([
    ["no es JSON", "hola"],
    ["sin stores", JSON.stringify({ createdAt: "x" })],
    ["sin fecha", JSON.stringify({ stores: {} })],
    ["un store que no es texto", JSON.stringify({ createdAt: "x", stores: { "notes-storage": { notes: [] } } })],
    ["un store con texto que no es JSON", JSON.stringify({ createdAt: "x", stores: { "notes-storage": "roto" } })],
    ["un store sin state", JSON.stringify({ createdAt: "x", stores: { "notes-storage": "{}" } })],
  ])("rechaza %s", (_name, json) => {
    expect(parsePayload(json)).toBeNull();
  });

  it("la versión de la app es opcional", () => {
    expect(parsePayload(JSON.stringify({ createdAt: "x", stores: {} }))?.appVersion).toBe("");
  });
});

describe("sanitizeStore", () => {
  it("quita los adjuntos y el identificador de notificación de las tareas, y deja lo demás", () => {
    const { raw, droppedNotes } = sanitizeStore("agenda-tasks-storage", tasksRaw)!;
    const day = JSON.parse(raw).state.tasksByDate["2026-09-20"];

    expect(droppedNotes).toBe(0);
    expect(day["0"]).not.toHaveProperty("attachments");
    expect(day["0"].notificationId).toBeNull();
    expect(day["0"]).toMatchObject({ id: "t0", text: "tarea t0", reminder: "2026-09-21T10:00:00.000Z" });
    expect(day["1"]).toBeNull();
    expect(day["2"]).toMatchObject({ id: "t2", notificationId: null });
    expect(JSON.parse(raw).version).toBe(0);
  });

  it("quita los adjuntos de las notas y descarta las que se quedan vacías", () => {
    const { raw, droppedNotes } = sanitizeStore("notes-storage", notesRaw)!;
    const notes = JSON.parse(raw).state.notes;

    expect(notes.map((note: { id: string }) => note.id)).toEqual(["n1"]);
    expect(notes[0]).not.toHaveProperty("attachments");
    // n2 tenía solo archivos; n3 ya estaba vacía de por sí y tampoco se guarda
    expect(droppedNotes).toBe(2);
  });

  it("no toca el resto de stores", () => {
    const raw = wrap({ daysToShow: 3, viewMode: "normal" });
    expect(sanitizeStore("book-settings-storage", raw)).toEqual({ raw, droppedNotes: 0 });
  });

  it("aguanta datos raros dentro del store", () => {
    const weird = wrap({ tasksByDate: { "2026-09-20": "raro", "2026-09-21": null, "2026-09-22": { 0: 5 } }, notes: "no" });

    expect(() => sanitizeStore("agenda-tasks-storage", weird)).not.toThrow();
    expect(() => sanitizeStore("notes-storage", wrap({ notes: [1, null, "x"] }))).not.toThrow();
  });

  it.each(["", "no es json", "[]", "null", "{}", '{"state":5}'])("devuelve null si lo guardado no se entiende (%j)", (raw) => {
    expect(sanitizeStore("notes-storage", raw)).toBeNull();
  });

  it("no cambia la cadena original", () => {
    const before = tasksRaw;
    sanitizeStore("agenda-tasks-storage", tasksRaw);
    expect(tasksRaw).toBe(before);
    expect(JSON.parse(tasksRaw).state.tasksByDate["2026-09-20"]["0"].attachments).toHaveLength(1);
  });
});

describe("buildBackupPayload", () => {
  const meta = { now: new Date("2026-09-20T12:00:00.000Z"), appVersion: "1.9.0" };

  it("guarda lo que hay, sin adjuntos, y suma las notas que se descartan", () => {
    const { payload, droppedNotes } = buildBackupPayload(
      { "agenda-tasks-storage": tasksRaw, "notes-storage": notesRaw, "theme-storage": wrap({ colorScheme: "dark" }) },
      meta
    );

    expect(payload.createdAt).toBe("2026-09-20T12:00:00.000Z");
    expect(payload.appVersion).toBe("1.9.0");
    expect(Object.keys(payload.stores).sort()).toEqual(["agenda-tasks-storage", "notes-storage", "theme-storage"]);
    expect(droppedNotes).toBe(2);
    expect(payload.stores["agenda-tasks-storage"]).not.toContain("attachments");
  });

  it("ignora lo que no es de la copia (sesión, versión, alarmas exactas…) y lo que falta o está roto", () => {
    const { payload } = buildBackupPayload(
      {
        "login-storage": wrap({ userValues: { username: "test", password: "123" } }),
        "version-storage": wrap({}),
        "exact-alarm-storage": wrap({}),
        "notes-storage": "roto",
        "task-types-storage": null,
      },
      meta
    );

    expect(payload.stores).toEqual({});
  });
});

describe("prepareRestore", () => {
  it("escribe lo que trae la copia, ya limpio", () => {
    const writes = prepareRestore({ createdAt: "x", appVersion: "", stores: { "agenda-tasks-storage": tasksRaw, "theme-storage": wrap({ colorScheme: "dark" }) } });

    expect(JSON.parse(writes["agenda-tasks-storage"]!).state.tasksByDate["2026-09-20"]["0"].notificationId).toBeNull();
    expect(writes["theme-storage"]).toBe(wrap({ colorScheme: "dark" }));
  });

  it("los datos que la copia no trae se dejan vacíos (reemplaza, no mezcla)", () => {
    const writes = prepareRestore({ createdAt: "x", appVersion: "", stores: {} });

    expect(Object.keys(writes).sort()).toEqual([...BACKUP_DATA_KEYS].sort());
    expect(JSON.parse(writes["notes-storage"]!)).toEqual({ state: { notes: [] }, version: 0 });
    expect(JSON.parse(writes["agenda-tasks-storage"]!).state).toEqual({ tasksByDate: {}, linesStatus: {} });
    expect(JSON.parse(writes["repeating-tasks-storage"]!).state).toEqual({ repeatingPatterns: [], repeatingTaskCompletions: {} });
    expect(JSON.parse(writes["task-types-storage"]!).state).toEqual({ types: [] });
  });

  it("los ajustes que la copia no trae no se tocan", () => {
    const writes = prepareRestore({ createdAt: "x", appVersion: "", stores: {} });

    for (const key of BACKUP_PREFERENCE_KEYS) expect(writes).not.toHaveProperty(key);
  });

  it("lo que trae la copia y no se entiende se trata como vacío en los datos", () => {
    const writes = prepareRestore({ createdAt: "x", appVersion: "", stores: { "notes-storage": "roto" } });

    expect(JSON.parse(writes["notes-storage"]!).state.notes).toEqual([]);
  });

  it("los vacíos de verdad se cargan en los stores (forma correcta para zustand)", async () => {
    const writes = prepareRestore({ createdAt: "x", appVersion: "", stores: {} });
    useNotesStore.setState({ notes: [{ id: "viejo", text: "x", color: "yellow", createdAt: "x", updatedAt: "x" }] });
    useAgendaTasksStore.setState({ tasksByDate: { "2026-09-20": { 0: null } } });
    // Deja que zustand termine de guardar lo viejo antes de restaurar encima
    await new Promise((resolve) => setTimeout(resolve, 0));

    await AsyncStorage.clear();
    await AsyncStorage.multiSet(Object.entries(writes) as [string, string][]);
    await Promise.all([useNotesStore.persist.rehydrate(), useAgendaTasksStore.persist.rehydrate()]);

    expect(useNotesStore.getState().notes).toEqual([]);
    expect(useAgendaTasksStore.getState().tasksByDate).toEqual({});
  });
});

describe("recordatorios", () => {
  const now = new Date("2026-09-20T12:00:00.000Z");
  const tasksByDate: Record<string, Record<number, ReturnType<typeof task> | null>> = {
    "2026-09-20": {
      0: task("pasado", { reminder: "2026-09-20T08:00:00.000Z" }),
      1: task("futuro", { reminder: "2026-09-21T08:00:00.000Z", notificationId: "viejo" }),
      2: task("sin", {}),
      3: null,
    },
    "2026-09-25": { 0: task("lejano", { reminder: "2026-09-25T09:30:00.000Z" }), 1: task("roto", { reminder: "no es fecha" }) },
  };

  it("lista solo los que aún no han pasado", () => {
    expect(listPendingReminders(tasksByDate, now)).toEqual([
      { id: "futuro", text: "tarea futuro", date: "2026-09-20", reminder: "2026-09-21T08:00:00.000Z" },
      { id: "lejano", text: "tarea lejano", date: "2026-09-25", reminder: "2026-09-25T09:30:00.000Z" },
    ]);
  });

  it("aplica los identificadores sin tocar lo demás ni el original", () => {
    const next = applyNotificationIds(tasksByDate, { futuro: "nuevo", lejano: null });

    expect(next["2026-09-20"][1]).toMatchObject({ id: "futuro", notificationId: "nuevo" });
    expect(next["2026-09-25"][0]).toMatchObject({ id: "lejano", notificationId: null });
    expect(next["2026-09-20"][0]).toEqual(tasksByDate["2026-09-20"][0]);
    expect(next["2026-09-20"][3]).toBeNull();
    expect(tasksByDate["2026-09-20"][1]).toMatchObject({ notificationId: "viejo" });
  });
});

describe("backupFileName", () => {
  it("lleva la fecha local", () => {
    expect(backupFileName(new Date(2026, 8, 5, 23, 30))).toBe("justAnAgenda-backup-2026-09-05.json");
  });
});
