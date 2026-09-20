import { Note, NOTE_CARD_MAX_LINES, NOTE_TEXT_COLOR, noteColorHex, noteRotation } from "@/utils/notes";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface NoteCardProps {
  readonly note: Note;
  // Dirección de la primera imagen adjunta, si existe su archivo (vista previa en la tarjeta)
  readonly previewUri: string | null;
  readonly onPress: () => void;
}

// Un post-it: color de la nota, cinta arriba y una inclinación pequeña que es siempre la misma
export default function NoteCard({ note, previewUri, onPress }: NoteCardProps) {
  const otherFiles = (note.attachments?.length ?? 0) - (previewUri ? 1 : 0);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={note.text.slice(0, 80) || note.attachments?.[0]?.name}
      style={[
        styles.card,
        {
          backgroundColor: noteColorHex(note.color),
          transform: [{ rotate: `${noteRotation(note.id)}deg` }],
        },
      ]}
    >
      <View style={styles.tape} />

      {previewUri && (
        <Image source={{ uri: previewUri }} style={styles.image} contentFit="cover" />
      )}

      {note.text !== "" && (
        <Text style={styles.text} numberOfLines={NOTE_CARD_MAX_LINES}>
          {note.text}
        </Text>
      )}

      {otherFiles > 0 && <Text style={styles.files}>📎 {otherFiles}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  // La franja pegajosa de arriba, un poco más oscura que el papel
  tape: {
    height: 14,
    marginHorizontal: -12,
    marginBottom: 8,
    backgroundColor: "rgba(0,0,0,0.08)",
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
