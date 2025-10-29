import { useThemeColor } from "@/hooks/use-theme-color";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import React, { useMemo, useState } from "react";
import { Modal, StyleSheet, TouchableOpacity } from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/FontAwesome";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";

interface CalendarModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onDateSelect: (date: Date) => void;
  readonly currentDate: Date;
}

export default function CalendarModal({
  visible,
  onClose,
  onDateSelect,
  currentDate,
}: CalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    currentDate.toISOString().split("T")[0]
  );

  // Obtener tareas para marcar días en el calendario
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const getAllTasks = useAgendaTasksStore((state) => state.getAllTasks);

  // Obtener funciones del store de patrones de repetición
  const getAllRepeatingPatterns = useRepeatingTasksStore(
    (state) => state.getAllRepeatingPatterns
  );
  const shouldTaskRepeatOnDate = useRepeatingTasksStore(
    (state) => state.shouldTaskRepeatOnDate
  );
  const isRepeatingTaskCompleted = useRepeatingTasksStore(
    (state) => state.isRepeatingTaskCompleted
  );

  // Colores del tema
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  // Función para obtener todas las tareas (normales + repetidas) para una fecha específica
  const getTasksForDate = React.useCallback(
    (dateString: string) => {
      const allExistingTasks = getAllTasks();
      const allPatterns = getAllRepeatingPatterns();

      // Comenzar con las tareas normales del día
      const normalTasks = tasksByDate[dateString] || {};
      const combined = { ...normalTasks };

      // Crear un Set de IDs de tareas que tienen patrones de repetición activos
      const tasksWithActivePatterns = new Set(
        allPatterns
          .filter((pattern) => pattern.isActive)
          .map((pattern) => pattern.originalTaskId)
      );

      // Filtrar tareas normales que tienen patrones de repetición activos
      for (const [line, task] of Object.entries(combined)) {
        if (task && tasksWithActivePatterns.has(task.id)) {
          delete combined[Number.parseInt(line, 10)];
        }
      }

      // Agregar tareas repetidas para esta fecha
      const repeatedTasks: any[] = [];
      for (const pattern of allPatterns) {
        if (!pattern.isActive) continue;

        if (shouldTaskRepeatOnDate(pattern.originalTaskId, dateString)) {
          const originalTask = Object.values(allExistingTasks)
            .flatMap((dayTasks) => Object.values(dayTasks))
            .find(
              (task): task is any =>
                task !== null && task.id === pattern.originalTaskId
            );

          if (originalTask) {
            repeatedTasks.push({
              ...originalTask,
              id: `${originalTask.id}-repeat-${dateString}`,
              completed: isRepeatingTaskCompleted(originalTask.id, dateString),
              isRepeatingTask: true,
              repeatingTaskId: originalTask.id,
              repeatingPatternId: pattern.id,
            });
          }
        }
      }

      // Retornar todas las tareas (normales + repetidas)
      return [...Object.values(combined), ...repeatedTasks].filter(
        (task) => task !== null
      );
    },
    [
      tasksByDate,
      getAllTasks,
      getAllRepeatingPatterns,
      shouldTaskRepeatOnDate,
      isRepeatingTaskCompleted,
    ]
  );

  // Marcar días que tienen tareas
  const markedDates = useMemo(() => {
    const marked: any = {};

    // Obtener todas las fechas únicas que podrían tener tareas
    const allDates = new Set(Object.keys(tasksByDate));

    // Agregar fechas de tareas repetidas (últimos 30 días + próximos 30 días)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = -30; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      allDates.add(date.toISOString().split("T")[0]);
    }

    for (const date of allDates) {
      const tasksForDate = getTasksForDate(date);

      if (tasksForDate.length > 0) {
        marked[date] = {
          marked: true,
          dotColor: tintColor,
        };
      }
    }

    // Marcar día seleccionado
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: tintColor,
    };

    return marked;
  }, [getTasksForDate, tasksByDate, selectedDate, tintColor]);

  console.log("currentDate:", currentDate);

  // Obtener tareas del día seleccionado
  const selectedDayTasks = useMemo(() => {
    return getTasksForDate(selectedDate);
  }, [getTasksForDate, selectedDate]);

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const handleGoToDate = () => {
    const date = new Date(selectedDate);
    onDateSelect(date);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <ThemedView style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>Calendario</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="times" size={20} color={textColor} />
          </TouchableOpacity>
        </ThemedView>

        {/* Calendario */}
        <Calendar
          onDayPress={handleDayPress}
          markedDates={markedDates}
          
          current="2025-10-30"
          ///current={currentDate}
          theme={{
            backgroundColor: backgroundColor,
            calendarBackground: backgroundColor,
            textSectionTitleColor: textColor,
            dayTextColor: textColor,
            todayTextColor: tintColor,
            selectedDayBackgroundColor: tintColor,
            selectedDayTextColor: "#ffffff",
            monthTextColor: textColor,
            indicatorColor: tintColor,
            arrowColor: tintColor,
          }}
        />

        {/* Preview de tareas */}
        <ThemedView style={styles.taskPreview}>
          <ThemedText style={styles.previewTitle}>
            {new Date(selectedDate).toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </ThemedText>

          {selectedDayTasks.length > 0 ? (
            <>
              <ThemedText style={styles.taskCount}>
                {selectedDayTasks.length} tarea
                {selectedDayTasks.length === 1 ? "" : "s"}
              </ThemedText>
              {selectedDayTasks.map((task, index) => (
                <ThemedText
                  key={task.id || `task-${index}`}
                  style={styles.taskItem}
                >
                  •{" "}
                  {task.text.length > 30
                    ? `${task.text.slice(0, 30)}...`
                    : `${task.text}`}{" "}
                  {`${task.isRepeatingTask ? "🔄 " : ""} ${
                    task.reminder ? `⏰ ` : ""
                  }`}{" "}
                  {task.completed ? "✅" : ""}
                </ThemedText>
              ))}
            </>
          ) : (
            <ThemedText style={styles.noTasks}>
              No hay tareas este día
            </ThemedText>
          )}
        </ThemedView>

        {/* Botones */}
        <ThemedView style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#007bff" }]}
            onPress={handleGoToDate}
          >
            <ThemedText style={styles.buttonText}>Ir a esta fecha</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  taskPreview: {
    padding: 20,
    minHeight: 150,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "capitalize",
  },
  taskCount: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 10,
  },
  taskItem: {
    fontSize: 14,
    marginBottom: 5,
    paddingLeft: 10,
  },
  moreText: {
    fontSize: 14,
    fontStyle: "italic",
    opacity: 0.7,
  },
  noTasks: {
    fontSize: 14,
    fontStyle: "italic",
    opacity: 0.5,
    textAlign: "center",
    marginTop: 20,
  },
  buttons: {
    padding: 20,
    paddingBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
