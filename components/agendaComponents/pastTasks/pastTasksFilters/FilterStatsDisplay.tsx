import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { StyleSheet, View } from "react-native";
import { FilterStats } from "./usePastTasksFilters";

interface FilterStatsDisplayProps {
  stats: FilterStats;
  totalTasksAllTime: number;
  hasActiveFilters: boolean;
}

export const FilterStatsDisplay: React.FC<FilterStatsDisplayProps> = ({
  stats,
  totalTasksAllTime,
  hasActiveFilters,
}) => {
  const tintColor = useThemeColor({}, "tint");
  const successColor = "#4CAF50";
  const warningColor = "#FF9800";

  return (
    <ThemedView style={styles.statsContainer}>
      <ThemedText style={styles.statsTitle}>
        {hasActiveFilters ? "Estadísticas Filtradas" : "Estadísticas Generales"}
      </ThemedText>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statNumber, { color: tintColor }]}>
            {stats.totalTasks}
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            {hasActiveFilters ? "Filtradas" : "Total"}
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={[styles.statNumber, { color: successColor }]}>
            {stats.completedTasks}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Completadas</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={[styles.statNumber, { color: warningColor }]}>
            {stats.pendingTasks}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Pendientes</ThemedText>
        </View>
        
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
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
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
