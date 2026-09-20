// Archivos adjuntos: lógica pura, acceso al disco, limpieza de archivos, copia de seguridad y textos
const { m, t } = require("./_helpers");

const U = "utils/attachments.ts";
const UT = "__tests__/attachments.test.ts";
const S = "services/attachments-service.ts";
const ST = "__tests__/attachments-service.test.ts";
const C = "services/attachments-cleanup.ts";
const CT = "__tests__/attachments-cleanup.test.ts";
const NC = "__tests__/native-config.test.ts";
const I18N = "__tests__/feature-i18n.test.ts";

module.exports = [
  // --- lógica pura (utils/attachments.ts)
  m(U, 'if (!(input.size > 0)) return "empty";', 'if (input.size < 0) return "empty";', UT, "un archivo vacío ya no se rechaza"),
  m(U, "if (input.size > MAX_ATTACHMENT_BYTES)", "if (input.size >= MAX_ATTACHMENT_BYTES)", UT, "el límite de tamaño deja de ser inclusivo"),
  m(U, 'if (input.existingCount >= MAX_ATTACHMENTS_PER_ITEM) return "too-many";', 'if (input.existingCount > MAX_ATTACHMENTS_PER_ITEM) return "too-many";', UT, "un adjunto de más (off-by-one en el máximo)"),
  m(U, "if (inUse.size === 0) return [];", "", UT, "el barrido borra todo si no hay ningún archivo en uso"),
  m(U, "return !inUse.has(name) && now - createdAt > graceMs;", "return !inUse.has(name);", UT, "el barrido no respeta el margen de un día"),
  m(U, "return !inUse.has(name) && now - createdAt > graceMs;", "return now - createdAt > graceMs;", UT, "el barrido borra archivos que aún están en uso"),
  m(U, "const STORED_FILE_NAME = /^att_", "const STORED_FILE_NAME = /att_", UT, "un nombre con ../ pasa por nombre de archivo seguro"),
  m(U, "if (createdAt === null) return false;", "", UT, "el barrido toca archivos que no son nuestros"),
  m(U, ".filter((name) => isStoredFileName(name) && !inUse.has(name))", ".filter((name) => !inUse.has(name))", UT, "se proponen borrar nombres sin validar"),
  m(U, "return draft.map((attachment) => attachment.fileName).filter((name) => !originalNames.has(name));", "return draft.map((attachment) => attachment.fileName);", UT, "cancelar un borrador tira también los archivos originales"),
  m(U, 'if (dot <= 0) return "";', 'if (dot < 0) return "";', UT, ".bashrc pasa por tener extensión"),

  // --- acceso al disco (services/attachments-service.ts)
  m(S, "const sourceIsTemporary = source.uri.startsWith(Paths.cache.uri);", "const sourceIsTemporary = true;", ST, "se borra el ARCHIVO ORIGINAL del usuario"),
  m(S, "if (destination) deleteQuietly(destination);", "", ST, "una copia fallida deja restos en la carpeta"),
  m(S, 'if (existingCount >= MAX_ATTACHMENTS_PER_ITEM) return { status: "error", reason: "too-many" };', "", ST, "se abre el selector aun con el máximo de adjuntos"),
  m(S, "const name = sanitizeDisplayName(asset.name);", "const name = asset.name;", ST, "un nombre con ruta no se sanea"),
  m(S, "if (!isStoredFileName(attachment.fileName)) return null;", "", ST, "una ficha con nombre inseguro toca el disco"),
  m(S, "if (!isStoredFileName(fileName)) continue;", "", ST, "deleteStoredFiles no valida el nombre (ruta con ..)"),
  m(S, "flags: 1, // FLAG_GRANT_READ_URI_PERMISSION", "flags: 0,", ST, "se abre un archivo sin permiso de lectura"),
  m(S, "const contentUri = await legacyFileSystem.getContentUriAsync(file.uri);", "const contentUri = file.uri;", ST, "se pasa un file:// a otra app en vez de un content://"),
  m(
    S,
    `    } catch (error) {
      console.warn("Ninguna app pudo abrir el adjunto, se ofrece compartirlo:", error);
    }`,
    `    } catch (error) {
      return "unavailable";
    }`,
    ST,
    "sin plan B (compartir) cuando ninguna app abre el archivo"
  ),
  m(S, "if (!(await Sharing.isAvailableAsync())) return \"unavailable\";", "", ST, "se comparte sin comprobar que se puede"),
  m(S, "directory.create({ intermediates: true, idempotent: true });", "", ST, "no se crea la carpeta de adjuntos"),
  m(S, "const size = source.size > 0 ? source.size : (asset.size ?? 0);", "const size = asset.size ?? source.size;", ST, "se valida el tamaño que dice el selector, no el real"),

  // --- limpieza de archivos (services/attachments-cleanup.ts)
  m(C, "timer ??= setTimeout(flush, releaseDelayMs);", "flush();", CT, "los archivos se liberan sin el margen de espera"),
  m(C, "      releaseUnusedFiles(candidates);", "      deleteStoredFiles(candidates);", CT, "se borra sin comprobar si otra ficha usa el archivo"),
  m(C, "let waiting = notLoaded.length;", "let waiting = 0;", CT, "se limpia sin esperar a que carguen los stores"),
  m(C, "    if (stopped) return;", "", CT, "la limpieza actúa aunque se haya detenido"),
  m(C, "    if (timer) clearTimeout(timer);", "", CT, "detener no cancela lo pendiente"),
  m(C, "    for (const stop of stopFunctions) stop();", "", CT, "detener no deja de vigilar"),
  m(C, "          if (counted) return;", "", CT, "un aviso de carga duplicado adelanta el arranque"),
  m(C, "fileNames: () => taskAttachmentFileNames(useAgendaTasksStore.getState().tasksByDate),", "fileNames: () => new Set(),", CT, "los archivos de las tareas no cuentan como en uso"),
  m(C, "fileNames: () => attachmentFileNames(useNotesStore.getState().notes),", "fileNames: () => new Set(),", CT, "los archivos de las notas no cuentan como en uso"),
  m(C, "if (state.notes === previous.notes) return;", "return;", CT, "no se vigilan los adjuntos de las notas"),
  m(C, "if (state.tasksByDate === previous.tasksByDate) return;", "", CT, "solo cambia el rendimiento: recalcula aunque las tareas no hayan cambiado", { equivalent: "optimización, no cambia el resultado" }),

  // --- copia de seguridad de Android y política de privacidad (native-config.test.ts)
  m("android/app/src/main/res/xml/backup_rules.xml", '<exclude domain="file" path="attachments/" />', "", NC, "Android 11 o anterior: los adjuntos entran en la copia en la nube"),
  m("android/app/src/main/res/xml/data_extraction_rules.xml", '<exclude domain="file" path="attachments/" />', "", NC, "Android 12+: los adjuntos entran en la copia en la nube"),
  m("android/app/src/main/res/xml/data_extraction_rules.xml", "<cloud-backup>", "<device-transfer>", NC, "la exclusión está en el traspaso y no en la nube"),
  m("android/app/src/main/AndroidManifest.xml", ' android:fullBackupContent="@xml/backup_rules"', "", NC, "el manifest no apunta a las reglas de copia (Android 11)"),
  m("android/app/src/main/AndroidManifest.xml", ' android:dataExtractionRules="@xml/data_extraction_rules"', "", NC, "el manifest no apunta a las reglas de copia (Android 12+)"),
  t(
    "app-store-assets/privacy-policy-multilang.html",
    (src) => {
      const start = src.indexOf('<article data-l="fr"');
      const end = src.indexOf("</article>", start);
      return src.slice(0, start) + src.slice(start, end).replace(/joint/gi, "XXX") + src.slice(end);
    },
    NC,
    "la política en francés no menciona los adjuntos"
  ),

  // --- traducciones (feature-i18n.test.ts)
  m("locales/fr/common.json", '"share": "Partager"', '"shareX": "Partager"', I18N, "a francés le falta una clave de adjuntos"),
  m("locales/it/common.json", "Il file supera {{max}}.", "Il file è troppo grande.", I18N, "una traducción pierde el {{max}}"),
];
