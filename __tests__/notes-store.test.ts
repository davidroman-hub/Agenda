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
import useAgendaSectionStore from "../stores/agenda-section-store";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useNotesStore from "../stores/notes-store";
import { Attachment, buildStoredFileName, createAttachmentId } from "../utils/attachments";
import { DEFAULT_NOTE_COLOR, MAX_NOTE_LENGTH } from "../utils/notes";

const notes = () => useNotesStore.getState();
const STORAGE_KEY = "notes-storage";

const attachment = (name = "foto.png", seed = 0.5): Attachment => {
  const id = createAttachmentId(1_700_000_000_000, seed);
  return { id, name, fileName: buildStoredFileName(id, name), mimeType: "image/png", size: 10, addedAt: "2026-09-20T00:00:00.000Z" };
};

// Deja pasar lo que zustand persist escribe de forma asíncrona
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  useNotesStore.setState({ notes: [] });
  useAgendaTasksStore.setState({ tasksByDate: {}, linesStatus: {} });
  useAgendaSectionStore.setState({ section: "agenda" });
  await AsyncStorage.clear();
});

describe("addNote", () => {
  it("crea la nota con el texto limpio, el color por defecto y las fechas de ahora", () => {
    const created = notes().addNote({ text: "  Comprar pilas \r\n y velas " });

    expect(created).not.toBeNull();
    expect(created).toMatchObject({ text: "Comprar pilas \n y velas", color: DEFAULT_NOTE_COLOR });
    expect(created!.id).toMatch(/^note-/);
    expect(created!.createdAt).toBe(created!.updatedAt);
    expect(notes().notes).toEqual([created]);
  });

  it("guarda el color elegido, y uno que no es de la paleta pasa al amarillo", () => {
    expect(notes().addNote({ text: "a", color: "pink" })!.color).toBe("pink");
    expect(notes().addNote({ text: "b", color: "morado" as never })!.color).toBe(DEFAULT_NOTE_COLOR);
  });

  it.each([["vacío", ""], ["solo espacios", "   \n  "]])("rechaza una nota con texto %s y sin archivos", (_label, text) => {
    expect(notes().addNote({ text })).toBeNull();
    expect(notes().addNote({ text, attachments: [] })).toBeNull();
    expect(notes().notes).toEqual([]);
  });

  it("acepta una nota que es solo un archivo", () => {
    const file = attachment();
    const created = notes().addNote({ text: "", attachments: [file] });
    expect(created?.attachments).toEqual([file]);
    expect(created?.text).toBe("");
  });

  it("sin archivos no guarda la clave attachments", () => {
    expect("attachments" in notes().addNote({ text: "a" })!).toBe(false);
    expect("attachments" in notes().addNote({ text: "b", attachments: [] })!).toBe(false);
  });

  it("acota el largo del texto", () => {
    expect(notes().addNote({ text: "x".repeat(MAX_NOTE_LENGTH + 100) })!.text).toHaveLength(MAX_NOTE_LENGTH);
  });

  it("cada nota tiene su propio id", () => {
    const ids = new Set(Array.from({ length: 30 }, (_, index) => notes().addNote({ text: `n${index}` })!.id));
    expect(ids.size).toBe(30);
  });
});

describe("updateNote", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("cambia texto y color, sube updatedAt y respeta createdAt", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-20T10:00:00.000Z"));
    const created = notes().addNote({ text: "Antes", color: "yellow" })!;

    jest.setSystemTime(new Date("2026-09-21T10:00:00.000Z"));
    expect(notes().updateNote(created.id, { text: "Después", color: "green" })).toBe(true);

    const updated = notes().notes[0];
    expect(updated).toMatchObject({ text: "Después", color: "green", createdAt: created.createdAt });
    expect(updated.updatedAt).toBe("2026-09-21T10:00:00.000Z");
  });

  it("solo toca la nota indicada", () => {
    const first = notes().addNote({ text: "Una" })!;
    const second = notes().addNote({ text: "Otra" })!;
    notes().updateNote(first.id, { text: "Una editada" });
    expect(notes().notes.find((note) => note.id === second.id)).toEqual(second);
  });

  it("una nota que no existe devuelve false y no cambia nada", () => {
    notes().addNote({ text: "Una" });
    const before = notes().notes;
    expect(notes().updateNote("no-existe", { text: "x" })).toBe(false);
    expect(notes().notes).toBe(before);
  });

  it("un color que no es de la paleta se ignora", () => {
    const created = notes().addNote({ text: "a", color: "blue" })!;
    notes().updateNote(created.id, { color: "morado" as never });
    expect(notes().notes[0].color).toBe("blue");
  });

  it("no deja la nota vacía: devuelve false y la deja como estaba", () => {
    const created = notes().addNote({ text: "Algo" })!;
    expect(notes().updateNote(created.id, { text: "   " })).toBe(false);
    expect(notes().notes[0]).toEqual(created);
  });

  it("puede quedarse sin texto si conserva un archivo", () => {
    const created = notes().addNote({ text: "Con foto", attachments: [attachment()] })!;
    expect(notes().updateNote(created.id, { text: "" })).toBe(true);
    expect(notes().notes[0].text).toBe("");
  });

  it("y no puede quitarse el último archivo si además no tiene texto", () => {
    const created = notes().addNote({ text: "", attachments: [attachment()] })!;
    expect(notes().updateNote(created.id, { attachments: [] })).toBe(false);
    expect(notes().notes[0].attachments).toHaveLength(1);
  });

  it("sin la clave attachments no toca los que ya tiene", () => {
    const file = attachment();
    const created = notes().addNote({ text: "a", attachments: [file] })!;
    notes().updateNote(created.id, { text: "editada" });
    expect(notes().notes[0].attachments).toEqual([file]);
  });

  it("una lista vacía quita la clave; una lista nueva reemplaza a la anterior", () => {
    const first = attachment("a.png", 0.1);
    const second = attachment("b.png", 0.2);
    const created = notes().addNote({ text: "a", attachments: [first] })!;

    notes().updateNote(created.id, { attachments: [second] });
    expect(notes().notes[0].attachments).toEqual([second]);

    notes().updateNote(created.id, { attachments: [] });
    expect("attachments" in notes().notes[0]).toBe(false);
  });
});

describe("deleteNote", () => {
  it("quita solo esa nota", () => {
    const first = notes().addNote({ text: "Una" })!;
    const second = notes().addNote({ text: "Otra" })!;
    notes().deleteNote(first.id);
    expect(notes().notes).toEqual([second]);
  });

  it("una nota que no existe no hace nada", () => {
    notes().addNote({ text: "Una" });
    const before = notes().notes;
    notes().deleteNote("no-existe");
    expect(notes().notes).toEqual(before);
  });
});

describe("las notas NO son tareas", () => {
  it("crear notas no toca las tareas, sus líneas ni su caché", () => {
    notes().addNote({ text: "Una nota" });
    notes().addNote({ text: "Otra", attachments: [attachment()] });

    const agenda = useAgendaTasksStore.getState();
    expect(agenda.tasksByDate).toEqual({});
    expect(agenda.linesStatus).toEqual({});
    expect(agenda.getAllTasks()).toEqual({});
  });

  it("crear tareas no toca las notas", async () => {
    notes().addNote({ text: "Una nota" });
    await useAgendaTasksStore.getState().addTask("2026-09-20", 1, "Una tarea");
    expect(notes().notes.map((note) => note.text)).toEqual(["Una nota"]);
  });

  it("borrar todas las tareas no borra las notas", () => {
    notes().addNote({ text: "Una nota" });
    useAgendaTasksStore.setState({ tasksByDate: {} });
    expect(notes().notes).toHaveLength(1);
  });
});

describe("persistencia", () => {
  it("las notas se guardan en su propia clave", async () => {
    notes().addNote({ text: "Guardada", color: "orange" });
    await flush();

    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "{}");
    expect(saved.state.notes).toHaveLength(1);
    expect(saved.state.notes[0]).toMatchObject({ text: "Guardada", color: "orange" });
    // Y no se cuelan en el almacenamiento de las tareas
    expect((await AsyncStorage.getItem("agenda-tasks-storage")) ?? "").not.toContain("Guardada");
  });

  it("al cargar recupera lo guardado", async () => {
    notes().addNote({ text: "Sobrevive" });
    await flush();
    const saved = await AsyncStorage.getItem(STORAGE_KEY);

    // "Reiniciar la app": la memoria queda vacía y lo guardado sigue ahí (setState también persiste,
    // por eso se restaura el contenido antes de cargar)
    useNotesStore.setState({ notes: [] });
    await flush();
    await AsyncStorage.setItem(STORAGE_KEY, saved as string);

    await useNotesStore.persist.rehydrate();
    expect(notes().notes.map((note) => note.text)).toEqual(["Sobrevive"]);
  });

  it("al cargar descarta lo roto y arregla lo que se pueda", async () => {
    const good = attachment("ok.png", 0.1);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 0,
        state: {
          notes: [
            { id: "ok", text: "Buena", color: "pink", createdAt: "2026-09-20T10:00:00.000Z", updatedAt: "2026-09-20T10:00:00.000Z", attachments: [good] },
            { id: "color-raro", text: "Color raro", color: "morado", createdAt: "2026-09-20T10:00:00.000Z" },
            { id: "vacia", text: "  " },
            { text: "sin id" },
            "basura",
            null,
            { id: "insegura", text: "Ruta", createdAt: "2026-09-20T10:00:00.000Z", attachments: [{ ...good, fileName: "../../etc/passwd" }] },
          ],
        },
      })
    );

    await useNotesStore.persist.rehydrate();

    expect(notes().notes.map((note) => note.id)).toEqual(["ok", "color-raro", "insegura"]);
    expect(notes().notes[0].attachments).toEqual([good]);
    expect(notes().notes[1].color).toBe(DEFAULT_NOTE_COLOR);
    expect("attachments" in notes().notes[2]).toBe(false);
  });

  it("si lo guardado no tiene forma de notas, arranca vacío sin fallar", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 0, state: { notes: "no es una lista" } }));
    await useNotesStore.persist.rehydrate();
    expect(notes().notes).toEqual([]);
  });

  it("las funciones del store siguen funcionando tras cargar", async () => {
    await useNotesStore.persist.rehydrate();
    expect(notes().addNote({ text: "Tras cargar" })).not.toBeNull();
  });
});

describe("sección activa (agenda o notas)", () => {
  it("arranca en la agenda", () => {
    expect(useAgendaSectionStore.getState().section).toBe("agenda");
  });

  it("se puede ir a las notas y volver", () => {
    useAgendaSectionStore.getState().showNotes();
    expect(useAgendaSectionStore.getState().section).toBe("notes");
    useAgendaSectionStore.getState().showAgenda();
    expect(useAgendaSectionStore.getState().section).toBe("agenda");
  });

  it("no se guarda: no escribe nada en el almacenamiento", async () => {
    useAgendaSectionStore.getState().showNotes();
    await flush();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((key) => key.includes("section"))).toEqual([]);
  });
});
