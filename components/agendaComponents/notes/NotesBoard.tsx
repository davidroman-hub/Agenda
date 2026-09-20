import { useI18n } from "@/hooks/use-i18n";
import { getAttachmentUri } from "@/services/attachments-service";
import useNotesStore from "@/stores/notes-store";
import useThemeStore from "@/stores/theme-store";
import {
  columnsForWidth,
  estimateNoteHeight,
  firstImageAttachment,
  Note,
  NOTE_TEXT_COLOR,
  NOTES_BOARD_BACKGROUND,
  sortNotes,
  splitIntoColumns,
} from "@/utils/notes";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import NoteCard from "./NoteCard";
import NoteEditor from "./NoteEditor";

// Qué se está editando: una nota concreta, una nueva, o nada
type Editing = { id: string } | "new" | null;

// El tablero de notas: fondo amarillo oscuro y los post-it repartidos en columnas
export default function NotesBoard() {
  const { tCommon } = useI18n();
  const { colorScheme } = useThemeStore();
  const { width } = useWindowDimensions();
  const notes = useNotesStore((state) => state.notes);
  const [editing, setEditing] = useState<Editing>(null);

  // Cada nota con la dirección de su imagen de vista previa (si el archivo sigue en el dispositivo)
  const items = useMemo(
    () =>
      sortNotes(notes).map((note) => {
        const image = firstImageAttachment(note.attachments);
        return { note, previewUri: image ? getAttachmentUri(image) : null };
      }),
    [notes]
  );

  const columns = useMemo(
    () =>
      splitIntoColumns(items, columnsForWidth(width), (item) =>
        estimateNoteHeight(item.note, item.previewUri !== null)
      ),
    [items, width]
  );

  const editingNote: Note | null =
    editing && editing !== "new" ? (notes.find((note) => note.id === editing.id) ?? null) : null;

  return (
    <View style={[styles.board, { backgroundColor: NOTES_BOARD_BACKGROUND[colorScheme] }]}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>{tCommon("notes.emptyTitle")}</Text>
          <Text style={styles.emptyHint}>{tCommon("notes.emptyHint")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.columns}>
            {columns.map((column, index) => (
              <View key={index} style={styles.column}>
                {column.map(({ note, previewUri }) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    previewUri={previewUri}
                    onPress={() => setEditing({ id: note.id })}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setEditing("new")}
        accessibilityRole="button"
        accessibilityLabel={tCommon("notes.newNote")}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <NoteEditor
        visible={editing !== null}
        note={editingNote}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
  },
  content: {
    padding: 14,
    // Hueco para que el botón "＋" no tape la última nota
    paddingBottom: 110,
  },
  columns: {
    flexDirection: "row",
    gap: 14,
  },
  column: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyTitle: {
    color: NOTE_TEXT_COLOR,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyHint: {
    color: NOTE_TEXT_COLOR,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    opacity: 0.85,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NOTE_TEXT_COLOR,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: {
    color: "#FFE66D",
    fontSize: 28,
    lineHeight: 32,
  },
});
