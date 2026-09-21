import { useI18n } from "@/hooks/use-i18n";
import { getAttachmentUri } from "@/services/attachments-service";
import { useNoteDrag } from "@/hooks/use-note-drag";
import useNotesNavigationStore from "@/stores/notes-navigation-store";
import useNotesStore from "@/stores/notes-store";
import useThemeStore from "@/stores/theme-store";
import {
  columnsForWidth,
  estimateNoteHeight,
  firstImageAttachment,
  Note,
  noteColorHex,
  NOTE_TEXT_COLOR,
  NOTES_BOARD_BACKGROUND,
  sortNotes,
  splitIntoColumns,
} from "@/utils/notes";
import React, { useMemo, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableNote from "./DraggableNote";
import NoteEditor from "./NoteEditor";
import PostIt from "./PostIt";

const CORK = require("@/assets/images/notes/cork.png");
const WOOD_HORIZONTAL = require("@/assets/images/notes/wood-h.png");
const WOOD_VERTICAL = require("@/assets/images/notes/wood-v.png");
const EDGE_TOP = require("@/assets/images/notes/edge-top.png");
const EDGE_LEFT = require("@/assets/images/notes/edge-left.png");

// Lado de cada baldosa de la textura del corcho
const CORK_TILE = 256;
// Grosor del marco de madera, hueco entre el corcho y los post-it, y hueco entre columnas
const FRAME = 12;
const PADDING = 18;
const GAP = 16;
// Sombra que el marco echa sobre el corcho, y lo que se oscurece todo de noche
const EDGE_DEPTH = 20;
const NIGHT_DIM = "rgba(15,8,0,0.5)";

// Qué se está editando: una nota concreta, una nueva, o nada
type Editing = { id: string } | "new" | null;

// El corcho: la textura (que encaja sin costuras) repetida hasta cubrir el tamaño dado. Se coloca a
// mano porque `resizeMode="repeat"` no repite en Android. Cada baldosa mide un punto más para que no
// asome una línea entre dos cuando el tamaño en píxeles no es exacto
function CorkTiles({ width, height }: { readonly width: number; readonly height: number }) {
  const tiles = useMemo(() => {
    const result: React.ReactElement[] = [];
    for (let row = 0; row * CORK_TILE < height; row++) {
      for (let column = 0; column * CORK_TILE < width; column++) {
        result.push(
          <Image
            key={`${row}-${column}`}
            source={CORK}
            resizeMode="stretch"
            style={{
              position: "absolute",
              left: column * CORK_TILE,
              top: row * CORK_TILE,
              width: CORK_TILE + 1,
              height: CORK_TILE + 1,
            }}
          />
        );
      }
    }
    return result;
  }, [width, height]);

  return <View style={styles.tiles}>{tiles}</View>;
}

// Marco de madera. Arriba y abajo con la veta a lo largo; a los lados, la veta vertical. Cada tira
// tiene el canto claro por fuera y oscuro junto al corcho, así que la de abajo y la de la derecha
// son las de arriba y la de la izquierda volteadas
function WoodFrame({ night }: { readonly night: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={WOOD_HORIZONTAL} style={styles.woodTop} resizeMode="stretch" />
      <Image source={WOOD_HORIZONTAL} style={styles.woodBottom} resizeMode="stretch" />
      <Image source={WOOD_VERTICAL} style={styles.woodLeft} resizeMode="stretch" />
      <Image source={WOOD_VERTICAL} style={styles.woodRight} resizeMode="stretch" />
      {night && <View style={[StyleSheet.absoluteFill, { backgroundColor: NIGHT_DIM }]} />}
    </View>
  );
}

// El marco sobre el corcho: una sombra en cada borde del corcho
function FrameShadow() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={EDGE_TOP} style={styles.shadowTop} resizeMode="stretch" />
      <Image source={EDGE_TOP} style={styles.shadowBottom} resizeMode="stretch" />
      <Image source={EDGE_LEFT} style={styles.shadowLeft} resizeMode="stretch" />
      <Image source={EDGE_LEFT} style={styles.shadowRight} resizeMode="stretch" />
    </View>
  );
}

// El tablero de notas: corcho con marco de madera y los post-it clavados, repartidos en columnas
export default function NotesBoard() {
  const { tCommon } = useI18n();
  const { colorScheme } = useThemeStore();
  const { width, height } = useWindowDimensions();
  const notes = useNotesStore((state) => state.notes);
  const reorderNotes = useNotesStore((state) => state.reorderNotes);
  const [editing, setEditing] = useState<Editing>(null);
  // Alto del contenido (redondeado a baldosas): el corcho tiene que cubrirlo entero al desplazarse
  const [contentHeight, setContentHeight] = useState(0);

  // Si se pide una nota desde fuera (p. ej. al tocar un post-it del widget), se abre. La petición se
  // consume siempre, exista la nota o no (pudo borrarse desde que el widget la mostró)
  const noteTarget = useNotesNavigationStore((state) => state.target);
  const clearNoteTarget = useNotesNavigationStore((state) => state.clearTarget);
  React.useEffect(() => {
    if (!noteTarget) return;
    clearNoteTarget();
    if (noteTarget.id === "new" || notes.some((note) => note.id === noteTarget.id)) {
      setEditing(noteTarget.id === "new" ? "new" : { id: noteTarget.id });
    }
  }, [noteTarget, clearNoteTarget, notes]);

  // Cada nota con la dirección de su imagen de vista previa (si el archivo sigue en el dispositivo)
  const items = useMemo(
    () =>
      sortNotes(notes).map((note) => {
        const image = firstImageAttachment(note.attachments);
        return { note, previewUri: image ? getAttachmentUri(image) : null };
      }),
    [notes]
  );

  // Ancho de cada post-it: las notas cortas son cuadradas y las largas crecen hacia abajo
  const columnCount = columnsForWidth(width);
  const cardSize = (width - 2 * (FRAME + PADDING) - GAP * (columnCount - 1)) / columnCount;

  const columns = useMemo(
    () =>
      splitIntoColumns(items, columnCount, (item) =>
        Math.max(cardSize, estimateNoteHeight(item.note, item.previewUri !== null))
      ),
    [items, columnCount, cardSize]
  );

  // Arrastrar un post-it (pulsación larga) para cambiarlo de sitio. El orden que queda es el de `sortNotes`,
  // el mismo que sigue el widget de notas
  const scrollRef = useRef<ScrollView>(null);
  const drag = useNoteDrag({
    ids: useMemo(() => items.map(({ note }) => note.id), [items]),
    scrollRef,
    onReorder: reorderNotes,
  });
  // La columna de la nota que se lleva sube por encima de las demás, para que no quede tapada al cruzar
  const draggingColumn = columns.findIndex((column) => column.some(({ note }) => note.id === drag.dragId));

  const editingNote: Note | null =
    editing && editing !== "new" ? (notes.find((note) => note.id === editing.id) ?? null) : null;

  const night = colorScheme === "dark";

  return (
    <GestureHandlerRootView style={styles.board}>
      <WoodFrame night={night} />

      <View style={[styles.cork, { backgroundColor: NOTES_BOARD_BACKGROUND[colorScheme] }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          // Mientras se lleva una nota, el tablero solo se desplaza solo (al llegar a un borde), no con el dedo
          scrollEnabled={drag.dragId === null}
          scrollEventThrottle={16}
          onScroll={drag.onScroll}
          onContentSizeChange={(_, height) =>
            setContentHeight(Math.ceil(height / CORK_TILE) * CORK_TILE)
          }
        >
          {/* El corcho va dentro del contenido: se desplaza con los post-it como el de un tablero de verdad */}
          <CorkTiles
            width={width - 2 * FRAME}
            height={Math.max(contentHeight, height - 2 * FRAME)}
          />
          {night && <View style={[StyleSheet.absoluteFill, { backgroundColor: NIGHT_DIM }]} />}

          {items.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyNote}>
                <PostIt color={noteColorHex("yellow")} seed="empty" minHeight={200}>
                  <Text style={styles.emptyIcon}>📝</Text>
                  <Text style={styles.emptyTitle}>{tCommon("notes.emptyTitle")}</Text>
                  <Text style={styles.emptyHint}>{tCommon("notes.emptyHint")}</Text>
                </PostIt>
              </View>
            </View>
          ) : (
            <View style={styles.columns}>
              {columns.map((column, index) => (
                <View key={index} style={[styles.column, index === draggingColumn && styles.columnRaised]}>
                  {column.map(({ note, previewUri }) => (
                    <DraggableNote
                      key={note.id}
                      note={note}
                      previewUri={previewUri}
                      minHeight={cardSize}
                      onPress={() => setEditing({ id: note.id })}
                      drag={drag}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <FrameShadow />
      </View>

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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    // Si el marco no llegara a pintarse, este es el color de la madera
    backgroundColor: "#6B4429",
  },
  woodTop: { position: "absolute", top: 0, left: 0, right: 0, height: FRAME },
  woodBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FRAME,
    transform: [{ scaleY: -1 }],
  },
  woodLeft: { position: "absolute", top: FRAME, bottom: FRAME, left: 0, width: FRAME },
  woodRight: {
    position: "absolute",
    top: FRAME,
    bottom: FRAME,
    right: 0,
    width: FRAME,
    transform: [{ scaleX: -1 }],
  },
  cork: {
    flex: 1,
    margin: FRAME,
    overflow: "hidden",
  },
  tiles: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shadowTop: { position: "absolute", top: 0, left: 0, right: 0, height: EDGE_DEPTH },
  shadowBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: EDGE_DEPTH,
    transform: [{ scaleY: -1 }],
  },
  shadowLeft: { position: "absolute", top: 0, bottom: 0, left: 0, width: EDGE_DEPTH },
  shadowRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: EDGE_DEPTH,
    transform: [{ scaleX: -1 }],
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: PADDING,
    paddingTop: PADDING,
    // Hueco para que el botón "＋" no tape la última nota
    paddingBottom: 110,
  },
  columns: {
    flexDirection: "row",
    gap: GAP,
  },
  column: {
    flex: 1,
  },
  columnRaised: {
    zIndex: 10,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNote: {
    width: "100%",
    maxWidth: 280,
  },
  emptyIcon: {
    fontSize: 40,
    textAlign: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    color: NOTE_TEXT_COLOR,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  emptyHint: {
    color: NOTE_TEXT_COLOR,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    opacity: 0.85,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4B2E1A",
    borderWidth: 2,
    borderColor: "#8A5A34",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: {
    color: "#F7E4C0",
    fontSize: 28,
    lineHeight: 32,
  },
});
