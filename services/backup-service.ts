import { notificationService } from "@/services/notifications/notification-service";
import { RepeatedTaskNotificationService } from "@/services/repeated-task-notification-service";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useBookSettingsStore from "@/stores/boook-settings";
import useFontSettingsStore from "@/stores/font-settings-store";
import useNotesStore from "@/stores/notes-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import useTaskTypesStore from "@/stores/task-types-store";
import useThemeStore from "@/stores/theme-store";
import {
  applyNotificationIds,
  BACKUP_STORE_KEYS,
  BackupFailure,
  BackupStoreKey,
  backupFileName,
  buildBackupPayload,
  decryptBackup,
  encryptBackup,
  listPendingReminders,
  prepareRestore,
} from "@/utils/backup";
import { notificationTexts } from "@/utils/notification-texts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import pjson from "../app.json";

/**
 * Copia de seguridad en un archivo cifrado con contraseña (el formato y el cifrado están en
 * utils/backup.ts). Aquí vive lo que toca el móvil: leer y escribir el disco, el selector y la hoja de
 * compartir, y volver a programar los recordatorios.
 *
 * Los módulos nativos nuevos (aleatoriedad segura, selector, compartir) se cargan al usarlos, no al
 * arrancar: con un binario anterior sin ellos solo falla la copia, no la app.
 */

export type CreateBackupResult =
  | { status: "created"; uri: string; fileName: string; droppedNotes: number }
  | { status: "error"; reason: "unavailable" | "failed" };

export type ShareBackupResult = "shared" | "unavailable";

export type PickBackupResult =
  | { status: "picked"; text: string }
  | { status: "cancelled" }
  | { status: "error"; reason: "unavailable" | "too-large" | "failed" };

export type RestoreResult =
  | { status: "restored"; createdAt: string }
  | { status: "error"; reason: BackupFailure | "failed" };

interface ProgressOptions {
  // Avance de la derivación de la clave (de 0 a 1), para enseñar una barra
  onProgress?: (fraction: number) => void;
}

// Una copia real pesa poco (solo texto); esto evita leer a memoria un archivo cualquiera enorme
const MAX_BACKUP_FILE_BYTES = 30 * 1024 * 1024;
const BACKUP_CACHE_DIR = "backups";

/* eslint-disable @typescript-eslint/no-require-imports */
const loadCrypto = (): typeof import("expo-crypto") => require("expo-crypto");
const loadDocumentPicker = (): typeof import("expo-document-picker") => require("expo-document-picker");
const loadSharing = (): typeof import("expo-sharing") => require("expo-sharing");
/* eslint-enable @typescript-eslint/no-require-imports */

// Todos los stores que entran en la copia, para recargarlos tras restaurar
const STORES: Record<BackupStoreKey, { persist: { rehydrate: () => Promise<void> | void } }> = {
  "agenda-tasks-storage": useAgendaTasksStore,
  "notes-storage": useNotesStore,
  "repeating-tasks-storage": useRepeatingTasksStore,
  "task-types-storage": useTaskTypesStore,
  "book-settings-storage": useBookSettingsStore,
  "font-settings-storage": useFontSettingsStore,
  "theme-storage": useThemeStore,
};

function deleteQuietly(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch (error) {
    console.warn("No se pudo borrar un archivo:", error);
  }
}

/**
 * Lee lo que hay guardado, lo cifra con la contraseña y deja el archivo en la caché de la app,
 * listo para compartir. Sin adjuntos. Solo hay un archivo de copia en la caché: el anterior se borra.
 */
export async function createBackupFile(
  password: string,
  options: ProgressOptions & { now?: Date } = {}
): Promise<CreateBackupResult> {
  let randomBytes: (length: number) => Uint8Array;
  try {
    randomBytes = loadCrypto().getRandomBytes;
  } catch (error) {
    console.warn("Aleatoriedad segura no disponible:", error);
    return { status: "error", reason: "unavailable" };
  }

  const now = options.now ?? new Date();
  let droppedNotes = 0;

  try {
    const text = await encryptBackup(
      password,
      async () => {
        const entries = Object.fromEntries(await AsyncStorage.multiGet([...BACKUP_STORE_KEYS]));
        const built = buildBackupPayload(entries, { now, appVersion: pjson.expo.version });
        droppedNotes = built.droppedNotes;
        return built.payload;
      },
      randomBytes,
      { onProgress: options.onProgress }
    );

    const directory = new Directory(Paths.cache, BACKUP_CACHE_DIR);
    if (directory.exists) directory.delete();
    directory.create({ intermediates: true, idempotent: true });

    const fileName = backupFileName(now);
    const file = new File(directory, fileName);
    file.create();
    file.write(text);

    return { status: "created", uri: file.uri, fileName, droppedNotes };
  } catch (error) {
    console.warn("No se pudo crear la copia:", error);
    return { status: "error", reason: "failed" };
  }
}

/** Ofrece el archivo a otras apps (Archivos, Drive, AirDrop, correo…) */
export async function shareBackupFile(uri: string, fileName: string): Promise<ShareBackupResult> {
  try {
    const Sharing = loadSharing();
    if (!(await Sharing.isAvailableAsync())) return "unavailable";
    await Sharing.shareAsync(uri, {
      mimeType: "application/json",
      UTI: "public.json",
      dialogTitle: fileName,
    });
    return "shared";
  } catch (error) {
    console.warn("No se pudo compartir la copia:", error);
    return "unavailable";
  }
}

/** Abre el selector del sistema y lee el archivo elegido (sin tocar el original) */
export async function pickBackupFile(): Promise<PickBackupResult> {
  let result;
  try {
    result = await loadDocumentPicker().getDocumentAsync({
      type: "*/*",
      multiple: false,
      copyToCacheDirectory: true,
    });
  } catch (error) {
    console.warn("Selector de archivos no disponible:", error);
    return { status: "error", reason: "unavailable" };
  }

  const asset = result.canceled ? undefined : result.assets?.[0];
  if (!asset) return { status: "cancelled" };

  const source = new File(asset.uri);
  // Solo se borra la copia temporal del selector, nunca el archivo del usuario
  const sourceIsTemporary = source.uri.startsWith(Paths.cache.uri);

  try {
    if (source.size > MAX_BACKUP_FILE_BYTES) return { status: "error", reason: "too-large" };
    return { status: "picked", text: await source.text() };
  } catch (error) {
    console.warn("No se pudo leer el archivo de copia:", error);
    return { status: "error", reason: "failed" };
  } finally {
    if (sourceIsTemporary) deleteQuietly(source);
  }
}

// Las notificaciones programadas no viajan con la copia: se cancelan las de este móvil (eran de los
// datos que se reemplazan) y se programan las de las tareas restauradas. Nunca hace fallar la restauración.
async function rescheduleReminders(now: Date): Promise<void> {
  try {
    await notificationService.cancelAllTaskReminders();

    const notificationIds: Record<string, string | null> = {};
    for (const reminder of listPendingReminders(useAgendaTasksStore.getState().tasksByDate, now)) {
      notificationIds[reminder.id] = await notificationService.scheduleTaskReminder(
        reminder.id,
        reminder.text,
        notificationTexts.taskScheduledFor(reminder.date),
        new Date(reminder.reminder),
        reminder.date
      );
    }
    useAgendaTasksStore.setState({
      tasksByDate: applyNotificationIds(useAgendaTasksStore.getState().tasksByDate, notificationIds),
    });

    // Los avisos de las tareas repetidas los planifica su propio servicio
    await RepeatedTaskNotificationService.syncScheduledNotifications();
  } catch (error) {
    console.warn("No se pudieron volver a programar los recordatorios:", error);
  }
}

/**
 * Abre la copia con la contraseña y REEMPLAZA los datos de este móvil por los suyos: escribe en el
 * disco, recarga los stores (las pantallas y el widget se actualizan solos) y reprograma los recordatorios.
 */
export async function restoreBackup(
  text: string,
  password: string,
  options: ProgressOptions & { now?: Date } = {}
): Promise<RestoreResult> {
  let decrypted;
  try {
    decrypted = await decryptBackup(text, password, { onProgress: options.onProgress });
  } catch (error) {
    console.warn("No se pudo abrir la copia:", error);
    return { status: "error", reason: "failed" };
  }
  if (!decrypted.ok) return { status: "error", reason: decrypted.reason };

  const writes = prepareRestore(decrypted.payload);
  const keys = Object.keys(writes) as BackupStoreKey[];

  try {
    await AsyncStorage.multiSet(keys.map((key): [string, string] => [key, writes[key]!]));
    await Promise.all(keys.map((key) => STORES[key].persist.rehydrate()));
  } catch (error) {
    console.warn("No se pudo restaurar la copia:", error);
    return { status: "error", reason: "failed" };
  }

  await rescheduleReminders(options.now ?? new Date());
  return { status: "restored", createdAt: decrypted.payload.createdAt };
}
