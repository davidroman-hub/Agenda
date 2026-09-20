// Notas: lógica pura, store, limpieza con notas, tira de pestañas, interfaz y cambio de contenido del libro
const { m } = require("./_helpers");

const N = "utils/notes.ts";
const NT = "__tests__/notes.test.ts";
const S = "stores/notes-store.ts";
const ST = "__tests__/notes-store.test.ts";
const C = "services/attachments-cleanup.ts";
const CT = "__tests__/attachments-cleanup.test.ts";
const STRIP = "utils/agenda-strip.ts";
const STRIP_T = "__tests__/agenda-strip.test.ts";
const UI = "__tests__/notes-ui.test.tsx";
const EDITOR = "components/agendaComponents/notes/NoteEditor.tsx";
const BOARD = "components/agendaComponents/notes/NotesBoard.tsx";
const CARD = "components/agendaComponents/notes/NoteCard.tsx";
const TABS = "components/agendaComponents/typeTabs/TypeTabs.tsx";
const BOOK = "components/agendaComponents/book.tsx";
const BOOK_T = "__tests__/book-sections.test.tsx";

module.exports = [
  // --- lógica pura (utils/notes.ts)
  m(N, "return ((hash % 11) - 5) * 0.5;", "return ((hash % 11) - 5) * 5;", NT, "la inclinación de los post-it no está acotada"),
  m(N, ".trim().slice(0, MAX_NOTE_LENGTH);", ".trim();", NT, "el texto de una nota no tiene límite de largo"),
  m(N, "&& !note.attachments?.length;", "&& true;", NT, "una nota que es solo un archivo cuenta como vacía"),
  m(N, "(a, b) => timeOf(b.createdAt) - timeOf(a.createdAt)", "(a, b) => timeOf(a.createdAt) - timeOf(b.createdAt)", NT, "las notas salen de la más antigua a la más reciente"),
  m(N, "seen.has(id)) continue;", "false) continue;", NT, "no se quitan los ids repetidos al cargar"),
  m(N, "    if (isNoteEmpty({ text: cleanText, attachments: cleanAttachments })) continue;", "", NT, "se aceptan notas vacías al cargar"),
  m(N, "color: isNoteColorId(color) ? color : DEFAULT_NOTE_COLOR,", "color: color as NoteColorId,", NT, "un color raro guardado pasa tal cual"),
  m(N, "if (!(width >= 600)) return 2;", "if (!(width > 600)) return 2;", NT, "límite de tablet desplazado en el tablero"),
  m(N, "if (heights[column] < heights[target]) target = column;", "if (heights[column] <= heights[target]) target = column;", NT, "desempate distinto al repartir en columnas"),
  m(N, 'getAttachmentKind(attachment) === "image"', "true", NT, "cualquier archivo cuenta como imagen de vista previa"),
  m(N, "(hasImagePreview ? 1 : 0)", "0", NT, "una imagen ya mostrada suma la fila de otros archivos"),

  // --- store de notas (stores/notes-store.ts)
  m(S, "notes: normalizeNotes((persisted as { notes?: unknown } | undefined)?.notes),", "notes: ((persisted as { notes?: Note[] } | undefined)?.notes ?? []),", ST, "lo guardado se carga sin sanear"),
  m(S, "        if (isNoteEmpty(next)) return false;", "", ST, "editar puede dejar una nota vacía"),
  m(S, "        if (isNoteEmpty({ text: cleanText, attachments })) return null;", "", ST, "se pueden crear notas vacías"),
  m(S, "else delete next.attachments;", "", ST, "una lista vacía de adjuntos no quita la clave"),
  m(S, 'text: "text" in updates ? sanitizeNoteText(updates.text) : existing.text,', "text: sanitizeNoteText(updates.text),", ST, "editar sin texto borra el texto"),
  m(S, "updatedAt: new Date().toISOString(),", "updatedAt: existing.updatedAt,", ST, "editar no actualiza la fecha de modificación"),
  m(S, "color: isNoteColorId(updates.color) ? updates.color : existing.color,", "color: (updates.color ?? existing.color) as NoteColorId,", ST, "al editar se acepta un color que no es de la paleta"),

  // --- tira de pestañas (utils/agenda-strip.ts)
  m(STRIP, "selected: inAgenda && tab.filter === filter", "selected: tab.filter === filter", STRIP_T, "una pestaña de tareas sigue marcada dentro de las notas"),
  m(STRIP, 'return [{ filter: FILTER_ALL, kind: "agenda", selected: inAgenda }];', "return [];", STRIP_T, "sin tipos no hay forma de volver desde las notas"),

  // --- interfaz de notas (notes-ui.test.tsx)
  m(EDITOR, `    if (isNoteEmpty({ text: cleanText, attachments })) {
      setShowError(true);
      return;
    }`, "", UI, "el editor guarda una nota vacía"),
  m(EDITOR, "if (note) updateNote(note.id, { text: cleanText, color, attachments });", "if (false) updateNote(note.id, { text: cleanText, color, attachments });", UI, "editar una nota crea otra en vez de actualizarla"),
  m(EDITOR, `          useNotesStore.getState().deleteNote(note.id);
          onClose();`, "          onClose();", UI, "confirmar el borrado no borra la nota"),
  m(EDITOR, `            {note && (
              <TouchableOpacity style={[styles.button, styles.deleteButton]}`, `            {true && (
              <TouchableOpacity style={[styles.button, styles.deleteButton]}`, UI, "una nota nueva ofrece el botón de borrar"),
  m(EDITOR, "onPress={() => setColor(option.id)}", "onPress={() => undefined}", UI, "elegir un color no hace nada"),
  m(BOARD, 'onPress={() => setEditing("new")}', "onPress={() => undefined}", UI, "el botón ＋ no abre el editor"),
  m(BOARD, "previewUri: image ? getAttachmentUri(image) : null", 'previewUri: image ? "file:///siempre.png" : null', UI, "vista previa de imagen aunque el archivo falte"),
  m(CARD, "{otherFiles > 0 && <Text style={styles.files}>📎 {otherFiles}</Text>}", "", UI, "la tarjeta no indica que hay otros archivos"),
  m(TABS, "        onPress={showNotes}", "        onPress={() => undefined}", UI, "la pestaña Notas no cambia de sección"),
  m(TABS, "                showAgenda();", "", UI, "pulsar un tipo no vuelve a la agenda desde las notas"),

  // --- el libro alterna entre libro, año y notas (book-sections.test.tsx)
  m(BOOK, "{...(showingBook ? panResponder.panHandlers : {})}", "{...panResponder.panHandlers}", BOOK_T, "el gesto de pasar página actúa también en el año y en las notas"),
  m(BOOK, '        {content === "notes" && <NotesBoard />}', "", BOOK_T, "el tablero de notas nunca se enseña"),
  m(BOOK, '(state.section === "notes" ? "notes" : state.agendaView)', '(state.section !== "notes" ? "notes" : state.agendaView)', BOOK_T, "la sección de notas está invertida"),
  m(BOOK, "if (!bookTarget || handledTargetRef.current === bookTarget.requestedAt) return;", "if (!bookTarget) return;", BOOK_T, "una petición ya atendida se repite y expulsa de las notas"),
  m(BOOK, "  useRepeatedTaskNotifications();", "", BOOK_T, "los recordatorios de repetidas se detienen fuera del libro"),
  m(BOOK, "    useAgendaSectionStore.getState().showBook();", "", BOOK_T, "una notificación no saca de las notas ni del año"),
  m(BOOK, "    useAgendaSectionStore.getState().showBook();", "    useAgendaSectionStore.getState().showAgenda();", BOOK_T, "una notificación lleva al año en vez de al libro"),
];
