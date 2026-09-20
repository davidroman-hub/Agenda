import { ThemedText } from "@/components/themed-text";
import { pickAndStoreAttachment, PickFailure } from "@/services/attachments-service";
import {
  Attachment,
  AttachmentKind,
  formatFileSize,
  getAttachmentKind,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ITEM,
} from "@/utils/attachments";
import React, { useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useAttachmentViewer } from "./useAttachmentViewer";

interface AttachmentsFieldProps {
  readonly attachments: readonly Attachment[];
  readonly onChange: (attachments: Attachment[]) => void;
  readonly colorScheme: "light" | "dark";
  readonly tCommon: (key: string, options?: any) => string;
}

const ICON_BY_KIND: Record<AttachmentKind, string> = {
  image: "🖼️",
  pdf: "📄",
  other: "📎",
};

// Campo "Adjuntos" del modal de tarea: lista de archivos (tocar uno lo abre) y botón para añadir
export default function AttachmentsField({
  attachments,
  onChange,
  colorScheme,
  tCommon,
}: AttachmentsFieldProps) {
  const [busy, setBusy] = useState(false);
  const { open, viewer } = useAttachmentViewer(tCommon);

  // La selección tarda (el usuario está en el selector del sistema): se usa la lista de ese momento
  const latest = useRef(attachments);
  latest.current = attachments;

  const textColor = colorScheme === "dark" ? "#ffffff" : "#000000";
  const borderColor = colorScheme === "dark" ? "#555555" : "#cccccc";
  const atLimit = attachments.length >= MAX_ATTACHMENTS_PER_ITEM;

  const failureMessage = (reason: PickFailure) => {
    switch (reason) {
      case "too-large":
        return tCommon("attachments.errorTooLarge", { max: formatFileSize(MAX_ATTACHMENT_BYTES) });
      case "too-many":
        return tCommon("attachments.errorTooMany", { max: MAX_ATTACHMENTS_PER_ITEM });
      case "empty":
        return tCommon("attachments.errorEmpty");
      case "unavailable":
        return tCommon("attachments.errorUnavailable");
      default:
        return tCommon("attachments.errorFailed");
    }
  };

  const handleAdd = async () => {
    if (busy || atLimit) return;
    setBusy(true);
    try {
      const result = await pickAndStoreAttachment(latest.current.length);
      if (result.status === "picked") {
        onChange([...latest.current, result.attachment]);
      } else if (result.status === "error") {
        Alert.alert(tCommon("attachments.errorTitle"), failureMessage(result.reason));
      }
    } finally {
      setBusy(false);
    }
  };

  // Quitarlo aquí solo lo saca de la ficha; el archivo se borra cuando la tarea se guarda sin él
  const handleRemove = (attachment: Attachment) =>
    onChange(latest.current.filter((item) => item.fileName !== attachment.fileName));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.label}>
          {tCommon("attachments.title")}
          {attachments.length > 0 && (
            <ThemedText style={styles.counter}>
              {"  "}
              {tCommon("attachments.counter", {
                count: attachments.length,
                max: MAX_ATTACHMENTS_PER_ITEM,
              })}
            </ThemedText>
          )}
        </ThemedText>

        <TouchableOpacity
          onPress={handleAdd}
          disabled={busy || atLimit}
          style={[styles.addButton, { borderColor }, (busy || atLimit) && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={tCommon("attachments.add")}
        >
          <ThemedText style={[styles.addText, { color: textColor }]}>
            📎 {tCommon("attachments.add")}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
        >
          {attachments.map((attachment) => (
            <View key={attachment.fileName} style={[styles.chip, { borderColor }]}>
              <TouchableOpacity
                onPress={() => open(attachment)}
                style={styles.chipMain}
                accessibilityRole="button"
                accessibilityLabel={attachment.name}
              >
                <ThemedText style={styles.chipIcon}>
                  {ICON_BY_KIND[getAttachmentKind(attachment)]}
                </ThemedText>
                <View style={styles.chipTexts}>
                  <ThemedText style={[styles.chipName, { color: textColor }]} numberOfLines={1}>
                    {attachment.name}
                  </ThemedText>
                  <ThemedText style={styles.chipSize}>{formatFileSize(attachment.size)}</ThemedText>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRemove(attachment)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={tCommon("attachments.remove")}
              >
                <ThemedText style={styles.remove}>✕</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {viewer}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    backgroundColor: "transparent",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  counter: {
    fontSize: 12,
    fontWeight: "400",
    opacity: 0.6,
  },
  addButton: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addText: {
    fontSize: 13,
  },
  disabled: {
    opacity: 0.4,
  },
  chips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 4,
    maxWidth: 220,
    gap: 8,
  },
  chipMain: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 6,
  },
  chipIcon: {
    fontSize: 18,
  },
  chipTexts: {
    flexShrink: 1,
    backgroundColor: "transparent",
  },
  chipName: {
    fontSize: 13,
  },
  chipSize: {
    fontSize: 11,
    opacity: 0.6,
  },
  remove: {
    fontSize: 15,
    opacity: 0.7,
  },
});
