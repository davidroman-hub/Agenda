import {
  Attachment,
  ATTACHMENTS_DIR_NAME,
  buildStoredFileName,
  createAttachmentId,
  guessMimeType,
  isStoredFileName,
  MAX_ATTACHMENTS_PER_ITEM,
  sanitizeDisplayName,
  validateNewAttachment,
} from "@/utils/attachments";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

/**
 * Archivos adjuntos en el disco. El selector de archivos del sistema (Storage Access Framework
 * en Android) no necesita permisos: el usuario elige el archivo y la app recibe solo ese.
 *
 * Los módulos nativos de selector, visor y compartir se cargan al usarlos, no al arrancar: si la
 * app se ejecuta con un binario sin ellos (una compilación anterior) solo falla adjuntar, no la app.
 */

export type PickFailure = "unavailable" | "too-large" | "too-many" | "empty" | "failed";

export type PickResult =
  | { status: "picked"; attachment: Attachment }
  | { status: "cancelled" }
  | { status: "error"; reason: PickFailure };

export type OpenResult = "opened" | "shared" | "missing" | "unavailable";

// Carga perezosa: `require` lanza si el binario no lleva el módulo nativo, y quien llama lo captura.
// (Con `import()` dinámico no se podría probar: el jest de este proyecto no lo soporta.)
/* eslint-disable @typescript-eslint/no-require-imports */
const loadDocumentPicker = (): typeof import("expo-document-picker") => require("expo-document-picker");
const loadSharing = (): typeof import("expo-sharing") => require("expo-sharing");
const loadIntentLauncher = (): typeof import("expo-intent-launcher") => require("expo-intent-launcher");
const loadLegacyFileSystem = (): typeof import("expo-file-system/legacy") => require("expo-file-system/legacy");
/* eslint-enable @typescript-eslint/no-require-imports */

function getAttachmentsDirectory(): Directory {
  return new Directory(Paths.document, ATTACHMENTS_DIR_NAME);
}

// Borra sin lanzar: un archivo que ya no está no es un error, y limpiar nunca debe romper un flujo
function deleteQuietly(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch (error) {
    console.warn("No se pudo borrar un archivo:", error);
  }
}

/** El archivo guardado de un adjunto; null si su nombre no es uno de los nuestros (ficha corrupta) */
export function getAttachmentFile(attachment: Pick<Attachment, "fileName">): File | null {
  if (!isStoredFileName(attachment.fileName)) return null;
  return new File(getAttachmentsDirectory(), attachment.fileName);
}

export function attachmentExists(attachment: Pick<Attachment, "fileName">): boolean {
  try {
    return getAttachmentFile(attachment)?.exists ?? false;
  } catch {
    return false;
  }
}

/** Dirección (file://) para enseñar el archivo dentro de la app, o null si no está */
export function getAttachmentUri(attachment: Pick<Attachment, "fileName">): string | null {
  try {
    const file = getAttachmentFile(attachment);
    return file?.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/**
 * Abre el selector del sistema y copia el archivo elegido a la carpeta privada de la app.
 * Nunca se toca el archivo original del usuario: solo se borra la copia temporal que hace el
 * selector, y solo si está en la caché de la app.
 */
export async function pickAndStoreAttachment(
  existingCount: number,
  now: number = Date.now(),
  random: number = Math.random()
): Promise<PickResult> {
  if (existingCount >= MAX_ATTACHMENTS_PER_ITEM) return { status: "error", reason: "too-many" };

  let result;
  try {
    const picker = loadDocumentPicker();
    result = await picker.getDocumentAsync({
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
  const sourceIsTemporary = source.uri.startsWith(Paths.cache.uri);
  let destination: File | null = null;

  try {
    // El tamaño real de la copia manda; el que informa el selector es solo el plan B
    const size = source.size > 0 ? source.size : (asset.size ?? 0);
    const rejection = validateNewAttachment({ size, existingCount });
    if (rejection) return { status: "error", reason: rejection };

    const name = sanitizeDisplayName(asset.name);
    const id = createAttachmentId(now, random);
    const fileName = buildStoredFileName(id, name);

    const directory = getAttachmentsDirectory();
    directory.create({ intermediates: true, idempotent: true });
    destination = new File(directory, fileName);
    source.copy(destination);

    return {
      status: "picked",
      attachment: {
        id,
        name,
        fileName,
        mimeType: guessMimeType(name, asset.mimeType),
        size,
        addedAt: new Date(now).toISOString(),
      },
    };
  } catch (error) {
    console.warn("No se pudo guardar el adjunto:", error);
    // Que no quede una copia a medias
    if (destination) deleteQuietly(destination);
    return { status: "error", reason: "failed" };
  } finally {
    if (sourceIsTemporary) deleteQuietly(source);
  }
}

/** Borra archivos guardados por nombre. Ignora todo lo que no lleve nuestro nombre. */
export function deleteStoredFiles(fileNames: Iterable<string>): void {
  for (const fileName of fileNames) {
    if (!isStoredFileName(fileName)) continue;
    deleteQuietly(new File(getAttachmentsDirectory(), fileName));
  }
}

/** Nombres de los archivos que hay ahora mismo en la carpeta de adjuntos */
export function listStoredFileNames(): string[] {
  try {
    const directory = getAttachmentsDirectory();
    if (!directory.exists) return [];
    return directory
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .map((entry) => entry.name);
  } catch (error) {
    console.warn("No se pudo leer la carpeta de adjuntos:", error);
    return [];
  }
}

/** Ofrece el archivo a otras apps (guardar, enviar…) */
export async function shareAttachment(
  attachment: Pick<Attachment, "fileName" | "mimeType" | "name">
): Promise<"shared" | "missing" | "unavailable"> {
  try {
    const file = getAttachmentFile(attachment);
    if (!file?.exists) return "missing";

    const Sharing = loadSharing();
    if (!(await Sharing.isAvailableAsync())) return "unavailable";
    await Sharing.shareAsync(file.uri, {
      mimeType: attachment.mimeType,
      dialogTitle: attachment.name,
    });
    return "shared";
  } catch (error) {
    console.warn("No se pudo compartir el adjunto:", error);
    return "unavailable";
  }
}

/**
 * Abre el archivo con la app del sistema que sepa leerlo (visor de PDF, etc.). Si no hay ninguna,
 * o el módulo no está en esta compilación, se ofrece compartirlo.
 */
export async function openAttachment(
  attachment: Pick<Attachment, "fileName" | "mimeType" | "name">
): Promise<OpenResult> {
  const file = getAttachmentFile(attachment);
  if (!file?.exists) return "missing";

  if (Platform.OS === "android") {
    try {
      const legacyFileSystem = loadLegacyFileSystem();
      const IntentLauncher = loadIntentLauncher();
      // Otra app no puede leer un file:// de la nuestra: hace falta un content:// con permiso de lectura
      const contentUri = await legacyFileSystem.getContentUriAsync(file.uri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: attachment.mimeType,
      });
      return "opened";
    } catch (error) {
      console.warn("Ninguna app pudo abrir el adjunto, se ofrece compartirlo:", error);
    }
  }

  return shareAttachment(attachment);
}
