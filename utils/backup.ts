import { gcm } from "@noble/ciphers/aes";
import { scryptAsync } from "@noble/hashes/scrypt";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { dateToLocalDateString } from "@/utils/date-utils";
import { sanitizeNoteText } from "@/utils/notes";

/**
 * Copia de seguridad: un archivo con las tareas, notas, tipos y ajustes de vista, cifrado con una
 * contraseña (scrypt para derivar la clave, AES-256-GCM para cifrar). Sin la contraseña el archivo
 * no se puede leer, y si alguien lo toca, no se abre.
 *
 * NO incluye los archivos adjuntos (pesan demasiado): las tareas y notas se guardan sin ellos.
 * Todo lo de este archivo es puro (sin disco ni módulos nativos) para poder probarlo en Jest.
 */

// ---------------------------------------------------------------------------
// Qué se guarda
// ---------------------------------------------------------------------------

// Lo que el usuario escribió: al restaurar reemplaza lo que hubiera
export const BACKUP_DATA_KEYS = [
  "agenda-tasks-storage",
  "notes-storage",
  "repeating-tasks-storage",
  "task-types-storage",
] as const;

// Cómo ve la agenda: si la copia no lo trae, se deja lo que haya
export const BACKUP_PREFERENCE_KEYS = [
  "book-settings-storage",
  "font-settings-storage",
  "theme-storage",
] as const;

export const BACKUP_STORE_KEYS = [...BACKUP_DATA_KEYS, ...BACKUP_PREFERENCE_KEYS] as const;

export type BackupStoreKey = (typeof BACKUP_STORE_KEYS)[number];

const TASKS_KEY: BackupStoreKey = "agenda-tasks-storage";
const NOTES_KEY: BackupStoreKey = "notes-storage";

// Lo que vale "no hay nada" para cada dato. zustand no vacía un store cuando no encuentra su clave
// en el disco, así que al restaurar una copia sin notas se escribe esto en vez de borrar la clave.
const EMPTY_STORES: Record<(typeof BACKUP_DATA_KEYS)[number], string> = {
  "agenda-tasks-storage": JSON.stringify({ state: { tasksByDate: {}, linesStatus: {} }, version: 0 }),
  "notes-storage": JSON.stringify({ state: { notes: [] }, version: 0 }),
  "repeating-tasks-storage": JSON.stringify({
    state: { repeatingPatterns: [], repeatingTaskCompletions: {} },
    version: 0,
  }),
  "task-types-storage": JSON.stringify({ state: { types: [] }, version: 0 }),
};

const isDataKey = (key: string): key is (typeof BACKUP_DATA_KEYS)[number] =>
  (BACKUP_DATA_KEYS as readonly string[]).includes(key);

const isStoreKey = (key: string): key is BackupStoreKey =>
  (BACKUP_STORE_KEYS as readonly string[]).includes(key);

export interface BackupPayload {
  createdAt: string;
  appVersion: string;
  // Lo que zustand guardó en el disco para cada store, tal cual ({ state, version } en texto)
  stores: Partial<Record<BackupStoreKey, string>>;
}

// ---------------------------------------------------------------------------
// Limpieza de los datos antes de guardarlos y al restaurarlos
// ---------------------------------------------------------------------------

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseStore(raw: string): { state: PlainObject; rest: PlainObject } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return null;
    const { state, ...rest } = parsed;
    if (!isPlainObject(state)) return null;
    return { state, rest };
  } catch {
    return null;
  }
}

export interface SanitizedStore {
  raw: string;
  // Notas que solo tenían archivos: sin ellos quedarían vacías, así que no se guardan
  droppedNotes: number;
}

/**
 * Deja un store listo para viajar a otro móvil: sin adjuntos (los archivos no van en la copia) y sin
 * los identificadores de notificación (son de este móvil). null si lo guardado no se entiende.
 */
export function sanitizeStore(key: BackupStoreKey, raw: string): SanitizedStore | null {
  const parsed = parseStore(raw);
  if (!parsed) return null;

  const { state, rest } = parsed;
  let droppedNotes = 0;

  if (key === TASKS_KEY && isPlainObject(state.tasksByDate)) {
    for (const day of Object.values(state.tasksByDate)) {
      if (!isPlainObject(day)) continue;
      for (const task of Object.values(day)) {
        if (!isPlainObject(task)) continue;
        delete task.attachments;
        task.notificationId = null;
      }
    }
  }

  if (key === NOTES_KEY && Array.isArray(state.notes)) {
    const kept: unknown[] = [];
    for (const note of state.notes) {
      if (!isPlainObject(note)) continue;
      delete note.attachments;
      if (sanitizeNoteText(note.text) === "") droppedNotes++;
      else kept.push(note);
    }
    state.notes = kept;
  }

  return { raw: JSON.stringify({ state, ...rest }), droppedNotes };
}

/**
 * Lo que va en la copia, a partir de lo que hay ahora en el disco (clave → texto o null).
 * Un dato que nunca se guardó (o está roto) no aparece: al restaurar equivale a "vacío".
 */
export function buildBackupPayload(
  entries: Partial<Record<string, string | null>>,
  meta: { now: Date; appVersion: string }
): { payload: BackupPayload; droppedNotes: number } {
  const stores: BackupPayload["stores"] = {};
  let droppedNotes = 0;

  for (const key of BACKUP_STORE_KEYS) {
    const raw = entries[key];
    if (!raw) continue;
    const sanitized = sanitizeStore(key, raw);
    if (!sanitized) continue;
    stores[key] = sanitized.raw;
    droppedNotes += sanitized.droppedNotes;
  }

  return {
    payload: { createdAt: meta.now.toISOString(), appVersion: meta.appVersion, stores },
    droppedNotes,
  };
}

/** Qué escribir en el disco al restaurar: los datos que falten quedan vacíos, los ajustes que falten no se tocan */
export function prepareRestore(payload: BackupPayload): Partial<Record<BackupStoreKey, string>> {
  const writes: Partial<Record<BackupStoreKey, string>> = {};

  for (const key of BACKUP_STORE_KEYS) {
    const raw = payload.stores[key];
    const sanitized = raw ? sanitizeStore(key, raw) : null;
    if (sanitized) writes[key] = sanitized.raw;
    else if (isDataKey(key)) writes[key] = EMPTY_STORES[key];
  }

  return writes;
}

// ---------------------------------------------------------------------------
// Recordatorios: las notificaciones programadas no viajan con la copia
// ---------------------------------------------------------------------------

interface ReminderTask {
  id: string;
  text: string;
  reminder?: string | null;
  notificationId?: string | null;
}

export interface PendingReminder {
  id: string;
  text: string;
  date: string;
  reminder: string;
}

/** Las tareas con un recordatorio que todavía no ha pasado: hay que volver a programarlas en este móvil */
export function listPendingReminders<T extends ReminderTask>(
  tasksByDate: Record<string, Record<number, T | null | undefined>>,
  now: Date
): PendingReminder[] {
  const pending: PendingReminder[] = [];

  for (const [date, day] of Object.entries(tasksByDate)) {
    for (const task of Object.values(day ?? {})) {
      if (!task?.reminder) continue;
      const when = new Date(task.reminder);
      if (Number.isNaN(when.getTime()) || when <= now) continue;
      pending.push({ id: task.id, text: task.text, date, reminder: task.reminder });
    }
  }

  return pending;
}

/** Copia de las tareas con el identificador de notificación de cada una (null si no se pudo programar) */
export function applyNotificationIds<D extends Record<number, ReminderTask | null | undefined>>(
  tasksByDate: Record<string, D>,
  notificationIds: Record<string, string | null>
): Record<string, D> {
  const result: Record<string, D> = {};

  for (const [date, day] of Object.entries(tasksByDate)) {
    const nextDay: Record<number, ReminderTask | null | undefined> = {};
    for (const [line, task] of Object.entries<ReminderTask | null | undefined>(day ?? {})) {
      nextDay[Number(line)] =
        task && task.id in notificationIds
          ? { ...task, notificationId: notificationIds[task.id] }
          : task;
    }
    result[date] = nextDay as D;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Texto <-> bytes (UTF-8). Hermes no trae TextDecoder, así que se hace a mano.
// ---------------------------------------------------------------------------

export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];

  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);

    // Pareja de sustitutos (emoji…): un solo carácter de 4 bytes
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd; // sustituto suelto: no es texto válido

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  return Uint8Array.from(bytes);
}

const isContinuation = (byte: number | undefined): byte is number =>
  byte !== undefined && (byte & 0xc0) === 0x80;

export function utf8Decode(bytes: Uint8Array): string {
  let result = "";
  const units: number[] = [];
  const pushUnit = (unit: number) => {
    units.push(unit);
    if (units.length >= 4096) {
      result += String.fromCharCode(...units);
      units.length = 0;
    }
  };

  let i = 0;
  while (i < bytes.length) {
    const first = bytes[i];
    let code = 0xfffd;
    let length = 1;

    if (first < 0x80) {
      code = first;
    } else if (first >= 0xc2 && first <= 0xdf && isContinuation(bytes[i + 1])) {
      code = ((first & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      length = 2;
    } else if (first >= 0xe0 && first <= 0xef && isContinuation(bytes[i + 1]) && isContinuation(bytes[i + 2])) {
      const candidate = ((first & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      const valid = candidate >= 0x800 && !(candidate >= 0xd800 && candidate <= 0xdfff);
      code = valid ? candidate : 0xfffd;
      length = 3;
    } else if (
      first >= 0xf0 &&
      first <= 0xf4 &&
      isContinuation(bytes[i + 1]) &&
      isContinuation(bytes[i + 2]) &&
      isContinuation(bytes[i + 3])
    ) {
      const candidate =
        ((first & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      code = candidate >= 0x10000 && candidate <= 0x10ffff ? candidate : 0xfffd;
      length = 4;
    }

    i += length;
    if (code >= 0x10000) {
      const offset = code - 0x10000;
      pushUnit(0xd800 + (offset >> 10));
      pushUnit(0xdc00 + (offset & 0x3ff));
    } else {
      pushUnit(code);
    }
  }

  return result + String.fromCharCode(...units);
}

// ---------------------------------------------------------------------------
// Cifrado y formato del archivo
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT = "justAnAgenda-backup";
export const BACKUP_FORMAT_VERSION = 1;

// scrypt: memoria = 128 · 2^log2N · r bytes (16 MiB con 14). El archivo guarda el valor con el que se
// hizo, así que se puede subir en el futuro sin romper las copias antiguas. El tope evita que un
// archivo ajeno pida gigas de memoria.
export const KDF_LOG2_N = 14;
const KDF_MIN_LOG2_N = 10;
const KDF_MAX_LOG2_N = 16;
const KDF_R = 8;
const KDF_P = 1;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

export const MIN_BACKUP_PASSWORD_LENGTH = 8;

interface BackupEnvelope {
  format: string;
  version: number;
  kdf: { name: "scrypt"; log2N: number; r: number; p: number; salt: string };
  cipher: { name: "aes-256-gcm"; nonce: string };
  data: string;
}

export type BackupFailure = "invalid-file" | "unsupported-version" | "wrong-password";

export type DecryptResult =
  | { ok: true; payload: BackupPayload }
  | { ok: false; reason: BackupFailure };

export interface CryptoOptions {
  // Avance de la derivación de la clave, de 0 a 1 (es lo que más tarda)
  onProgress?: (fraction: number) => void;
}

// Lo que se autentica junto con los datos: cambiar el formato o la versión del archivo lo invalida
const associatedData = (version: number) => utf8Encode(`${BACKUP_FORMAT}/${version}`);

// Los caracteres "iguales" pero escritos distinto (una é suelta o compuesta) dan la misma clave
const passwordBytes = (password: string) =>
  utf8Encode(typeof password.normalize === "function" ? password.normalize("NFKC") : password);

function deriveKey(
  password: string,
  salt: Uint8Array,
  log2N: number,
  onProgress?: (fraction: number) => void
): Promise<Uint8Array> {
  return scryptAsync(passwordBytes(password), salt, {
    N: 2 ** log2N,
    r: KDF_R,
    p: KDF_P,
    dkLen: KEY_BYTES,
    onProgress,
  });
}

/**
 * Cifra la copia y devuelve el texto del archivo. `getPayload` se llama DESPUÉS de derivar la clave
 * (lo lento) para leer los datos lo más tarde posible: lo que el usuario acaba de escribir entra.
 * `randomBytes` es la fuente aleatoria segura del sistema (en el móvil, expo-crypto).
 */
export async function encryptBackup(
  password: string,
  getPayload: () => BackupPayload | Promise<BackupPayload>,
  randomBytes: (length: number) => Uint8Array,
  options: CryptoOptions = {}
): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const nonce = randomBytes(NONCE_BYTES);
  const key = await deriveKey(password, salt, KDF_LOG2_N, options.onProgress);

  const payload = await getPayload();
  const plain = utf8Encode(JSON.stringify(payload));
  const sealed = gcm(key, nonce, associatedData(BACKUP_FORMAT_VERSION)).encrypt(plain);

  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: BACKUP_FORMAT_VERSION,
    kdf: { name: "scrypt", log2N: KDF_LOG2_N, r: KDF_R, p: KDF_P, salt: bytesToHex(salt) },
    cipher: { name: "aes-256-gcm", nonce: bytesToHex(nonce) },
    data: bytesToHex(sealed),
  };
  return JSON.stringify(envelope);
}

const isHex = (value: unknown, bytes?: number): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length % 2 === 0 &&
  /^[0-9a-f]+$/i.test(value) &&
  (bytes === undefined || value.length === bytes * 2);

function parseEnvelope(text: string): BackupEnvelope | "unsupported-version" | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed) || parsed.format !== BACKUP_FORMAT) return null;
  if (parsed.version !== BACKUP_FORMAT_VERSION) {
    return typeof parsed.version === "number" && parsed.version > BACKUP_FORMAT_VERSION
      ? "unsupported-version"
      : null;
  }

  const { kdf, cipher, data } = parsed;
  if (!isPlainObject(kdf) || !isPlainObject(cipher)) return null;
  const validKdf =
    kdf.name === "scrypt" &&
    Number.isInteger(kdf.log2N) &&
    (kdf.log2N as number) >= KDF_MIN_LOG2_N &&
    (kdf.log2N as number) <= KDF_MAX_LOG2_N &&
    kdf.r === KDF_R &&
    kdf.p === KDF_P &&
    isHex(kdf.salt, SALT_BYTES);
  const validCipher = cipher.name === "aes-256-gcm" && isHex(cipher.nonce, NONCE_BYTES);
  if (!validKdf || !validCipher || !isHex(data)) return null;

  return parsed as unknown as BackupEnvelope;
}

/** Comprueba la forma de lo descifrado: nunca se da por bueno un archivo ajeno */
export function parsePayload(json: string): BackupPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed) || !isPlainObject(parsed.stores)) return null;
  if (typeof parsed.createdAt !== "string") return null;

  const stores: BackupPayload["stores"] = {};
  for (const [key, raw] of Object.entries(parsed.stores)) {
    if (!isStoreKey(key)) continue; // una clave que esta versión no conoce (copia de una app más nueva)
    if (typeof raw !== "string" || !parseStore(raw)) return null;
    stores[key] = raw;
  }

  return {
    createdAt: parsed.createdAt,
    appVersion: typeof parsed.appVersion === "string" ? parsed.appVersion : "",
    stores,
  };
}

/**
 * Abre el texto de un archivo de copia. Una contraseña mala y un archivo alterado no se pueden
 * distinguir (AES-GCM solo dice "no cuadra"), así que los dos salen como "wrong-password".
 */
export async function decryptBackup(
  text: string,
  password: string,
  options: CryptoOptions = {}
): Promise<DecryptResult> {
  const envelope = parseEnvelope(text);
  if (envelope === "unsupported-version") return { ok: false, reason: "unsupported-version" };
  if (!envelope) return { ok: false, reason: "invalid-file" };

  const key = await deriveKey(
    password,
    hexToBytes(envelope.kdf.salt),
    envelope.kdf.log2N,
    options.onProgress
  );

  let plain: Uint8Array;
  try {
    plain = gcm(key, hexToBytes(envelope.cipher.nonce), associatedData(envelope.version)).decrypt(
      hexToBytes(envelope.data)
    );
  } catch {
    return { ok: false, reason: "wrong-password" };
  }

  const payload = parsePayload(utf8Decode(plain));
  return payload ? { ok: true, payload } : { ok: false, reason: "invalid-file" };
}

/** Nombre del archivo: justAnAgenda-backup-2026-09-20.json */
export function backupFileName(now: Date): string {
  return `justAnAgenda-backup-${dateToLocalDateString(now)}.json`;
}
