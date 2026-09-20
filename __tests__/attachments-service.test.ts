/**
 * Servicio de archivos adjuntos con un sistema de archivos falso en memoria.
 * Lo importante: que nunca se toque el archivo original del usuario, que un fallo no deje restos,
 * y que un nombre de archivo raro no pueda sacar una operación de la carpeta de adjuntos.
 */
import { Platform } from "react-native";

// Sistema de archivos falso: solo lo que usa el servicio (File, Directory, Paths)
jest.mock("expo-file-system", () => {
  const files = new Map<string, { size: number }>();
  const directories = new Set<string>();
  const state = { failNextCopy: false };

  // Como un sistema de archivos real (y como el constructor de expo-file-system): resuelve "." y ".."
  const join = (parts: unknown[]): string => {
    const [first, ...rest] = parts.map((part) =>
      typeof part === "string" ? part : (part as { uri: string }).uri
    );
    const [scheme, path] = first.replace(/\/+$/, "").split("://");
    const segments: string[] = [];
    for (const segment of [...path.split("/"), ...rest.flatMap((part) => part.split("/"))]) {
      if (segment === "..") segments.pop();
      else if (segment !== "." && segment !== "") segments.push(segment);
    }
    return `${scheme}:///${segments.join("/")}`;
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
    list() {
      return [...files.keys()]
        .filter((uri) => uri.startsWith(this.uri) && !uri.slice(this.uri.length).includes("/"))
        .map((uri) => new File(uri));
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
      return files.get(this.uri)?.size ?? 0;
    }
    get name() {
      return this.uri.split("/").pop()!;
    }
    copy(destination: File) {
      if (state.failNextCopy) {
        state.failNextCopy = false;
        // Como un disco lleno: deja la copia a medias
        files.set(destination.uri, { size: 1 });
        throw new Error("sin espacio");
      }
      if (!files.has(this.uri)) throw new Error("no existe el origen");
      // Un disco real no crea la carpeta destino por su cuenta
      const parent = destination.uri.slice(0, destination.uri.lastIndexOf("/") + 1);
      if (!directories.has(parent)) throw new Error("no existe la carpeta destino");
      files.set(destination.uri, { size: this.size });
    }
    delete() {
      if (!files.has(this.uri)) throw new Error("no existe");
      files.delete(this.uri);
    }
  }

  return {
    File,
    Directory,
    Paths: { document: new Directory("file:///data/doc"), cache: new Directory("file:///data/cache") },
    __fs: { files, directories, state },
  };
});

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock("expo-intent-launcher", () => ({ startActivityAsync: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({
  getContentUriAsync: jest.fn(async (uri: string) => uri.replace("file://", "content://provider")),
}));

import * as IntentLauncher from "expo-intent-launcher";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import {
  attachmentExists,
  deleteStoredFiles,
  getAttachmentFile,
  getAttachmentUri,
  listStoredFileNames,
  openAttachment,
  pickAndStoreAttachment,
  shareAttachment,
} from "../services/attachments-service";
import { isStoredFileName, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_ITEM } from "../utils/attachments";

const { __fs: fs } = jest.requireMock("expo-file-system") as {
  __fs: { files: Map<string, { size: number }>; directories: Set<string>; state: { failNextCopy: boolean } };
};
const getDocumentAsync = DocumentPicker.getDocumentAsync as jest.Mock;
const startActivityAsync = IntentLauncher.startActivityAsync as jest.Mock;
const isAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const shareAsync = Sharing.shareAsync as jest.Mock;

const ATTACHMENTS = "file:///data/doc/attachments/";
const NOW = Date.UTC(2026, 8, 20, 12, 0, 0);
const originalOS = Platform.OS;
let warn: jest.SpyInstance;

// El selector deja una copia temporal en la caché de la app y devuelve su dirección
function pickerReturns(asset: Partial<{ uri: string; name: string; size: number; mimeType: string }>) {
  const uri = asset.uri ?? "file:///data/cache/DocumentPicker/abc-1234.pdf";
  if (!fs.files.has(uri)) fs.files.set(uri, { size: asset.size ?? 2048 });
  getDocumentAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri, name: "Contrato.pdf", mimeType: "application/pdf", size: 2048, ...asset }],
  });
  return uri;
}

const storedNames = () => [...fs.files.keys()].filter((uri) => uri.startsWith(ATTACHMENTS)).map((uri) => uri.slice(ATTACHMENTS.length));

beforeEach(() => {
  fs.files.clear();
  fs.directories.clear();
  fs.state.failNextCopy = false;
  jest.clearAllMocks();
  warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  (Platform as { OS: string }).OS = originalOS;
});

afterEach(() => {
  warn.mockRestore();
  (Platform as { OS: string }).OS = originalOS;
});

// Deja un adjunto ya guardado en la carpeta y devuelve su ficha
function storeFile(name: string, size = 500) {
  const fileName = name;
  fs.directories.add(ATTACHMENTS);
  fs.files.set(ATTACHMENTS + fileName, { size });
  return { fileName, mimeType: "application/pdf", name: "Documento.pdf" };
}

describe("pickAndStoreAttachment", () => {
  it("copia el archivo a la carpeta de adjuntos y devuelve su ficha", async () => {
    pickerReturns({ name: "Contrato 2026.pdf", size: 4096 });

    const result = await pickAndStoreAttachment(0, NOW, 0.5);

    expect(result.status).toBe("picked");
    if (result.status !== "picked") return;
    const { attachment } = result;
    expect(attachment.name).toBe("Contrato 2026.pdf");
    expect(attachment.mimeType).toBe("application/pdf");
    expect(attachment.size).toBe(4096);
    expect(attachment.addedAt).toBe(new Date(NOW).toISOString());
    expect(isStoredFileName(attachment.fileName)).toBe(true);
    expect(attachment.fileName.endsWith(".pdf")).toBe(true);
    expect(storedNames()).toEqual([attachment.fileName]);
  });

  it("borra la copia temporal del selector una vez guardada", async () => {
    const temp = pickerReturns({});
    await pickAndStoreAttachment(0, NOW, 0.5);
    expect(fs.files.has(temp)).toBe(false);
  });

  it("NUNCA borra un archivo original que no esté en la caché de la app", async () => {
    const original = pickerReturns({ uri: "file:///storage/emulated/0/Download/Contrato.pdf" });
    const result = await pickAndStoreAttachment(0, NOW, 0.5);
    expect(result.status).toBe("picked");
    expect(fs.files.has(original)).toBe(true);
  });

  it("si el usuario cancela no se copia nada", async () => {
    getDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(pickAndStoreAttachment(0)).resolves.toEqual({ status: "cancelled" });
    expect(storedNames()).toEqual([]);
  });

  it("con el máximo de adjuntos ni siquiera abre el selector", async () => {
    await expect(pickAndStoreAttachment(MAX_ATTACHMENTS_PER_ITEM)).resolves.toEqual({
      status: "error",
      reason: "too-many",
    });
    expect(getDocumentAsync).not.toHaveBeenCalled();
  });

  it("rechaza un archivo demasiado grande, sin copiarlo, y limpia la copia temporal", async () => {
    const temp = pickerReturns({ size: MAX_ATTACHMENT_BYTES + 1 });
    await expect(pickAndStoreAttachment(0)).resolves.toEqual({ status: "error", reason: "too-large" });
    expect(storedNames()).toEqual([]);
    expect(fs.files.has(temp)).toBe(false);
  });

  it("valida con el tamaño real del archivo aunque el selector diga otra cosa", async () => {
    // El selector informa de 100 bytes, pero lo que hay en disco es enorme
    const temp = pickerReturns({ size: 100 });
    fs.files.set(temp, { size: MAX_ATTACHMENT_BYTES + 1 });
    await expect(pickAndStoreAttachment(0)).resolves.toEqual({ status: "error", reason: "too-large" });
    expect(storedNames()).toEqual([]);
  });

  it("guarda el tamaño real de la copia, no el que informó el selector", async () => {
    const temp = pickerReturns({ size: 100 });
    fs.files.set(temp, { size: 6000 });
    const result = await pickAndStoreAttachment(0, NOW, 0.5);
    expect(result.status === "picked" && result.attachment.size).toBe(6000);
  });

  it("rechaza un archivo vacío", async () => {
    pickerReturns({ size: 0 });
    await expect(pickAndStoreAttachment(0)).resolves.toEqual({ status: "error", reason: "empty" });
    expect(storedNames()).toEqual([]);
  });

  it("si el selector no informa del tamaño, lo lee del archivo", async () => {
    pickerReturns({ size: undefined });
    fs.files.set("file:///data/cache/DocumentPicker/abc-1234.pdf", { size: 7777 });
    const result = await pickAndStoreAttachment(0, NOW, 0.5);
    expect(result.status === "picked" && result.attachment.size).toBe(7777);
  });

  it("un nombre con ruta no puede sacar el archivo de la carpeta de adjuntos", async () => {
    pickerReturns({ name: "../../../etc/evil.pdf" });
    const result = await pickAndStoreAttachment(0, NOW, 0.5);
    expect(result.status).toBe("picked");
    if (result.status !== "picked") return;
    expect(result.attachment.name).toBe("evil.pdf");
    expect(result.attachment.fileName).not.toContain("/");
    expect([...fs.files.keys()].every((uri) => uri.startsWith("file:///data/"))).toBe(true);
  });

  it("deduce el tipo por la extensión si el selector da uno genérico", async () => {
    pickerReturns({ name: "foto.PNG", mimeType: "application/octet-stream" });
    const result = await pickAndStoreAttachment(0, NOW, 0.5);
    expect(result.status === "picked" && result.attachment.mimeType).toBe("image/png");
  });

  it("si el selector falla (módulo no disponible en esta compilación) lo dice, sin lanzar", async () => {
    getDocumentAsync.mockRejectedValueOnce(new Error("Cannot find native module 'ExpoDocumentPicker'"));
    await expect(pickAndStoreAttachment(0)).resolves.toEqual({ status: "error", reason: "unavailable" });
  });

  it("si la copia falla a medias no deja restos en la carpeta", async () => {
    pickerReturns({});
    fs.state.failNextCopy = true;
    await expect(pickAndStoreAttachment(0, NOW, 0.5)).resolves.toEqual({ status: "error", reason: "failed" });
    expect(storedNames()).toEqual([]);
  });

  it("dos adjuntos seguidos no se pisan", async () => {
    pickerReturns({ uri: "file:///data/cache/DocumentPicker/a.pdf" });
    pickerReturns({ uri: "file:///data/cache/DocumentPicker/b.pdf" });
    const first = await pickAndStoreAttachment(0, NOW, 0.1);
    const second = await pickAndStoreAttachment(1, NOW, 0.2);
    expect(storedNames()).toHaveLength(2);
    expect(first.status === "picked" && second.status === "picked" && first.attachment.fileName !== second.attachment.fileName).toBe(true);
  });
});

describe("acceso a los archivos guardados", () => {
  it("getAttachmentFile rechaza una ficha con nombre inseguro", () => {
    expect(getAttachmentFile({ fileName: "../../secreto.db" })).toBeNull();
    expect(getAttachmentFile({ fileName: "foto.jpg" })).toBeNull();
  });

  it("attachmentExists y getAttachmentUri reflejan si el archivo está", () => {
    const stored = storeFile("att_abc_000001.pdf");
    expect(attachmentExists(stored)).toBe(true);
    expect(getAttachmentUri(stored)).toBe(ATTACHMENTS + "att_abc_000001.pdf");

    const missing = { fileName: "att_abc_000002.pdf" };
    expect(attachmentExists(missing)).toBe(false);
    expect(getAttachmentUri(missing)).toBeNull();
  });

  it("una ficha corrupta no existe ni tiene dirección", () => {
    expect(attachmentExists({ fileName: "../x" })).toBe(false);
    expect(getAttachmentUri({ fileName: "../x" })).toBeNull();
  });
});

describe("deleteStoredFiles", () => {
  it("borra los archivos indicados y deja los demás", () => {
    storeFile("att_a_000001.pdf");
    storeFile("att_a_000002.pdf");
    deleteStoredFiles(["att_a_000001.pdf"]);
    expect(storedNames()).toEqual(["att_a_000002.pdf"]);
  });

  it("ignora archivos que ya no están, sin lanzar", () => {
    storeFile("att_a_000001.pdf");
    expect(() => deleteStoredFiles(["att_zzz_000009.pdf"])).not.toThrow();
    expect(storedNames()).toEqual(["att_a_000001.pdf"]);
  });

  it("no sale de la carpeta con un nombre con '..' (por ejemplo, de una copia de seguridad manipulada)", () => {
    storeFile("att_a_000001.pdf");
    fs.files.set("file:///data/doc/secreto.db", { size: 1 });
    deleteStoredFiles(["../secreto.db", "../../doc/secreto.db"]);
    expect(fs.files.has("file:///data/doc/secreto.db")).toBe(true);
  });

  it("no borra archivos ajenos que estén dentro de la carpeta", () => {
    storeFile("att_a_000001.pdf");
    storeFile("foto-ajena.jpg");
    deleteStoredFiles(["foto-ajena.jpg", "att_a_000001.pdf"]);
    expect(storedNames()).toEqual(["foto-ajena.jpg"]);
  });
});

describe("listStoredFileNames", () => {
  it("lista los archivos de la carpeta", () => {
    storeFile("att_a_000001.pdf");
    storeFile("att_a_000002.png");
    expect(listStoredFileNames().sort()).toEqual(["att_a_000001.pdf", "att_a_000002.png"]);
  });

  it("si la carpeta no existe todavía, la lista está vacía", () => {
    expect(listStoredFileNames()).toEqual([]);
  });
});

describe("shareAttachment", () => {
  it("ofrece el archivo a otras apps", async () => {
    const stored = storeFile("att_a_000001.pdf");
    isAvailableAsync.mockResolvedValue(true);
    await expect(shareAttachment(stored)).resolves.toBe("shared");
    expect(shareAsync).toHaveBeenCalledWith(ATTACHMENTS + "att_a_000001.pdf", {
      mimeType: "application/pdf",
      dialogTitle: "Documento.pdf",
    });
  });

  it("si el archivo falta no llega a compartir", async () => {
    await expect(shareAttachment({ fileName: "att_a_000009.pdf", mimeType: "application/pdf", name: "x" })).resolves.toBe("missing");
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it("si el sistema no puede compartir, lo dice", async () => {
    const stored = storeFile("att_a_000001.pdf");
    isAvailableAsync.mockResolvedValue(false);
    await expect(shareAttachment(stored)).resolves.toBe("unavailable");
  });
});

describe("openAttachment", () => {
  it("un archivo que falta se avisa, sin abrir nada", async () => {
    (Platform as { OS: string }).OS = "android";
    await expect(openAttachment({ fileName: "att_a_000009.pdf", mimeType: "application/pdf", name: "x" })).resolves.toBe("missing");
    expect(startActivityAsync).not.toHaveBeenCalled();
  });

  it("en Android lo abre con la app del sistema, con un content:// y permiso de lectura", async () => {
    (Platform as { OS: string }).OS = "android";
    const stored = storeFile("att_a_000001.pdf");
    startActivityAsync.mockResolvedValueOnce({ resultCode: 0 });

    await expect(openAttachment(stored)).resolves.toBe("opened");

    expect(startActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "content://provider" + ATTACHMENTS.replace("file://", "") + "att_a_000001.pdf",
      flags: 1,
      type: "application/pdf",
    });
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it("en Android, si ninguna app puede abrirlo, ofrece compartirlo", async () => {
    (Platform as { OS: string }).OS = "android";
    const stored = storeFile("att_a_000001.pdf");
    startActivityAsync.mockRejectedValueOnce(new Error("No Activity found to handle Intent"));
    isAvailableAsync.mockResolvedValue(true);

    await expect(openAttachment(stored)).resolves.toBe("shared");
    expect(shareAsync).toHaveBeenCalledTimes(1);
  });

  it("en iOS lo ofrece directamente con el menú de compartir", async () => {
    (Platform as { OS: string }).OS = "ios";
    const stored = storeFile("att_a_000001.pdf");
    isAvailableAsync.mockResolvedValue(true);

    await expect(openAttachment(stored)).resolves.toBe("shared");
    expect(startActivityAsync).not.toHaveBeenCalled();
  });
});
