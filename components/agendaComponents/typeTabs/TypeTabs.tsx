import { ThemedText } from "@/components/themed-text";
import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import useAgendaSectionStore from "@/stores/agenda-section-store";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useTaskTypesStore from "@/stores/task-types-store";
import { getStripTabs } from "@/utils/agenda-strip";
import { NOTES_ACCENT } from "@/utils/notes";
import { hasUntypedTasks, resolveFilter } from "@/utils/task-types";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import TaskTypesManager from "./TaskTypesManager";

// Tira de pestañas de la agenda: las de tareas ("Todas", "Sin tipo" y una por cada tipo; solo
// "Agenda" mientras no haya tipos) y, fijos a la derecha, el conmutador Libro/Año y "Notas". Los tipos
// filtran lo que se ve, sea el libro o el año; Libro/Año y Notas cambian el contenido de debajo.
export default function TypeTabs() {
  const { tCommon } = useI18n();
  const types = useTaskTypesStore((state) => state.types);
  const activeFilter = useTaskTypesStore((state) => state.activeFilter);
  const setActiveFilter = useTaskTypesStore((state) => state.setActiveFilter);
  const section = useAgendaSectionStore((state) => state.section);
  const showNotes = useAgendaSectionStore((state) => state.showNotes);
  const showAgenda = useAgendaSectionStore((state) => state.showAgenda);
  const agendaView = useAgendaSectionStore((state) => state.agendaView);
  const showBook = useAgendaSectionStore((state) => state.showBook);
  const showYear = useAgendaSectionStore((state) => state.showYear);
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const [managerVisible, setManagerVisible] = useState(false);

  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  const knownTypeIds = useMemo(
    () => new Set(types.map((type) => type.id)),
    [types],
  );
  const filter = resolveFilter(activeFilter, knownTypeIds);
  const hasUntyped = useMemo(
    () => hasUntypedTasks(tasksByDate, knownTypeIds),
    [tasksByDate, knownTypeIds],
  );
  const tabs = getStripTabs({ types, hasUntyped, filter, section });
  const notesSelected = section === "notes";
  const inAgenda = section === "agenda";

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => {
            const type = types.find((candidate) => candidate.id === tab.typeId);
            const selected = tab.selected;
            const accent = type?.color ?? tintColor;
            const label = {
              agenda: tCommon("notes.tabAgenda"),
              all: tCommon("taskTypes.tabAll"),
              none: tCommon("taskTypes.tabNone"),
              type: type?.name ?? "",
            }[tab.kind];

            return (
              <TouchableOpacity
                key={tab.filter}
                onPress={() => {
                  setActiveFilter(tab.filter);
                  showAgenda();
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[
                  styles.tab,
                  selected && {
                    borderBottomColor: accent,
                    backgroundColor: `${accent}22`,
                  },
                ]}
              >
                {type && (
                  <View style={[styles.dot, { backgroundColor: type.color }]} />
                )}
                <ThemedText
                  numberOfLines={1}
                  style={[
                    styles.tabText,
                    { color: textColor },
                    selected && styles.tabTextSelected,
                  ]}
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
            <ThemedText style={[styles.tabText, { color: textColor }]}>
              ＋
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.viewToggle}>
          {(["book", "year"] as const).map((view) => {
            const selected = inAgenda && agendaView === view;
            return (
              <TouchableOpacity
                key={view}
                onPress={view === "book" ? showBook : showYear}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={tCommon(
                  view === "book" ? "yearView.toggleBook" : "yearView.toggleYear",
                )}
                style={[
                  styles.tab,
                  styles.viewTab,
                  selected && { borderBottomColor: tintColor, backgroundColor: `${tintColor}22` },
                ]}
              >
                <ThemedText style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {view === "book" ? "📖" : "🗓️"}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={showNotes}
          accessibilityRole="tab"
          accessibilityState={{ selected: notesSelected }}
          style={[
            styles.tab,
            styles.notesTab,
            notesSelected && {
              borderBottomColor: NOTES_ACCENT,
              backgroundColor: `${NOTES_ACCENT}33`,
            },
          ]}
        >
          <ThemedText
            numberOfLines={1}
            style={[
              styles.tabText,
              { color: textColor },
              notesSelected && styles.tabTextSelected,
            ]}
          >
            📝 {tCommon("tabs.notes")}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <TaskTypesManager
        visible={managerVisible}
        onClose={() => setManagerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.25)",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  scroll: {
    flex: 1,
  },
  // Libro / Año: dos botones de icono, siempre a la vista junto a "Notas"
  viewToggle: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(128,128,128,0.25)",
  },
  viewTab: {
    paddingHorizontal: 9,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  // "Notas" queda siempre a la vista, por muchos tipos que haya, y separada de las de tareas
  notesTab: {
    marginRight: 12,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(128,128,128,0.25)",
    borderTopLeftRadius: 0,
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
