/**
 * La limpieza de adjuntos es la parte que puede borrar archivos del usuario, así que se prueba
 * con el store real de tareas: solo se borra lo que ninguna tarea usa, y nunca antes de que el
 * store esté cargado.
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
jest.mock("../services/attachments-service", () => ({
  deleteStoredFiles: jest.fn(),
  listStoredFileNames: jest.fn(() => []),
}));

import {
  getFileNamesInUse,
  releaseUnusedFiles,
  startAttachmentCleanup,
  sweepOrphanFiles,
} from "../services/attachments-cleanup";
import { deleteStoredFiles, listStoredFileNames } from "../services/attachments-service";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useNotesStore from "../stores/notes-store";
import { Attachment, buildStoredFileName, createAttachmentId } from "../utils/attachments";

const DAY = 24 * 60 * 60 * 1000;
const RELEASE_DELAY = 5000;
const DATE = "2026-09-20";

const deleteMock = deleteStoredFiles as jest.Mock;
const listMock = listStoredFileNames as jest.Mock;
const agenda = () => useAgendaTasksStore.getState();
const notes = () => useNotesStore.getState();

let counter = 0;
// Ficha de prueba cuyo archivo se creó hace `ageMs`
function attachment(name = "doc.pdf", ageMs = 0): Attachment {
  const id = createAttachmentId(Date.now() - ageMs, (++counter % 1000) / 1000);
  return {
    id,
    name,
    fileName: buildStoredFileName(id, name),
    mimeType: "application/pdf",
    size: 1000,
    addedAt: new Date(Date.now() - ageMs).toISOString(),
  };
}

const deletedNames = () => deleteMock.mock.calls.flatMap(([names]) => [...names]);

beforeAll(async () => {
  await useAgendaTasksStore.persist.rehydrate();
  await useNotesStore.persist.rehydrate();
});

beforeEach(() => {
  useAgendaTasksStore.setState({ tasksByDate: {}, linesStatus: {} });
  useNotesStore.setState({ notes: [] });
  jest.clearAllMocks();
  listMock.mockReturnValue([]);
});

describe("getFileNamesInUse", () => {
  it("reúne los archivos de todas las tareas", async () => {
    const a = attachment("a.pdf");
    const b = attachment("b.png");
    await agenda().addTask(DATE, 1, "Una", null, "none", null, [a]);
    await agenda().addTask("2026-09-21", 1, "Otra", null, "none", null, [b]);
    await agenda().addTask(DATE, 2, "Sin adjunto");

    expect(getFileNamesInUse()).toEqual(new Set([a.fileName, b.fileName]));
  });
});

describe("releaseUnusedFiles", () => {
  it("borra los candidatos que ninguna tarea usa y respeta los que sí", async () => {
    const used = attachment("usado.pdf");
    const free = attachment("libre.pdf");
    await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [used]);

    const deleted = releaseUnusedFiles([used.fileName, free.fileName]);

    expect(deleted).toEqual([free.fileName]);
    expect(deletedNames()).toEqual([free.fileName]);
  });

  it("si no hay nada que borrar no toca el disco", async () => {
    const used = attachment();
    await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [used]);
    expect(releaseUnusedFiles([used.fileName])).toEqual([]);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("sweepOrphanFiles", () => {
  it("borra los restos con más de un día que ninguna tarea usa", async () => {
    const used = attachment("usado.pdf", 30 * DAY);
    const oldOrphan = attachment("viejo.pdf", 3 * DAY);
    const recentOrphan = attachment("reciente.pdf", DAY / 2);
    await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [used]);
    listMock.mockReturnValue([used.fileName, oldOrphan.fileName, recentOrphan.fileName, "foto-ajena.jpg"]);

    expect(sweepOrphanFiles()).toEqual([oldOrphan.fileName]);
    expect(deletedNames()).toEqual([oldOrphan.fileName]);
  });

  it("NO borra nada si ninguna tarea usa adjuntos (el almacenamiento podría no haberse leído)", () => {
    listMock.mockReturnValue([attachment("a.pdf", 10 * DAY).fileName, attachment("b.pdf", 20 * DAY).fileName]);
    expect(sweepOrphanFiles()).toEqual([]);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("si no se puede leer la carpeta, no lanza ni borra", async () => {
    await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [attachment()]);
    listMock.mockImplementation(() => {
      throw new Error("sin acceso");
    });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(sweepOrphanFiles()).toEqual([]);
    expect(deleteMock).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("startAttachmentCleanup", () => {
  let stop: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    stop?.();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("al arrancar", () => {
    it("limpia los restos en cuanto arranca, si el store ya está cargado", async () => {
      const used = attachment("usado.pdf", 30 * DAY);
      const orphan = attachment("resto.pdf", 3 * DAY);
      await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [used]);
      listMock.mockReturnValue([used.fileName, orphan.fileName]);

      stop = startAttachmentCleanup(RELEASE_DELAY);

      expect(deletedNames()).toEqual([orphan.fileName]);
    });

    it("NO limpia nada mientras el store no esté cargado, y lo hace cuando termina de cargar", async () => {
      const used = attachment("usado.pdf", 30 * DAY);
      const orphan = attachment("resto.pdf", 3 * DAY);
      await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [used]);
      listMock.mockReturnValue([used.fileName, orphan.fileName]);

      let finishHydration: () => void = () => undefined;
      jest.spyOn(useAgendaTasksStore.persist, "hasHydrated").mockReturnValue(false);
      jest.spyOn(useAgendaTasksStore.persist, "onFinishHydration").mockImplementation((listener) => {
        finishHydration = () => listener(agenda());
        return () => undefined;
      });

      stop = startAttachmentCleanup(RELEASE_DELAY);
      expect(listMock).not.toHaveBeenCalled();
      expect(deleteMock).not.toHaveBeenCalled();

      finishHydration();
      expect(deletedNames()).toEqual([orphan.fileName]);
    });

    it("si se detiene antes de que cargue el store, no llega a limpiar", () => {
      let finishHydration: () => void = () => undefined;
      jest.spyOn(useAgendaTasksStore.persist, "hasHydrated").mockReturnValue(false);
      jest.spyOn(useAgendaTasksStore.persist, "onFinishHydration").mockImplementation((listener) => {
        finishHydration = () => listener(agenda());
        return () => undefined;
      });

      stop = startAttachmentCleanup(RELEASE_DELAY);
      stop();
      finishHydration();

      expect(listMock).not.toHaveBeenCalled();
    });
  });

  describe("al quitar adjuntos", () => {
    it("quitar el adjunto de una tarea borra su archivo, pasado el margen", async () => {
      const file = attachment();
      await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [file]);
      stop = startAttachmentCleanup(RELEASE_DELAY);

      await agenda().updateTask(DATE, 1, { attachments: [] });

      expect(deleteMock).not.toHaveBeenCalled();
      jest.advanceTimersByTime(RELEASE_DELAY);
      expect(deletedNames()).toEqual([file.fileName]);
      // Y la tarea ya no lleva la clave
      expect(agenda().getTaskForLine(DATE, 1)?.attachments).toBeUndefined();
    });

    it("borrar la tarea borra los archivos que tenía", async () => {
      const a = attachment("a.pdf");
      const b = attachment("b.png");
      await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [a, b]);
      stop = startAttachmentCleanup(RELEASE_DELAY);

      await agenda().deleteTask(DATE, 1);
      jest.advanceTimersByTime(RELEASE_DELAY);

      expect(deletedNames().sort()).toEqual([a.fileName, b.fileName].sort());
    });

    it("quitar uno de dos adjuntos borra solo ese", async () => {
      const keep = attachment("queda.pdf");
      const drop = attachment("se-va.pdf");
      await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [keep, drop]);
      stop = startAttachmentCleanup(RELEASE_DELAY);

      await agenda().updateTask(DATE, 1, { attachments: [keep] });
      jest.advanceTimersByTime(RELEASE_DELAY);

      expect(deletedNames()).toEqual([drop.fileName]);
    });

    it("un archivo que usa otra tarea NO se borra (ocurrencia repetida convertida en tarea normal)", async () => {
      const shared = attachment("compartido.pdf");
      await agenda().addTask(DATE, 1, "Original", null, "none", null, [shared]);
      await agenda().addTask("2026-09-27", 1, "Copia", null, "none", null, [shared]);
      stop = startAttachmentCleanup(RELEASE_DELAY);

      await agenda().deleteTask("2026-09-27", 1);
      jest.advanceTimersByTime(RELEASE_DELAY);

      expect(deleteMock).not.toHaveBeenCalled();
      expect(getFileNamesInUse().has(shared.fileName)).toBe(true);
    });

    it("si la tarea se vuelve a crear con el archivo dentro del margen, se conserva", async () => {
      const file = attachment();
      await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [file]);
      stop = startAttachmentCleanup(RELEASE_DELAY);

      await agenda().deleteTask(DATE, 1);
      jest.advanceTimersByTime(1000);
      await agenda().addTask("2026-09-21", 3, "Tarea movida", null, "none", null, [file]);
      jest.advanceTimersByTime(RELEASE_DELAY);

      expect(deleteMock).not.toHaveBeenCalled();
    });

    it("cambios que no tocan adjuntos no borran nada", async () => {
      const file = attachment();
      await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [file]);
      stop = startAttachmentCleanup(RELEASE_DELAY);

      await agenda().updateTask(DATE, 1, { text: "Editada", completed: true });
      await agenda().addTask(DATE, 2, "Otra");
      jest.advanceTimersByTime(RELEASE_DELAY * 2);

      expect(deleteMock).not.toHaveBeenCalled();
    });

    it("varias bajas seguidas se borran juntas en una sola pasada", async () => {
      const a = attachment("a.pdf");
      const b = attachment("b.pdf");
      await agenda().addTask(DATE, 1, "Una", null, "none", null, [a]);
      await agenda().addTask(DATE, 2, "Otra", null, "none", null, [b]);
      stop = startAttachmentCleanup(RELEASE_DELAY);

      await agenda().deleteTask(DATE, 1);
      await agenda().deleteTask(DATE, 2);
      jest.advanceTimersByTime(RELEASE_DELAY);

      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(deletedNames().sort()).toEqual([a.fileName, b.fileName].sort());
    });

    it("al detenerla se cancela lo pendiente y deja de vigilar", async () => {
      const file = attachment();
      await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [file]);
      stop = startAttachmentCleanup(RELEASE_DELAY);

      await agenda().deleteTask(DATE, 1);
      stop();
      jest.advanceTimersByTime(RELEASE_DELAY * 2);

      expect(deleteMock).not.toHaveBeenCalled();
    });
  });
});

describe("store de tareas con adjuntos", () => {
  it("addTask guarda los adjuntos, y sin ellos no añade la clave", async () => {
    const file = attachment();
    await agenda().addTask(DATE, 1, "Con", null, "none", null, [file]);
    await agenda().addTask(DATE, 2, "Sin");
    await agenda().addTask(DATE, 3, "Vacío", null, "none", null, []);

    expect(agenda().getTaskForLine(DATE, 1)?.attachments).toEqual([file]);
    expect("attachments" in (agenda().getTaskForLine(DATE, 2) ?? {})).toBe(false);
    expect("attachments" in (agenda().getTaskForLine(DATE, 3) ?? {})).toBe(false);
  });

  it("updateTask sin la clave no toca los adjuntos que ya tiene", async () => {
    const file = attachment();
    await agenda().addTask(DATE, 1, "Con", null, "none", null, [file]);
    await agenda().updateTask(DATE, 1, { text: "Editada" });
    expect(agenda().getTaskForLine(DATE, 1)?.attachments).toEqual([file]);
  });

  it("updateTask con una lista vacía quita la clave, no guarda []", async () => {
    await agenda().addTask(DATE, 1, "Con", null, "none", null, [attachment()]);
    await agenda().updateTask(DATE, 1, { attachments: [] });
    expect("attachments" in (agenda().getTaskForLine(DATE, 1) ?? {})).toBe(false);
  });

  it("una edición que no toca adjuntos no añade la clave a tareas que no tenían", async () => {
    await agenda().addTask(DATE, 1, "Sin");
    await agenda().updateTask(DATE, 1, { text: "Editada", attachments: [] });
    expect("attachments" in (agenda().getTaskForLine(DATE, 1) ?? {})).toBe(false);
  });
});

describe("con notas (que también llevan adjuntos)", () => {
  let stop: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    stop?.();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // Simula un store que aún no ha terminado de cargar; devuelve cómo terminarlo
  function holdHydration(store: typeof useAgendaTasksStore | typeof useNotesStore) {
    let finish: () => void = () => undefined;
    jest.spyOn(store.persist, "hasHydrated").mockReturnValue(false);
    jest.spyOn(store.persist, "onFinishHydration").mockImplementation((listener) => {
      finish = () => listener(store.getState() as never);
      return () => undefined;
    });
    return () => finish();
  }

  it("los archivos de una nota cuentan como en uso", () => {
    const file = attachment("nota.png");
    notes().addNote({ text: "Con foto", attachments: [file] });
    expect(getFileNamesInUse()).toEqual(new Set([file.fileName]));
  });

  it("junta los archivos de tareas y de notas", async () => {
    const forTask = attachment("tarea.pdf");
    const forNote = attachment("nota.png");
    await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [forTask]);
    notes().addNote({ text: "Nota", attachments: [forNote] });
    expect(getFileNamesInUse()).toEqual(new Set([forTask.fileName, forNote.fileName]));
  });

  it("el barrido NUNCA borra un archivo que solo usa una nota, por viejo que sea", () => {
    const noteFile = attachment("nota.png", 90 * DAY);
    const orphan = attachment("resto.pdf", 3 * DAY);
    notes().addNote({ text: "Vieja", attachments: [noteFile] });
    listMock.mockReturnValue([noteFile.fileName, orphan.fileName]);

    expect(sweepOrphanFiles()).toEqual([orphan.fileName]);
    expect(deletedNames()).not.toContain(noteFile.fileName);
  });

  it("si solo hay archivos en notas (ninguna tarea los usa) tampoco se toca nada de las notas", () => {
    const noteFile = attachment("nota.png", 90 * DAY);
    notes().addNote({ text: "Sola", attachments: [noteFile] });
    listMock.mockReturnValue([noteFile.fileName]);
    expect(sweepOrphanFiles()).toEqual([]);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("releaseUnusedFiles respeta el archivo de una nota", () => {
    const noteFile = attachment("nota.png");
    notes().addNote({ text: "Con foto", attachments: [noteFile] });
    expect(releaseUnusedFiles([noteFile.fileName])).toEqual([]);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("borrar una nota borra sus archivos, pasado el margen", () => {
    const a = attachment("a.png");
    const b = attachment("b.pdf");
    const created = notes().addNote({ text: "Con dos", attachments: [a, b] })!;
    stop = startAttachmentCleanup(RELEASE_DELAY);

    notes().deleteNote(created.id);
    expect(deleteMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(RELEASE_DELAY);

    expect(deletedNames().sort()).toEqual([a.fileName, b.fileName].sort());
  });

  it("quitar un adjunto de una nota borra solo ese archivo", () => {
    const keep = attachment("queda.png");
    const drop = attachment("se-va.png");
    const created = notes().addNote({ text: "Nota", attachments: [keep, drop] })!;
    stop = startAttachmentCleanup(RELEASE_DELAY);

    notes().updateNote(created.id, { attachments: [keep] });
    jest.advanceTimersByTime(RELEASE_DELAY);

    expect(deletedNames()).toEqual([drop.fileName]);
  });

  it("cambiar solo el texto o el color de una nota no borra nada", () => {
    const created = notes().addNote({ text: "Nota", attachments: [attachment("a.png")] })!;
    stop = startAttachmentCleanup(RELEASE_DELAY);

    notes().updateNote(created.id, { text: "Nota editada", color: "pink" });
    jest.advanceTimersByTime(RELEASE_DELAY * 2);

    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("si una tarea usa el mismo archivo, borrar la nota no lo borra", async () => {
    const shared = attachment("compartido.pdf");
    const created = notes().addNote({ text: "Nota", attachments: [shared] })!;
    await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [shared]);
    stop = startAttachmentCleanup(RELEASE_DELAY);

    notes().deleteNote(created.id);
    jest.advanceTimersByTime(RELEASE_DELAY);

    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("y al revés: borrar la tarea no borra el archivo que aún usa una nota", async () => {
    const shared = attachment("compartido.pdf");
    notes().addNote({ text: "Nota", attachments: [shared] });
    await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [shared]);
    stop = startAttachmentCleanup(RELEASE_DELAY);

    await agenda().deleteTask(DATE, 1);
    jest.advanceTimersByTime(RELEASE_DELAY);

    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("no limpia nada mientras el store de NOTAS no haya cargado (aunque el de tareas sí)", async () => {
    const used = attachment("usado.pdf", 30 * DAY);
    const noteFile = attachment("nota.png", 30 * DAY);
    await agenda().addTask(DATE, 1, "Tarea", null, "none", null, [used]);
    notes().addNote({ text: "Nota", attachments: [noteFile] });
    listMock.mockReturnValue([used.fileName, noteFile.fileName, attachment("resto.pdf", 3 * DAY).fileName]);

    const finishNotes = holdHydration(useNotesStore);
    stop = startAttachmentCleanup(RELEASE_DELAY);

    expect(listMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();

    finishNotes();
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(deletedNames()).not.toContain(noteFile.fileName);
  });

  it("con los dos stores sin cargar, espera a que carguen los dos", () => {
    listMock.mockReturnValue([]);
    const finishTasks = holdHydration(useAgendaTasksStore);
    const finishNotes = holdHydration(useNotesStore);
    stop = startAttachmentCleanup(RELEASE_DELAY);

    finishTasks();
    expect(listMock).not.toHaveBeenCalled();

    finishNotes();
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("un aviso de carga repetido no hace que se limpie ni se vigile dos veces", () => {
    listMock.mockReturnValue([]);
    const finishNotes = holdHydration(useNotesStore);
    stop = startAttachmentCleanup(RELEASE_DELAY);

    finishNotes();
    finishNotes();

    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("un aviso de carga duplicado de un store no adelanta el arranque mientras el otro sigue sin cargar", () => {
    listMock.mockReturnValue([]);
    const finishTasks = holdHydration(useAgendaTasksStore);
    const finishNotes = holdHydration(useNotesStore);
    stop = startAttachmentCleanup(RELEASE_DELAY);

    finishTasks();
    finishTasks(); // p. ej. una re-hidratación: no puede contar como si hubiera cargado el de notas
    expect(listMock).not.toHaveBeenCalled();

    finishNotes();
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("al detenerla deja de vigilar también las notas", () => {
    const created = notes().addNote({ text: "Nota", attachments: [attachment("a.png")] })!;
    stop = startAttachmentCleanup(RELEASE_DELAY);
    stop();

    notes().deleteNote(created.id);
    jest.advanceTimersByTime(RELEASE_DELAY * 2);

    expect(deleteMock).not.toHaveBeenCalled();
  });
});
