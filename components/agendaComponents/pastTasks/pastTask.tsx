import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import useAgendaTasksStore, { AgendaTask } from "@/stores/agenda-tasks-store";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useMemo, useState, useCallback } from "react";

// Función auxiliar para procesar tareas de una fecha
const processTasksForDate = (dayTasks: any) => {
  const tasksForDate: { lineNumber: number; task: AgendaTask }[] = [];
  
  for (const [lineNumber, task] of Object.entries(dayTasks)) {
    if (task) {
      tasksForDate.push({
        lineNumber: Number.parseInt(lineNumber, 10),
        task: task as AgendaTask,
      });
    }
  }
  
  tasksForDate.sort((a, b) => a.lineNumber - b.lineNumber);
  return tasksForDate;
};

export default function PastTasks() {
  const { tasksByDate, toggleTaskCompletion } = useAgendaTasksStore();
  
  // Estados para filtros
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Obtener años disponibles de tareas pasadas
  const availableYears = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const years = new Set<number>();
    
    for (const date of Object.keys(tasksByDate)) {
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate < today) {
        years.add(taskDate.getFullYear());
      }
    }
    
    return Array.from(years).sort((a, b) => b - a); // Ordenar descendente
  }, [tasksByDate]);

  // Obtener meses disponibles para el año seleccionado
  const availableMonths = useMemo(() => {
    if (!selectedYear) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const months = new Set<number>();
    
    for (const date of Object.keys(tasksByDate)) {
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate < today && taskDate.getFullYear() === selectedYear) {
        months.add(taskDate.getMonth());
      }
    }
    
    return Array.from(months).sort((a, b) => b - a); // Ordenar descendente
  }, [tasksByDate, selectedYear]);

  // Función auxiliar para verificar si una fecha cumple con los filtros
  const dateMatchesFilters = useCallback((taskDate: Date) => {
    if (selectedYear && taskDate.getFullYear() !== selectedYear) {
      return false;
    }
    
    if (selectedMonth !== null && taskDate.getMonth() !== selectedMonth) {
      return false;
    }
    
    return true;
  }, [selectedYear, selectedMonth]);

  // Obtener tareas pasadas filtradas
  const pastTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pastTasksData: {
      date: string;
      tasks: { lineNumber: number; task: AgendaTask }[];
    }[] = [];

    for (const [date, dayTasks] of Object.entries(tasksByDate)) {
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
      
      // Solo incluir fechas anteriores a hoy que cumplan con los filtros
      if (taskDate < today && dateMatchesFilters(taskDate)) {
        const tasksForDate = processTasksForDate(dayTasks);
        
        if (tasksForDate.length > 0) {
          pastTasksData.push({
            date,
            tasks: tasksForDate,
          });
        }
      }
    }

    pastTasksData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return pastTasksData;
  }, [tasksByDate, dateMatchesFilters]);

  // Función para obtener el nombre del mes
  const getMonthName = useCallback((monthIndex: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  }, []);

  // Función para resetear filtros
  const resetFilters = useCallback(() => {
    setSelectedYear(null);
    setSelectedMonth(null);
  }, []);

  // Calcular estadísticas
  const stats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    
    for (const { tasks } of pastTasks) {
      for (const { task } of tasks) {
        totalTasks++;
        if (task.completed) {
          completedTasks++;
        }
      }
    }
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      completionRate,
    };
  }, [pastTasks]);

  // Calcular total de tareas sin filtros para comparación
  const totalTasksAllTime = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let total = 0;
    for (const [date, dayTasks] of Object.entries(tasksByDate)) {
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate < today) {
        for (const task of Object.values(dayTasks)) {
          if (task) total++;
        }
      }
    }
    return total;
  }, [tasksByDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return "Ayer";
    } else {
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const handleTaskToggle = (date: string, lineNumber: number) => {
    toggleTaskCompletion(date, lineNumber);
  };

  if (pastTasks.length === 0) {
    const hasActiveFilters = selectedYear || selectedMonth !== null;
    
    return (
      <ThemedView style={styles.container}>
        {/* Mostrar filtros incluso cuando no hay resultados */}
        <ThemedView style={styles.filtersContainer}>
          <ThemedText style={styles.filtersTitle}>🔍 Filtros</ThemedText>
          
          {hasActiveFilters && (
            <ThemedView style={styles.filterResultsIndicator}>
              <ThemedText style={styles.filterResultsText}>
                No se encontraron tareas con los filtros aplicados
                {selectedYear && ` • Año: ${selectedYear}`}
                {selectedMonth !== null && ` • Mes: ${getMonthName(selectedMonth)}`}
              </ThemedText>
            </ThemedView>
          )}
          
          <ThemedView style={styles.filtersRow}>
            {/* Filtro de Año */}
            <ThemedView style={styles.filterGroup}>
              <ThemedText style={styles.filterLabel}>Año:</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedYear && styles.filterChipActive]}
                  onPress={() => setSelectedYear(null)}
                >
                  <ThemedText style={[styles.filterChipText, !selectedYear && styles.filterChipTextActive]}>
                    Todos
                  </ThemedText>
                </TouchableOpacity>
                {availableYears.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.filterChip, selectedYear === year && styles.filterChipActive]}
                    onPress={() => {
                      setSelectedYear(year);
                      setSelectedMonth(null);
                    }}
                  >
                    <ThemedText style={[styles.filterChipText, selectedYear === year && styles.filterChipTextActive]}>
                      {year}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ThemedView>

            {/* Filtro de Mes */}
            {selectedYear && (
              <ThemedView style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>Mes:</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <TouchableOpacity
                    style={[styles.filterChip, selectedMonth === null && styles.filterChipActive]}
                    onPress={() => setSelectedMonth(null)}
                  >
                    <ThemedText style={[styles.filterChipText, selectedMonth === null && styles.filterChipTextActive]}>
                      Todos
                    </ThemedText>
                  </TouchableOpacity>
                  {availableMonths.map((monthIndex) => (
                    <TouchableOpacity
                      key={monthIndex}
                      style={[styles.filterChip, selectedMonth === monthIndex && styles.filterChipActive]}
                      onPress={() => setSelectedMonth(monthIndex)}
                    >
                      <ThemedText style={[styles.filterChipText, selectedMonth === monthIndex && styles.filterChipTextActive]}>
                        {getMonthName(monthIndex)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </ThemedView>
            )}

            {/* Botón para limpiar filtros */}
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={resetFilters}>
                <ThemedText style={styles.clearFiltersText}>�️ Limpiar Filtros</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </ThemedView>
        
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyIcon}>
            {hasActiveFilters ? "🔍" : "�📅"}
          </ThemedText>
          <ThemedText style={styles.emptyTitle}>
            {hasActiveFilters ? "Sin resultados" : "No hay tareas pasadas"}
          </ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            {hasActiveFilters 
              ? "Intenta ajustar los filtros o crear tareas de prueba desde Configuración"
              : "Aquí aparecerán las tareas de días anteriores"
            }
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Panel de Filtros */}
      <ThemedView style={styles.filtersContainer}>
        <ThemedText style={styles.filtersTitle}>🔍 Filtros</ThemedText>
        
        {/* Indicador de resultados */}
        {(selectedYear || selectedMonth !== null) && (
          <ThemedView style={styles.filterResultsIndicator}>
            <ThemedText style={styles.filterResultsText}>
              Mostrando {stats.totalTasks} de {totalTasksAllTime} tareas
              {selectedYear && ` • Año: ${selectedYear}`}
              {selectedMonth !== null && ` • Mes: ${getMonthName(selectedMonth)}`}
            </ThemedText>
          </ThemedView>
        )}
        
        <ThemedView style={styles.filtersRow}>
          {/* Filtro de Año */}
          <ThemedView style={styles.filterGroup}>
            <ThemedText style={styles.filterLabel}>Año:</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedYear && styles.filterChipActive]}
                onPress={() => setSelectedYear(null)}
              >
                <ThemedText style={[styles.filterChipText, !selectedYear && styles.filterChipTextActive]}>
                  Todos
                </ThemedText>
              </TouchableOpacity>
              {availableYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.filterChip, selectedYear === year && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedYear(year);
                    setSelectedMonth(null); // Reset month when changing year
                  }}
                >
                  <ThemedText style={[styles.filterChipText, selectedYear === year && styles.filterChipTextActive]}>
                    {year}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>

          {/* Filtro de Mes (solo si hay año seleccionado) */}
          {selectedYear && (
            <ThemedView style={styles.filterGroup}>
              <ThemedText style={styles.filterLabel}>Mes:</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedMonth === null && styles.filterChipActive]}
                  onPress={() => setSelectedMonth(null)}
                >
                  <ThemedText style={[styles.filterChipText, selectedMonth === null && styles.filterChipTextActive]}>
                    Todos
                  </ThemedText>
                </TouchableOpacity>
                {availableMonths.map((monthIndex) => (
                  <TouchableOpacity
                    key={monthIndex}
                    style={[styles.filterChip, selectedMonth === monthIndex && styles.filterChipActive]}
                    onPress={() => setSelectedMonth(monthIndex)}
                  >
                    <ThemedText style={[styles.filterChipText, selectedMonth === monthIndex && styles.filterChipTextActive]}>
                      {getMonthName(monthIndex)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ThemedView>
          )}

          {/* Botón para limpiar filtros */}
          {(selectedYear || selectedMonth !== null) && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={resetFilters}>
              <ThemedText style={styles.clearFiltersText}>🗑️ Limpiar Filtros</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ThemedView>

      {/* Panel de Estadísticas */}
      {pastTasks.length > 0 && (
        <ThemedView style={styles.statsContainer}>
          <ThemedText style={styles.statsTitle}>📊 Resumen</ThemedText>
          <ThemedView style={styles.statsRow}>
            <ThemedView style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{stats.totalTasks}</ThemedText>
              <ThemedText style={styles.statLabel}>Total</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statItem}>
              <ThemedText style={[styles.statNumber, styles.completedStat]}>{stats.completedTasks}</ThemedText>
              <ThemedText style={styles.statLabel}>Completadas</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statItem}>
              <ThemedText style={[styles.statNumber, styles.pendingStat]}>{stats.pendingTasks}</ThemedText>
              <ThemedText style={styles.statLabel}>Pendientes</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statItem}>
              <ThemedText style={[styles.statNumber, styles.rateStat]}>{stats.completionRate}%</ThemedText>
              <ThemedText style={styles.statLabel}>Completado</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      )}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {pastTasks.map(({ date, tasks }) => (
          <ThemedView key={date} style={styles.dateSection}>
            <ThemedText style={styles.dateHeader}>
              {formatDate(date)}
            </ThemedText>
            
            <ThemedView style={styles.tasksContainer}>
              {tasks.map(({ lineNumber, task }) => (
                <TouchableOpacity
                  key={`${date}-${lineNumber}`}
                  style={[
                    styles.taskItem,
                    task.completed && styles.taskItemCompleted
                  ]}
                  onPress={() => handleTaskToggle(date, lineNumber)}
                >
                  <ThemedText style={styles.taskCheckbox}>
                    {task.completed ? "✅" : "⬜"}
                  </ThemedText>
                  <ThemedText 
                    style={[
                      styles.taskText,
                      task.completed && styles.taskTextCompleted
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
  // Estilos para filtros
  filtersContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  filterResultsIndicator: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  filterResultsText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  filtersRow: {
    gap: 12,
  },
  filterGroup: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterScroll: {
    maxHeight: 40,
  },
  filterChip: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  clearFiltersButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
  // Estilos existentes
  statsContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
  },
  completedStat: {
    color: '#22C55E',
  },
  pendingStat: {
    color: '#F59E0B',
  },
  rateStat: {
    color: '#8B5CF6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.3)',
    textTransform: 'capitalize',
  },
  tasksContainer: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  taskItemCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderLeftColor: '#22C55E',
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
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  reminderIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
});
