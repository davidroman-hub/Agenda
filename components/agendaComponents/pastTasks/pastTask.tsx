import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import useAgendaTasksStore, { AgendaTask } from "@/stores/agenda-tasks-store";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useMemo } from "react";

export default function PastTasks() {
  const { tasksByDate, toggleTaskCompletion } = useAgendaTasksStore();

  // Obtener tareas pasadas
  const pastTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear a medianoche para comparar solo fechas
    
    const pastTasksData: {
      date: string;
      tasks: { lineNumber: number; task: AgendaTask }[];
    }[] = [];

    // Iterar sobre todas las fechas
    for (const [date, dayTasks] of Object.entries(tasksByDate)) {
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
      
      // Solo incluir fechas anteriores a hoy
      if (taskDate < today) {
        const tasksForDate: { lineNumber: number; task: AgendaTask }[] = [];
        
        // Obtener todas las tareas para esta fecha
        for (const [lineNumber, task] of Object.entries(dayTasks)) {
          if (task) {
            tasksForDate.push({
              lineNumber: Number.parseInt(lineNumber, 10),
              task,
            });
          }
        }
        
        // Solo agregar si hay tareas
        if (tasksForDate.length > 0) {
          // Ordenar por número de línea
          tasksForDate.sort((a, b) => a.lineNumber - b.lineNumber);
          pastTasksData.push({
            date,
            tasks: tasksForDate,
          });
        }
      }
    }

    // Ordenar por fecha (más reciente primero)
    pastTasksData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return pastTasksData;
  }, [tasksByDate]);

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
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyIcon}>📅</ThemedText>
          <ThemedText style={styles.emptyTitle}>No hay tareas pasadas</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Aquí aparecerán las tareas de días anteriores
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
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
