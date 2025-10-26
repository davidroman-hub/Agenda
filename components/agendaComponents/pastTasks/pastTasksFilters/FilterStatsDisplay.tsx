import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { FilterStats, TaskStatusFilter } from "./usePastTasksFilters";

interface FilterStatsDisplayProps {
  stats: FilterStats;
  totalTasksAllTime: number;
  hasActiveFilters: boolean;
  statusFilter: TaskStatusFilter;
  onStatusFilterChange: (filter: TaskStatusFilter) => void;
  onResetStatusFilter: () => void;
}

export const FilterStatsDisplay: React.FC<FilterStatsDisplayProps> = ({
  stats,
  totalTasksAllTime,
  hasActiveFilters,
  statusFilter,
  onStatusFilterChange,
  onResetStatusFilter,
}) => {
  const tintColor = useThemeColor({}, "tint");
  const successColor = "#4CAF50";
  const warningColor = "#FF9800";

  const getStatItemStyle = (filterType: TaskStatusFilter) => [
    styles.statItem,
    statusFilter === filterType && styles.statItemActive,
  ];

  const getStatNumberStyle = (color: string, filterType: TaskStatusFilter) => [
    styles.statNumber,
    { color },
    statusFilter === filterType && styles.statNumberActive,
  ];

  const getTitle = () => {
    if (statusFilter === 'completed') return "Estadísticas (Mostrando: Completadas)";
    if (statusFilter === 'pending') return "Estadísticas (Mostrando: Pendientes)";
    return hasActiveFilters ? "Estadísticas Filtradas" : "Estadísticas Generales";
  };

  return (
    <ThemedView style={styles.statsContainer}>
      <View style={styles.titleRow}>
        <ThemedText style={styles.statsTitle}>
          {getTitle()}
        </ThemedText>
        {statusFilter !== 'all' && (
          <TouchableOpacity onPress={onResetStatusFilter} style={styles.resetButton}>
            <ThemedText style={styles.resetButtonText}>Mostrar Todas</ThemedText>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={getStatItemStyle('all')} 
          onPress={() => onStatusFilterChange('all')}
          activeOpacity={0.7}
        >
          <ThemedText style={getStatNumberStyle(tintColor, 'all')}>
            {stats.totalTasks}
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            {hasActiveFilters ? "Filtradas" : "Total"}
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={getStatItemStyle('completed')} 
          onPress={() => onStatusFilterChange('completed')}
          activeOpacity={0.7}
        >
          <ThemedText style={getStatNumberStyle(successColor, 'completed')}>
            {stats.completedTasks}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Completadas</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={getStatItemStyle('pending')} 
          onPress={() => onStatusFilterChange('pending')}
          activeOpacity={0.7}
        >
          <ThemedText style={getStatNumberStyle(warningColor, 'pending')}>
            {stats.pendingTasks}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Pendientes</ThemedText>
        </TouchableOpacity>
        
        <View style={styles.statItem}>
          <ThemedText style={[styles.statNumber, { color: tintColor }]}>
            {stats.completionRate}%
          </ThemedText>
          <ThemedText style={styles.statLabel}>Completitud</ThemedText>
        </View>
      </View>
      
      {hasActiveFilters && (
        <ThemedText style={styles.totalInfo}>
          Total de tareas pasadas: {totalTasksAllTime}
        </ThemedText>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resetButtonText: {
    fontSize: 10,
    color: '#FF3B30',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  statItemActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  statNumberActive: {
    transform: [{ scale: 1.1 }],
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  totalInfo: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    opacity: 0.6,
  },
});
