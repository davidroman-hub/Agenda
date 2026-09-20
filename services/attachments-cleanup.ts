import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useNotesStore from "@/stores/notes-store";
import {
  attachmentFileNames,
  orphanFileNames,
  removedFileNames,
  taskAttachmentFileNames,
  unreferencedFileNames,
} from "@/utils/attachments";
import { deleteStoredFiles, listStoredFileNames } from "./attachments-service";

/**
 * Mantiene la carpeta de adjuntos en sintonía con las fichas guardadas:
 * - cuando una tarea o una nota deja de tener un adjunto (se quita, o se borra el elemento) se borra
 *   su archivo, salvo que otra ficha lo siga usando (una ocurrencia repetida que se convierte en tarea
 *   normal comparte el archivo con la original);
 * - al arrancar se limpian los restos que nadie usa (un borrador que no se llegó a guardar).
 *
 * Todo lo que se borra pasa antes por "¿lo usa alguna ficha?".
 *
 * Al añadir otro tipo de elemento con adjuntos: sumarlo a FILE_SOURCES. Si falta ahí, la limpieza
 * trataría sus archivos como restos y los borraría.
 */

// Margen antes de borrar tras quitar un adjunto: si un flujo borra y vuelve a crear la tarea en dos
// pasos, para entonces la ficha ya está de vuelta y el archivo se conserva
const RELEASE_DELAY_MS = 5000;

/**
 * Cada sitio donde se guardan fichas de adjuntos: cómo esperar a que esté cargado, qué archivos usa
 * y cómo enterarse de que ha cambiado la lista de archivos que usa.
 */
interface FileSource {
  hasHydrated: () => boolean;
  onFinishHydration: (listener: () => void) => () => void;
  fileNames: () => Set<string>;
  // Avisa (con los archivos que ya no están) cuando el elemento deja de usar alguno
  watchRemovals: (onRemoved: (fileNames: string[]) => void) => () => void;
}

const FILE_SOURCES: FileSource[] = [
  {
    hasHydrated: () => useAgendaTasksStore.persist.hasHydrated(),
    onFinishHydration: (listener) => useAgendaTasksStore.persist.onFinishHydration(listener),
    fileNames: () => taskAttachmentFileNames(useAgendaTasksStore.getState().tasksByDate),
    watchRemovals: (onRemoved) =>
      useAgendaTasksStore.subscribe((state, previous) => {
        if (state.tasksByDate === previous.tasksByDate) return;
        onRemoved(
          removedFileNames(
            taskAttachmentFileNames(previous.tasksByDate),
            taskAttachmentFileNames(state.tasksByDate)
          )
        );
      }),
  },
  {
    hasHydrated: () => useNotesStore.persist.hasHydrated(),
    onFinishHydration: (listener) => useNotesStore.persist.onFinishHydration(listener),
    fileNames: () => attachmentFileNames(useNotesStore.getState().notes),
    watchRemovals: (onRemoved) =>
      useNotesStore.subscribe((state, previous) => {
        if (state.notes === previous.notes) return;
        onRemoved(
          removedFileNames(attachmentFileNames(previous.notes), attachmentFileNames(state.notes))
        );
      }),
  },
];

export function getFileNamesInUse(): Set<string> {
  const inUse = new Set<string>();
  for (const source of FILE_SOURCES) {
    for (const fileName of source.fileNames()) inUse.add(fileName);
  }
  return inUse;
}

/** Borra, de estos candidatos, los archivos que ninguna ficha usa. Devuelve los que borró. */
export function releaseUnusedFiles(
  candidates: Iterable<string>,
  inUse: ReadonlySet<string> = getFileNamesInUse()
): string[] {
  const toDelete = unreferencedFileNames(candidates, inUse);
  if (toDelete.length > 0) deleteStoredFiles(toDelete);
  return toDelete;
}

/**
 * Borra los archivos huérfanos con más de un día. Debe llamarse solo con TODOS los stores ya
 * cargados (con uno vacío por no haberse leído aún, sus archivos parecerían huérfanos).
 */
export function sweepOrphanFiles(now: number = Date.now()): string[] {
  try {
    const orphans = orphanFileNames({
      stored: listStoredFileNames(),
      inUse: getFileNamesInUse(),
      now,
    });
    if (orphans.length > 0) deleteStoredFiles(orphans);
    return orphans;
  } catch (error) {
    console.warn("No se pudo limpiar la carpeta de adjuntos:", error);
    return [];
  }
}

/** Arranca la limpieza cuando todo está cargado. Devuelve la función que la detiene. */
export function startAttachmentCleanup(releaseDelayMs: number = RELEASE_DELAY_MS): () => void {
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const stopFunctions: Array<() => void> = [];
  let stopped = false;

  const flush = () => {
    timer = null;
    const candidates = [...pending];
    pending.clear();
    try {
      releaseUnusedFiles(candidates);
    } catch (error) {
      console.warn("No se pudieron liberar adjuntos:", error);
    }
  };

  const onRemoved = (fileNames: string[]) => {
    if (fileNames.length === 0) return;
    for (const fileName of fileNames) pending.add(fileName);
    timer ??= setTimeout(flush, releaseDelayMs);
  };

  const begin = () => {
    if (stopped) return;
    sweepOrphanFiles();
    for (const source of FILE_SOURCES) stopFunctions.push(source.watchRemovals(onRemoved));
  };

  // Se espera a que hayan terminado de cargar todos los stores antes de mirar nada. Se cuentan los
  // pendientes primero y se registran los avisos después; cada aviso cuenta una sola vez
  const notLoaded = FILE_SOURCES.filter((source) => !source.hasHydrated());
  let waiting = notLoaded.length;
  if (waiting === 0) {
    begin();
  } else {
    for (const source of notLoaded) {
      let counted = false;
      stopFunctions.push(
        source.onFinishHydration(() => {
          if (counted) return;
          counted = true;
          waiting--;
          if (waiting === 0) begin();
        })
      );
    }
  }

  return () => {
    stopped = true;
    for (const stop of stopFunctions) stop();
    if (timer) clearTimeout(timer);
  };
}
