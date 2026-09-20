import { ThemedText } from "@/components/themed-text";
import { formatDayLabel, YearEntry, YearListRow, YearSeries } from "@/utils/year-view";
import React from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

// Las reglas de repetición que tienen texto traducido (taskRepeat.<regla>)
const KNOWN_REPEAT_OPTIONS = new Set(["daily", "twice", "three", "five", "weekly", "monthly"]);

interface YearTasksListProps {
  readonly rows: readonly YearListRow[];
  readonly names: {
    readonly dayNamesShort: readonly string[];
    readonly monthNamesShort: readonly string[];
  };
  readonly typeColorById: ReadonlyMap<string, string>;
  readonly accent: string;
  readonly emptyText: string;
  readonly onToggle: (entry: YearEntry) => void;
  readonly onOpen: (entry: YearEntry) => void;
  readonly onOpenSeries: (series: YearSeries) => void;
  readonly onScrollOffset?: (offsetY: number) => void;
  readonly listRef?: React.Ref<FlatList<YearListRow>>;
  readonly tCommon: (key: string, options?: any) => string;
}

// La lista de tareas del año, un mes o un día: cabecera por fecha y sus tareas debajo, con su casilla
export default function YearTasksList({
  rows,
  names,
  typeColorById,
  accent,
  emptyText,
  onToggle,
  onOpen,
  onOpenSeries,
  onScrollOffset,
  listRef,
  tCommon,
}: YearTasksListProps) {
  const renderRow = ({ item }: { item: YearListRow }) => {
    switch (item.kind) {
      case "date":
        return (
          <ThemedText style={[styles.dateHeader, { borderBottomColor: `${accent}55` }]}>
            {formatDayLabel(item.dateKey, names)}
          </ThemedText>
        );

      case "task": {
        const { entry } = item;
        const { task } = entry;
        const typeColor = task.typeId ? typeColorById.get(task.typeId) : undefined;

        return (
          <View style={[styles.taskRow, typeColor && { borderLeftColor: typeColor, borderLeftWidth: 3 }]}>
            <TouchableOpacity
              onPress={() => onToggle(entry)}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.completed }}
              accessibilityLabel={tCommon(
                task.completed ? "taskEditModal.markAsIncomplete" : "taskEditModal.markAsCompleted"
              )}
              style={[styles.checkbox, task.completed && styles.checkboxDone]}
            >
              {task.completed && <ThemedText style={styles.check}>✓</ThemedText>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => onOpen(entry)} style={styles.taskBody}>
              <ThemedText
                numberOfLines={2}
                style={[styles.taskText, task.completed && styles.taskTextDone]}
              >
                {task.text}
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.icons}>
              {entry.line === null && <ThemedText style={styles.icon}>🔄</ThemedText>}
              {Boolean(task.reminder) && <ThemedText style={styles.icon}>⏰</ThemedText>}
              {Boolean(task.attachments?.length) && <ThemedText style={styles.icon}>📎</ThemedText>}
            </View>
          </View>
        );
      }

      case "seriesTitle":
        return (
          <ThemedText style={[styles.dateHeader, styles.seriesTitle, { borderBottomColor: `${accent}55` }]}>
            {tCommon("yearView.repeatsTitle")}
          </ThemedText>
        );

      case "series": {
        const { series } = item;
        const typeColor = series.task.typeId ? typeColorById.get(series.task.typeId) : undefined;
        const rule = KNOWN_REPEAT_OPTIONS.has(series.repeatOption)
          ? `${tCommon(`taskRepeat.${series.repeatOption}`)} · `
          : "";

        return (
          <TouchableOpacity
            onPress={() => onOpenSeries(series)}
            style={[styles.taskRow, typeColor && { borderLeftColor: typeColor, borderLeftWidth: 3 }]}
          >
            <ThemedText style={styles.seriesIcon}>🔄</ThemedText>
            <View style={styles.taskBody}>
              <ThemedText numberOfLines={2} style={styles.taskText}>
                {series.task.text}
              </ThemedText>
              <ThemedText style={styles.seriesInfo}>
                {rule}
                {tCommon("yearView.occurrences", { count: series.occurrences })}
              </ThemedText>
            </View>
          </TouchableOpacity>
        );
      }
    }
  };

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={rows as YearListRow[]}
      keyExtractor={(row) => row.key}
      renderItem={renderRow}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      // Las filas son bajas (~32 px): con las 10 de serie, una página alta de tablet se vería a medio
      // llenar un momento; con 24 se cubre la pantalla desde el primer dibujo
      initialNumToRender={24}
      scrollEventThrottle={16}
      onScroll={
        onScrollOffset
          ? (event: NativeSyntheticEvent<NativeScrollEvent>) =>
              onScrollOffset(event.nativeEvent.contentOffset.y)
          : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    textTransform: "capitalize",
  },
  seriesTitle: {
    marginTop: 18,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingLeft: 6,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 22,
    borderWidth: 2,
    borderRadius: 3,
    borderColor: "#888",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  check: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  taskBody: {
    flex: 1,
  },
  taskText: {
    fontSize: 15,
    lineHeight: 20,
  },
  taskTextDone: {
    textDecorationLine: "line-through",
    opacity: 0.55,
  },
  icons: {
    flexDirection: "row",
    gap: 2,
  },
  icon: {
    fontSize: 12,
  },
  seriesIcon: {
    fontSize: 15,
  },
  seriesInfo: {
    fontSize: 12,
    opacity: 0.6,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.6,
  },
});
