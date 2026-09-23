/**
 * Renderiza el tablero de notas, su editor y la tira de pestañas con `react-test-renderer` (que trae
 * jest-expo, el preset de este proyecto) y pulsa lo que un usuario pulsaría. No sustituye a probarlo
 * en un móvil (no comprueba cómo se ve), pero caza importaciones rotas, hooks mal usados y flujos
 * que no hacen lo que dicen. Los mocks son los límites nativos: almacenamiento, imágenes y archivos.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../services/notifications/notification-service", () => ({
  notificationService: { scheduleTaskReminder: jest.fn(async () => null), cancelTaskReminder: jest.fn(async () => undefined) },
}));
jest.mock("../hooks/use-i18n", () => ({
  useI18n: () => ({ tCommon: (key: string, opts?: object) => (opts ? `${key}${JSON.stringify(opts)}` : key), tAgenda: (k: string) => k }),
}));
jest.mock("expo-image", () => ({ Image: "ExpoImage" }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockMissingFiles = new Set<string>();
jest.mock("../services/attachments-service", () => ({
  getAttachmentUri: jest.fn((a: { fileName: string }) => (mockMissingFiles.has(a.fileName) ? null : `file:///doc/attachments/${a.fileName}`)),
  attachmentExists: jest.fn(() => true),
  pickAndStoreAttachment: jest.fn(),
  openAttachment: jest.fn(),
  shareAttachment: jest.fn(),
  deleteStoredFiles: jest.fn(),
  listStoredFileNames: jest.fn(() => []),
}));

import React from "react";
import { Alert, Text, TextInput, TouchableOpacity } from "react-native";
import TestRenderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import NoteCard from "../components/agendaComponents/notes/NoteCard";
import NoteEditor from "../components/agendaComponents/notes/NoteEditor";
import NotesBoard from "../components/agendaComponents/notes/NotesBoard";
import TypeTabs from "../components/agendaComponents/typeTabs/TypeTabs";
import useAgendaSectionStore from "../stores/agenda-section-store";
import useAgendaTasksStore from "../stores/agenda-tasks-store";
import useNotesStore from "../stores/notes-store";
import useTaskTypesStore from "../stores/task-types-store";
import { buildStoredFileName, createAttachmentId } from "../utils/attachments";
import { noteColorHex } from "../utils/notes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const att = (name: string, mime: string, seed: number) => {
  const id = createAttachmentId(1_700_000_000_000, seed);
  return { id, name, fileName: buildStoredFileName(id, name), mimeType: mime, size: 10, addedAt: "2026-09-20T00:00:00.000Z" };
};

const texts = (root: ReactTestInstance) =>
  root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).filter((c) => typeof c === "string");
const byLabel = (root: ReactTestInstance, label: string) => root.findAllByType(TouchableOpacity).filter((n) => n.props.accessibilityLabel === label);
// Las pestañas de la tira
const tabsOf = (root: ReactTestInstance) => root.findAllByType(TouchableOpacity).filter((n) => n.props.accessibilityRole === "tab");
const mounted: ReactTestRenderer[] = [];
async function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(element); });
  mounted.push(renderer);
  return renderer;
}
afterEach(async () => {
  await act(async () => { while (mounted.length) mounted.pop()!.unmount(); });
});

beforeEach(() => {
  mockMissingFiles.clear();
  useNotesStore.setState({ notes: [] });
  useAgendaSectionStore.setState({ section: "agenda", agendaView: "book" });
  useTaskTypesStore.setState({ types: [], activeFilter: "all" });
  useAgendaTasksStore.setState({ tasksByDate: {}, linesStatus: {} });
});

describe("NotesBoard", () => {
  it("vacío: muestra el mensaje y el botón de nueva nota", async () => {
    const r = await render(<NotesBoard />);
    const all = texts(r.root);
    expect(all).toContain("notes.emptyTitle");
    expect(all).toContain("notes.emptyHint");
    expect(byLabel(r.root, "notes.newNote")).toHaveLength(1);
  });

  it("con notas: las dibuja todas, con vista previa de imagen solo si el archivo existe", async () => {
    useNotesStore.getState().addNote({ text: "Comprar pilas", color: "pink" });
    useNotesStore.getState().addNote({ text: "Con foto", attachments: [att("f.png", "image/png", 0.1), att("d.pdf", "application/pdf", 0.2)] });
    const lost = att("perdida.png", "image/png", 0.3);
    mockMissingFiles.add(lost.fileName);
    useNotesStore.getState().addNote({ text: "Foto perdida", attachments: [lost] });

    const r = await render(<NotesBoard />);
    const all = texts(r.root);
    expect(all).toEqual(expect.arrayContaining(["Comprar pilas", "Con foto", "Foto perdida"]));
    expect(all).not.toContain("notes.emptyTitle");
    // Solo la nota con imagen existente enseña vista previa
    expect(r.root.findAllByType("ExpoImage" as never)).toHaveLength(1);
    // La segunda nota lleva además un PDF: "📎 1"; la tercera tiene 1 archivo (perdido) → "📎 1"
    expect(all.filter((t) => String(t).includes("📎"))).toHaveLength(2);
  });

  it("tocar el botón ＋ abre el editor de nota nueva", async () => {
    const r = await render(<NotesBoard />);
    await act(async () => { byLabel(r.root, "notes.newNote")[0].props.onPress(); });
    expect(texts(r.root)).toContain("notes.newNote"); // título del editor
    expect(r.root.findAllByType(TextInput)).toHaveLength(1);
  });

  it("tocar una nota abre el editor con su texto", async () => {
    useNotesStore.getState().addNote({ text: "Editar esta" });
    const r = await render(<NotesBoard />);
    const card = r.root.findAllByType(TouchableOpacity).find((n) => n.props.accessibilityLabel === "Editar esta")!;
    await act(async () => { card.props.onPress(); });
    expect(r.root.findByType(TextInput).props.value).toBe("Editar esta");
    expect(texts(r.root)).toContain("notes.editTitle");
  });
});

describe("NoteEditor", () => {
  it("guardar con texto crea la nota y cierra", async () => {
    const onClose = jest.fn();
    const r = await render(<NoteEditor visible note={null} onClose={onClose} />);
    await act(async () => { r.root.findByType(TextInput).props.onChangeText("  Nota nueva  "); });
    const save = r.root.findAllByType(TouchableOpacity).filter((n) => n.findAllByType(Text).some((t) => t.props.children === "buttons.save"))[0];
    await act(async () => { save.props.onPress(); });

    expect(useNotesStore.getState().notes.map((n) => n.text)).toEqual(["Nota nueva"]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("guardar sin nada muestra el aviso y no crea ni cierra", async () => {
    const onClose = jest.fn();
    const r = await render(<NoteEditor visible note={null} onClose={onClose} />);
    const save = r.root.findAllByType(TouchableOpacity).filter((n) => n.findAllByType(Text).some((t) => t.props.children === "buttons.save"))[0];
    await act(async () => { save.props.onPress(); });

    expect(texts(r.root)).toContain("notes.errorEmpty");
    expect(useNotesStore.getState().notes).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("elegir color cambia el fondo del papel y se guarda", async () => {
    const r = await render(<NoteEditor visible note={null} onClose={jest.fn()} />);
    await act(async () => { r.root.findByType(TextInput).props.onChangeText("Con color"); });
    await act(async () => { byLabel(r.root, "notes.colorBlue")[0].props.onPress(); });
    const input = r.root.findByType(TextInput);
    expect(JSON.stringify(input.props.style)).toContain(noteColorHex("blue"));

    const save = r.root.findAllByType(TouchableOpacity).filter((n) => n.findAllByType(Text).some((t) => t.props.children === "buttons.save"))[0];
    await act(async () => { save.props.onPress(); });
    expect(useNotesStore.getState().notes[0].color).toBe("blue");
  });

  it("editar una nota existente la actualiza (no crea otra) y ofrece borrar", async () => {
    const created = useNotesStore.getState().addNote({ text: "Original" })!;
    const r = await render(<NoteEditor visible note={created} onClose={jest.fn()} />);
    expect(texts(r.root)).toContain("buttons.delete");

    await act(async () => { r.root.findByType(TextInput).props.onChangeText("Cambiada"); });
    const save = r.root.findAllByType(TouchableOpacity).filter((n) => n.findAllByType(Text).some((t) => t.props.children === "buttons.save"))[0];
    await act(async () => { save.props.onPress(); });

    expect(useNotesStore.getState().notes).toHaveLength(1);
    expect(useNotesStore.getState().notes[0]).toMatchObject({ id: created.id, text: "Cambiada" });
  });

  it("una nota nueva no ofrece borrar", async () => {
    const r = await render(<NoteEditor visible note={null} onClose={jest.fn()} />);
    expect(texts(r.root)).not.toContain("buttons.delete");
  });

  it("borrar pide confirmación y, al aceptar, elimina la nota", async () => {
    const created = useNotesStore.getState().addNote({ text: "Borrame" })!;
    const onClose = jest.fn();
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const r = await render(<NoteEditor visible note={created} onClose={onClose} />);
    const del = r.root.findAllByType(TouchableOpacity).filter((n) => n.findAllByType(Text).some((t) => t.props.children === "buttons.delete"))[0];
    await act(async () => { del.props.onPress(); });

    expect(alert).toHaveBeenCalledTimes(1);
    expect(useNotesStore.getState().notes).toHaveLength(1); // aún no
    const confirm = (alert.mock.calls[0][2] as { text: string; onPress?: () => void }[]).find((b) => b.text === "buttons.delete")!;
    await act(async () => { confirm.onPress!(); });
    expect(useNotesStore.getState().notes).toEqual([]);
    expect(onClose).toHaveBeenCalled();
    alert.mockRestore();
  });

  it("el editor cerrado no dibuja nada", async () => {
    const r = await render(<NoteEditor visible={false} note={null} onClose={jest.fn()} />);
    expect(r.root.findAllByType(TextInput)).toHaveLength(0);
  });
});

describe("NoteCard", () => {
  it("una nota solo con archivo (sin texto) se dibuja sin romper", async () => {
    const note = useNotesStore.getState().addNote({ text: "", attachments: [att("a.pdf", "application/pdf", 0.4)] })!;
    const r = await render(<NoteCard note={note} previewUri={null} minHeight={160} onPress={jest.fn()} />);
    expect(texts(r.root).some((t) => String(t).includes("📎"))).toBe(true);
  });
});

describe("TypeTabs (tira de tipos)", () => {
  it("con tipos: pulsar un tipo vuelve a la agenda y activa ese filtro", async () => {
    useTaskTypesStore.getState().addType("Trabajo");
    const typeId = useTaskTypesStore.getState().types[0].id;
    useAgendaSectionStore.getState().showNotes();

    const r = await render(<TypeTabs />);
    const typeTab = tabsOf(r.root).find((n) => n.findAllByType(Text).some((t) => t.props.children === "Trabajo"))!;
    await act(async () => { typeTab.props.onPress(); });

    expect(useAgendaSectionStore.getState().section).toBe("agenda");
    expect(useTaskTypesStore.getState().activeFilter).toBe(typeId);
  });

  it("volver de las notas con una pestaña de tareas conserva la vista en la que se estaba (el año)", async () => {
    useAgendaSectionStore.getState().showYear();
    useAgendaSectionStore.getState().showNotes();
    const r = await render(<TypeTabs />);

    await act(async () => { tabsOf(r.root)[0].props.onPress(); });
    expect(useAgendaSectionStore.getState()).toMatchObject({ section: "agenda", agendaView: "year" });
  });

  it("el botón ＋ (crear tipo) sigue disponible sin tipos", async () => {
    const r = await render(<TypeTabs />);
    expect(byLabel(r.root, "taskTypes.manageTitle")).toHaveLength(1);
  });
});
