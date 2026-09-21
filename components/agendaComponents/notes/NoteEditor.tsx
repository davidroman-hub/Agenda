import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/hooks/use-i18n";
import { releaseUnusedFiles } from "@/services/attachments-cleanup";
import useNotesStore from "@/stores/notes-store";
import useThemeStore from "@/stores/theme-store";
import { Attachment, draftAddedFileNames } from "@/utils/attachments";
import {
  DEFAULT_NOTE_COLOR,
  isNoteEmpty,
  MAX_NOTE_LENGTH,
  Note,
  NOTE_COLORS,
  NOTE_TEXT_COLOR,
  NoteColorId,
  noteColorHex,
  sanitizeNoteText,
} from "@/utils/notes";
import React, { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import AttachmentsField from "../attachments/AttachmentsField";
import { modalStyles } from "../bookFragments/TaskEditionModalStyles";

interface NoteEditorProps {
  readonly visible: boolean;
  // La nota que se edita; null para crear una nueva
  readonly note: Note | null;
  readonly onClose: () => void;
}

const COLOR_LABEL_KEY: Record<NoteColorId, string> = {
  yellow: "notes.colorYellow",
  orange: "notes.colorOrange",
  pink: "notes.colorPink",
  green: "notes.colorGreen",
  mint: "notes.colorMint",
  blue: "notes.colorBlue",
};

// Crear o editar una nota: texto sobre un "post-it" del color elegido, colores y archivos adjuntos
export default function NoteEditor({ visible, note, onClose }: NoteEditorProps) {
  const { tCommon } = useI18n();
  const { colorScheme } = useThemeStore();
  const styles = modalStyles(colorScheme);

  const [text, setText] = useState("");
  const [color, setColor] = useState<NoteColorId>(DEFAULT_NOTE_COLOR);
  // Los archivos que se añaden ya están copiados en la app, pero no son de la nota hasta que se guarda
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setText(note?.text ?? "");
    setColor(note?.color ?? DEFAULT_NOTE_COLOR);
    setAttachments([...(note?.attachments ?? [])]);
    setShowError(false);
  }, [visible, note]);

  // Al descartar el borrador sobran los archivos que se añadieron en él; releaseUnusedFiles solo borra
  // los que ninguna nota ni tarea usa, así que nunca toca los ya guardados
  const discardDraftFiles = () => {
    releaseUnusedFiles(draftAddedFileNames(note?.attachments, attachments));
  };

  const handleCancel = () => {
    discardDraftFiles();
    onClose();
  };

  const handleSave = () => {
    const cleanText = sanitizeNoteText(text);
    if (isNoteEmpty({ text: cleanText, attachments })) {
      setShowError(true);
      return;
    }

    const { addNote, updateNote } = useNotesStore.getState();
    if (note) updateNote(note.id, { text: cleanText, color, attachments });
    else addNote({ text: cleanText, color, attachments });
    onClose();
  };

  const handleDelete = () => {
    if (!note) return;
    Alert.alert(tCommon("notes.deleteTitle"), tCommon("notes.deleteMessage"), [
      { text: tCommon("buttons.cancel"), style: "cancel" },
      {
        text: tCommon("buttons.delete"),
        style: "destructive",
        onPress: () => {
          discardDraftFiles();
          // Los archivos que la nota ya tenía los borra la limpieza (services/attachments-cleanup.ts)
          useNotesStore.getState().deleteNote(note.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <ThemedView style={styles.overlay}>
        <ThemedView style={[styles.container, { maxHeight: "92%" }]}>
          <ThemedText style={styles.title}>
            {note ? tCommon("notes.editTitle") : tCommon("notes.newNote")}
          </ThemedText>

          <ScrollView
            style={{ flexGrow: 0 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={[
                localStyles.input,
                { backgroundColor: noteColorHex(color), color: NOTE_TEXT_COLOR },
              ]}
              value={text}
              onChangeText={(value) => {
                setText(value);
                setShowError(false);
              }}
              placeholder={tCommon("notes.placeholder")}
              placeholderTextColor="rgba(59,50,0,0.5)"
              multiline
              maxLength={MAX_NOTE_LENGTH}
              autoFocus
            />

            <ThemedText style={localStyles.label}>{tCommon("notes.colorLabel")}</ThemedText>
            <View style={localStyles.colors}>
              {NOTE_COLORS.map((option) => {
                const selected = option.id === color;
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => setColor(option.id)}
                    accessibilityRole="button"
                    accessibilityLabel={tCommon(COLOR_LABEL_KEY[option.id])}
                    accessibilityState={{ selected }}
                    style={[
                      localStyles.swatch,
                      { backgroundColor: option.hex },
                      selected && localStyles.swatchSelected,
                    ]}
                  />
                );
              })}
            </View>

            <AttachmentsField
              attachments={attachments}
              onChange={(next) => {
                setAttachments(next);
                setShowError(false);
              }}
              colorScheme={colorScheme}
              tCommon={tCommon}
            />

            {showError && <ThemedText style={localStyles.error}>{tCommon("notes.errorEmpty")}</ThemedText>}
          </ScrollView>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <ThemedText style={[styles.buttonText, styles.cancelButtonText]}>
                {tCommon("buttons.cancel")}
              </ThemedText>
            </TouchableOpacity>

            {note && (
              <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
                <ThemedText style={[styles.buttonText, styles.deleteButtonText]}>
                  {tCommon("buttons.delete")}
                </ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
              <ThemedText style={[styles.buttonText, styles.saveButtonText]}>
                {tCommon("buttons.save")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  input: {
    minHeight: 150,
    maxHeight: 260,
    borderRadius: 4,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  colors: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    backgroundColor: "transparent",
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(128,128,128,0.4)",
  },
  swatchSelected: {
    borderColor: "#B8860B",
    borderWidth: 3,
  },
  error: {
    color: "#D32F2F",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
});
