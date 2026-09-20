import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { countTasksUsingType, deleteTaskType } from "@/services/task-types-service";
import useTaskTypesStore, { TaskType, TypeResult } from "@/stores/task-types-store";
import {
  MAX_TASK_TYPE_NAME_LENGTH,
  MAX_TASK_TYPES,
  nextTypeColor,
  TASK_TYPE_COLORS,
} from "@/utils/task-types";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface TaskTypesManagerProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

type Translate = (key: string, options?: any) => string;

// Texto del error de una operación con tipos
const errorText = (
  result: Extract<TypeResult, { ok: false }>,
  tCommon: Translate
): string | null => {
  switch (result.reason) {
    case "empty":
      return tCommon("taskTypes.errorEmpty");
    case "taken":
      return tCommon("taskTypes.errorTaken");
    case "limit":
      return tCommon("taskTypes.errorLimit", { max: MAX_TASK_TYPES });
    default:
      return null;
  }
};

function ColorPalette({
  selected,
  onSelect,
  textColor,
}: {
  readonly selected: string;
  readonly onSelect: (color: string) => void;
  readonly textColor: string;
}) {
  return (
    <View style={styles.palette}>
      {TASK_TYPE_COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          onPress={() => onSelect(color)}
          accessibilityRole="button"
          accessibilityState={{ selected: color === selected }}
          style={[
            styles.swatch,
            { backgroundColor: color },
            color === selected && { borderColor: textColor, borderWidth: 3 },
          ]}
        />
      ))}
    </View>
  );
}

// Una fila de la lista: color (pulsa para cambiarlo), nombre editable y papelera
function TypeRow({
  type,
  textColor,
  borderColor,
  tCommon,
}: {
  readonly type: TaskType;
  readonly textColor: string;
  readonly borderColor: string;
  readonly tCommon: Translate;
}) {
  const renameType = useTaskTypesStore((state) => state.renameType);
  const setTypeColor = useTaskTypesStore((state) => state.setTypeColor);
  const [draft, setDraft] = useState(type.name);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commitName = () => {
    if (draft === type.name) return;

    const result = renameType(type.id, draft);
    if (result.ok) {
      setError(null);
    } else {
      setError(errorText(result, tCommon));
      setDraft(type.name);
    }
  };

  const confirmDelete = () => {
    const count = countTasksUsingType(type.id);
    Alert.alert(
      tCommon("taskTypes.deleteTitle"),
      count > 0
        ? tCommon("taskTypes.deleteMessageWithTasks", { name: type.name, count })
        : tCommon("taskTypes.deleteMessageNoTasks", { name: type.name }),
      [
        { text: tCommon("buttons.cancel"), style: "cancel" },
        {
          text: tCommon("buttons.delete"),
          style: "destructive",
          onPress: () => deleteTaskType(type.id),
        },
      ]
    );
  };

  return (
    <View style={[styles.row, { borderColor }]}>
      <View style={styles.rowMain}>
        <TouchableOpacity
          onPress={() => setPaletteOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={tCommon("taskTypes.colorLabel")}
          style={[styles.colorDot, { backgroundColor: type.color }]}
        />
        <TextInput
          style={[styles.nameInput, { color: textColor }]}
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            setError(null);
          }}
          onBlur={commitName}
          onSubmitEditing={commitName}
          maxLength={MAX_TASK_TYPE_NAME_LENGTH}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={confirmDelete}
          accessibilityRole="button"
          accessibilityLabel={tCommon("buttons.delete")}
          style={styles.deleteButton}
        >
          <ThemedText style={styles.deleteText}>🗑️</ThemedText>
        </TouchableOpacity>
      </View>

      {paletteOpen && (
        <ColorPalette
          selected={type.color}
          onSelect={(color) => setTypeColor(type.id, color)}
          textColor={textColor}
        />
      )}
      {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
    </View>
  );
}

// Crear, renombrar, recolorear y borrar los tipos de tarea. Cada tipo nuevo aparece como una
// pestaña en la agenda.
export default function TaskTypesManager({ visible, onClose }: TaskTypesManagerProps) {
  const { tCommon } = useI18n();
  const types = useTaskTypesStore((state) => state.types);
  const addType = useTaskTypesStore((state) => state.addType);

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = "rgba(128,128,128,0.35)";

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Color del tipo nuevo: el elegido, o el primero que no usa ningún otro tipo
  const color = newColor ?? nextTypeColor(types);

  const handleAdd = () => {
    const result = addType(newName, color);
    if (result.ok) {
      setNewName("");
      setNewColor(null);
      setError(null);
    } else {
      setError(errorText(result, tCommon));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>{tCommon("taskTypes.manageTitle")}</ThemedText>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={tCommon("buttons.close")}
            style={styles.closeButton}
          >
            <ThemedText style={styles.closeText}>✕</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {/* Nuevo tipo: arriba, para que el teclado no lo tape */}
          <View style={[styles.addBox, { borderColor }]}>
            <View style={styles.rowMain}>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <TextInput
                style={[styles.nameInput, { color: textColor }]}
                value={newName}
                onChangeText={(text) => {
                  setNewName(text);
                  setError(null);
                }}
                placeholder={tCommon("taskTypes.newTypePlaceholder")}
                placeholderTextColor="#888888"
                maxLength={MAX_TASK_TYPE_NAME_LENGTH}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleAdd}
                accessibilityRole="button"
                style={[styles.addButton, { backgroundColor: tintColor }]}
              >
                <ThemedText style={styles.addButtonText}>{tCommon("taskTypes.add")}</ThemedText>
              </TouchableOpacity>
            </View>
            <ColorPalette selected={color} onSelect={setNewColor} textColor={textColor} />
            {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
          </View>

          {types.length === 0 ? (
            <ThemedText style={styles.emptyText}>{tCommon("taskTypes.emptyList")}</ThemedText>
          ) : (
            types.map((type) => (
              <TypeRow
                key={type.id}
                type={type}
                textColor={textColor}
                borderColor={borderColor}
                tCommon={tCommon}
              />
            ))
          )}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  closeButton: { padding: 8 },
  closeText: { fontSize: 20 },
  content: { padding: 16, gap: 12 },
  addBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  rowMain: { flexDirection: "row", alignItems: "center", gap: 10 },
  colorDot: { width: 26, height: 26, borderRadius: 13 },
  nameInput: { flex: 1, fontSize: 16, paddingVertical: 6 },
  deleteButton: { padding: 6 },
  deleteText: { fontSize: 18 },
  addButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: "#ffffff", fontWeight: "600" },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "transparent" },
  errorText: { color: "#D32F2F", fontSize: 13 },
  emptyText: { textAlign: "center", opacity: 0.7, marginTop: 20 },
});
