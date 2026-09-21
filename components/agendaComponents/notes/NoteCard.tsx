import { Note, NOTE_CARD_MAX_LINES, NOTE_TEXT_COLOR, noteColorHex } from "@/utils/notes";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import PostIt from "./PostIt";

interface NoteCardProps {
  readonly note: Note;
  // Dirección de la primera imagen adjunta, si existe su archivo (vista previa en la tarjeta)
  readonly previewUri: string | null;
  // Alto mínimo del post-it (el ancho de la columna, para que sea cuadrado)
  readonly minHeight: number;
  readonly onPress: () => void;
}

// Un post-it del tablero: color de la nota, chincheta y una inclinación pequeña que es siempre la misma
export default function NoteCard({ note, previewUri, minHeight, onPress }: NoteCardProps) {
  const otherFiles = (note.attachments?.length ?? 0) - (previewUri ? 1 : 0);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={note.text.slice(0, 80) || note.attachments?.[0]?.name}
      style={styles.card}
    >
      <PostIt color={noteColorHex(note.color)} seed={note.id} minHeight={minHeight}>
        {previewUri && (
          <Image source={{ uri: previewUri }} style={styles.image} contentFit="cover" />
        )}

        {note.text !== "" && (
          <Text style={styles.text} numberOfLines={NOTE_CARD_MAX_LINES}>
            {note.text}
          </Text>
        )}

        {otherFiles > 0 && <Text style={styles.files}>📎 {otherFiles}</Text>}
      </PostIt>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Deja sitio para la sombra y para lo que se sale al torcerse
  card: {
    marginBottom: 22,
  },
  image: {
    height: 100,
    borderRadius: 2,
    marginBottom: 8,
  },
  text: {
    color: NOTE_TEXT_COLOR,
    fontSize: 15,
    lineHeight: 20,
  },
  files: {
    color: NOTE_TEXT_COLOR,
    fontSize: 13,
    marginTop: 8,
    opacity: 0.8,
  },
});
