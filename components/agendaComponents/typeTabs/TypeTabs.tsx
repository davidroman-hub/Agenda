import { ThemedText } from "@/components/themed-text";
import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useTaskTypesStore from "@/stores/task-types-store";
import { getVisibleTabs, hasUntypedTasks, resolveFilter } from "@/utils/task-types";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import TaskTypesManager from "./TaskTypesManager";

// Tira de pestañas de la agenda: "Todas", "Sin tipo" y una por cada tipo de tarea.
// No se ve hasta que existe algún tipo, así que quien no los usa no nota ningún cambio.
export default function TypeTabs() {
  const { tCommon } = useI18n();
  const types = useTaskTypesStore((state) => state.types);
  const activeFilter = useTaskTypesStore((state) => state.activeFilter);
  const setActiveFilter = useTaskTypesStore((state) => state.setActiveFilter);
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const [managerVisible, setManagerVisible] = useState(false);

  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  const knownTypeIds = useMemo(() => new Set(types.map((type) => type.id)), [types]);
  const filter = resolveFilter(activeFilter, knownTypeIds);
  const hasUntyped = useMemo(
    () => hasUntypedTasks(tasksByDate, knownTypeIds),
    [tasksByDate, knownTypeIds]
  );
  const tabs = getVisibleTabs({ types, hasUntyped, filter });

  if (tabs.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {tabs.map((tab) => {
          const type = types.find((candidate) => candidate.id === tab.typeId);
          const selected = filter === tab.filter;
          const accent = type?.color ?? tintColor;
          const label =
            tab.kind === "all"
              ? tCommon("taskTypes.tabAll")
              : tab.kind === "none"
                ? tCommon("taskTypes.tabNone")
                : (type?.name ?? "");

          return (
            <TouchableOpacity
              key={tab.filter}
              onPress={() => setActiveFilter(tab.filter)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[
                styles.tab,
                selected && { borderBottomColor: accent, backgroundColor: `${accent}22` },
              ]}
            >
              {type && <View style={[styles.dot, { backgroundColor: type.color }]} />}
              <ThemedText
                numberOfLines={1}
                style={[styles.tabText, { color: textColor }, selected && styles.tabTextSelected]}
              >
                {label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setManagerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={tCommon("taskTypes.manageTitle")}
          style={styles.tab}
        >
          <ThemedText style={[styles.tabText, { color: textColor }]}>＋</ThemedText>
        </TouchableOpacity>
      </ScrollView>

      <TaskTypesManager visible={managerVisible} onClose={() => setManagerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.25)",
  },
  tabs: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: "flex-end",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxWidth: 160,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    opacity: 0.75,
  },
  tabTextSelected: {
    fontWeight: "700",
    opacity: 1,
  },
});
