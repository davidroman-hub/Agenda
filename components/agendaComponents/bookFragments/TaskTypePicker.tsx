import { ThemedText } from "@/components/themed-text";
import type { TaskType } from "@/stores/task-types-store";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

interface TaskTypePickerProps {
  readonly types: readonly TaskType[];
  // null = "Sin tipo" elegido a propósito; undefined = todavía sin decidir
  readonly value: string | null | undefined;
  readonly onChange: (typeId: string | null) => void;
  // Se intentó guardar sin decidir: se resalta el aviso
  readonly showError?: boolean;
  readonly colorScheme: "light" | "dark";
  readonly tCommon: (key: string, options?: any) => string;
}

// Selector de tipo de la tarea: una fila de chips ("Sin tipo" y los tipos que existan)
export default function TaskTypePicker({
  types,
  value,
  onChange,
  showError = false,
  colorScheme,
  tCommon,
}: TaskTypePickerProps) {
  const textColor = colorScheme === "dark" ? "#ffffff" : "#000000";
  const borderColor = colorScheme === "dark" ? "#555555" : "#cccccc";

  const chip = (
    key: string,
    label: string,
    selected: boolean,
    color: string | null,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected && color ? color : borderColor },
        selected && { backgroundColor: color ? `${color}33` : "rgba(128,128,128,0.2)" },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
      <ThemedText style={[styles.chipText, { color: textColor }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>{tCommon("taskTypes.typeLabel")}</ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
      >
        {chip("none", tCommon("taskTypes.noType"), value === null, null, () => onChange(null))}
        {types.map((type) =>
          chip(type.id, type.name, value === type.id, type.color, () => onChange(type.id))
        )}
      </ScrollView>

      {value === undefined && (
        <ThemedText style={[styles.hint, showError && styles.hintError]}>
          {tCommon("taskTypes.chooseType")}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  chips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 160,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 6,
  },
  hintError: {
    color: "#D32F2F",
    opacity: 1,
    fontWeight: "600",
  },
});
