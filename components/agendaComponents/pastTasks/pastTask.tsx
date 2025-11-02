import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/hooks/use-i18n";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import { formatDateWithI18n } from "@/utils/locale-config";
import { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import {
  calculateFilterStats,
  calculateTotalTasksAllTime,
  FilterChips,
  FilterStatsDisplay,
  getFilteredPastTasks,
  usePastTasksFilters,
} from "./pastTasksFilters";

export default function PastTasks() {
  const { tasksByDate, toggleTaskCompletion } = useAgendaTasksStore();
  const { tAgenda, currentLanguage, tCommon } = useI18n();

  // Usar el hook de filtros refactorizado
  const {
    selectedYear,
    selectedMonth,
    statusFilter,
    setSelectedYear,
    setSelectedMonth,
    setStatusFilter,
    availableYears,
    availableMonths,
    dateMatchesFilters,
    hasActiveFilters,
    resetFilters,
    resetStatusFilter,
  } = usePastTasksFilters();

  // Manejadores de filtros
  const handleYearSelect = (year: number | null) => {
    setSelectedYear(year);
    if (year === null) {
      setSelectedMonth(null);
    }
  };

  const handleMonthSelect = (month: number | null) => {
    setSelectedMonth(month);
  };

  // Obtener tareas pasadas filtradas solo por fecha (sin filtro de estado para estadísticas)
  const tasksFilteredByDate = useMemo(
    () => getFilteredPastTasks(tasksByDate, dateMatchesFilters, "all"),
    [tasksByDate, dateMatchesFilters]
  );

  // Obtener tareas pasadas filtradas con filtro de estado para la vista
  const filteredTasks = useMemo(
    () => getFilteredPastTasks(tasksByDate, dateMatchesFilters, statusFilter),
    [tasksByDate, dateMatchesFilters, statusFilter]
  );

  // Calcular estadísticas basándose en todas las tareas que coinciden con filtros de fecha
  const stats = useMemo(
    () => calculateFilterStats(tasksFilteredByDate),
    [tasksFilteredByDate]
  );

  const totalTasksAllTime = useMemo(
    () => calculateTotalTasksAllTime(tasksByDate),
    [tasksByDate]
  );

  const handleTaskToggle = (date: string, lineNumber: number) => {
    toggleTaskCompletion(date, lineNumber);
  };

  if (filteredTasks.length === 0) {
    return (
      <ThemedView style={styles.container}>
        {/* Usar el componente de filtros refactorizado */}
        <FilterChips
          tCommon={tCommon}
          tAgenda={tAgenda}
          years={availableYears}
          months={availableMonths}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearSelect={handleYearSelect}
          onMonthSelect={handleMonthSelect}
        />

        {hasActiveFilters && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={resetFilters}
          >
            <ThemedText style={styles.clearFiltersText}>
              🗑️ {tCommon("pastTasks.cleanFilters")}
            </ThemedText>
          </TouchableOpacity>
        )}

        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyIcon}>
            {hasActiveFilters ? "🔍" : "📅"}
          </ThemedText>
          <ThemedText style={styles.emptyTitle}>
            {hasActiveFilters
              ? tCommon("pastTasks.noResults")
              : tCommon("pastTasks.notPastTasks")}
          </ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            {hasActiveFilters
              ? tCommon("pastTasks.adjustFilters")
              : tCommon("pastTasks.hereAppears")}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Usar el componente de filtros refactorizado */}
      <FilterChips
        tCommon={tCommon}
        years={availableYears}
        months={availableMonths}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearSelect={handleYearSelect}
        onMonthSelect={handleMonthSelect}
        tAgenda={tAgenda}
      />

      {hasActiveFilters && (
        <TouchableOpacity
          style={styles.clearFiltersButton}
          onPress={resetFilters}
        >
          <ThemedText style={styles.clearFiltersText}>
            🗑️ {tCommon("pastTasks.cleanFilters")}
          </ThemedText>
        </TouchableOpacity>
      )}

      {/* Usar el componente de estadísticas refactorizado */}
      <FilterStatsDisplay
        tCommon={tCommon}
        stats={stats}
        totalTasksAllTime={totalTasksAllTime}
        hasActiveFilters={hasActiveFilters}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onResetStatusFilter={resetStatusFilter}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {filteredTasks.map(({ date, tasks }) => (
          <ThemedView key={date} style={styles.dateSection}>
            <ThemedText style={styles.dateHeader}>
              {formatDateWithI18n(new Date(date))}
            </ThemedText>

            <ThemedView style={styles.tasksContainer}>
              {tasks.map(({ lineNumber, task }) => (
                <TouchableOpacity
                  key={`${date}-${lineNumber}`}
                  style={[
                    styles.taskItem,
                    task.completed && styles.taskItemCompleted,
                  ]}
                  onPress={() => handleTaskToggle(date, lineNumber)}
                >
                  <ThemedText style={styles.taskCheckbox}>
                    {task.completed ? "✅" : "⬜"}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.taskText,
                      task.completed && styles.taskTextCompleted,
                    ]}
                  >
                    {task.text}
                  </ThemedText>
                  {task.reminder && (
                    <ThemedText style={styles.reminderIcon}>🔔</ThemedText>
                  )}
                </TouchableOpacity>
              ))}
            </ThemedView>
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  clearFiltersButton: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 16,
  },
  clearFiltersText: {
    fontSize: 12,
    color: "#FF3B30",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 22,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.3)",
    textTransform: "capitalize",
  },
  tasksContainer: {
    gap: 8,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  taskItemCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderLeftColor: "#22C55E",
  },
  taskCheckbox: {
    fontSize: 16,
    marginRight: 12,
  },
  taskText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  reminderIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
});
