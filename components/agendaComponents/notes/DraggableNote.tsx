import type { NoteDrag } from "@/hooks/use-note-drag";
import type { Note } from "@/utils/notes";
import React, { useCallback, useMemo } from "react";
import { Animated, StyleSheet, type View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import NoteCard from "./NoteCard";

// Lo que hay que mantener pulsado un post-it antes de poder arrastrarlo. Antes de eso, tocarlo lo abre y
// deslizar el dedo desplaza el tablero
export const LONG_PRESS_TO_DRAG_MS = 350;

interface DraggableNoteProps {
  readonly note: Note;
  readonly previewUri: string | null;
  readonly minHeight: number;
  readonly onPress: () => void;
  readonly drag: NoteDrag;
}

// Un post-it del tablero que se puede coger con el dedo (pulsación larga) y llevar a otro sitio. Toda la
// lógica está en useNoteDrag; esto solo lanza los gestos y pinta la nota levantada o marcada como destino
export default function DraggableNote({ note, previewUri, minHeight, onPress, drag }: DraggableNoteProps) {
  const { dragId, targetId, translate, setNode, begin, move, end } = drag;
  const dragging = dragId === note.id;
  const isTarget = targetId === note.id;

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        // Los gestos corren en el hilo de JS: el arrastre no necesita el de UI y no depende de worklets
        .runOnJS(true)
        .activateAfterLongPress(LONG_PRESS_TO_DRAG_MS)
        .onStart((event) => begin(note.id, { x: event.absoluteX, y: event.absoluteY }))
        .onUpdate((event) =>
          move(
            { x: event.absoluteX, y: event.absoluteY },
            { x: event.translationX, y: event.translationY }
          )
        )
        .onEnd((_event, success) => end(success))
        // También si el sistema cancela el gesto a medias: se cancela sin mover nada
        .onFinalize(() => end(false)),
    [begin, move, end, note.id]
  );

  const setRef = useCallback(
    (node: View | null) => {
      setNode(note.id, node);
    },
    [setNode, note.id]
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={setRef as unknown as React.Ref<View>}
        // Sin esto, Android puede quitar la vista del árbol nativo y no habría nada que medir ni coger
        collapsable={false}
        style={[
          dragging && styles.lifted,
          dragging && { transform: [...translate.getTranslateTransform(), { scale: 1.06 }] },
          isTarget && styles.target,
        ]}
      >
        <NoteCard note={note} previewUri={previewUri} minHeight={minHeight} onPress={onPress} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Por encima de las demás notas de su columna (la columna entera sube por encima de las otras: ver NotesBoard)
  lifted: {
    zIndex: 50,
    opacity: 0.96,
  },
  // La nota sobre la que está el dedo: se apaga un poco, para ver dónde va a caer la que se lleva
  target: {
    opacity: 0.55,
  },
});
