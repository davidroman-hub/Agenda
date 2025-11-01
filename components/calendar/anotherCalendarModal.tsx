import { useThemeColor } from "@/hooks/use-theme-color";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useCalendarSettingsStore from "@/stores/Calendar-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import React, { useMemo, useState, useEffect } from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, AppState } from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/FontAwesome";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";
import DayDetailModal from "./DayDetailModal";

interface CalendarModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onNavigateToDate?: (date: string) => void;
}

export default function AnotherCalendarModal({
  visible,
  onClose,
  onNavigateToDate,
}: //   onDateSelect,
//   currentDate,
CalendarModalProps) {
  // Estados para el modal de día
  const [showDayDetail, setShowDayDetail] = useState(false);
  
  // Función para resetear todos los estados del calendario
  const resetCalendarStates = () => {
    setShowDayDetail(false);
  };

  // Resetear estados cuando el modal principal se cierre
  useEffect(() => {
    if (!visible) {
      resetCalendarStates();
    }
  }, [visible]);

  // Detectar cuando la app vuelve del background y resetear estados
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Cuando la app vuelve a estar activa, resetear estados y cerrar modales
        resetCalendarStates();
        onClose();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [onClose]);
  
  // Colores del tema
  const { dateSelected, selectDate } = useCalendarSettingsStore();
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const getAllTasks = useAgendaTasksStore((state) => state.getAllTasks);
  const getAllRepeatingPatterns = useRepeatingTasksStore(
    (state) => state.getAllRepeatingPatterns
  );
  const shouldTaskRepeatOnDate = useRepeatingTasksStore(
    (state) => state.shouldTaskRepeatOnDate
  );
  const isRepeatingTaskCompleted = useRepeatingTasksStore(
    (state) => state.isRepeatingTaskCompleted
  );

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



  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  const [selected, setSelected] = useState(dateSelected);

  // Efecto para sincronizar el estado local con el store
  React.useEffect(() => {
    setSelected(dateSelected);
  }, [dateSelected]);

  const handleDayPress = (day: any) => {
    console.log("📅 Día seleccionado:", day.dateString);
    setSelected(day.dateString);
    selectDate(day.dateString);
  };

  const handleGoToDate = () => {
    console.log("🚀 Abriendo detalle del día:", selected);
    // Abrir el modal de detalle del día
    setShowDayDetail(true);
  };

  const handleCloseDayDetail = () => {
    setShowDayDetail(false);
  };

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
        const dots = [];
        let normalTasks = 0;
        let repeatingTasks = 0;
        let completedTasks = 0;

        // Contar tipos de tareas
        for (const task of tasksForDate) {
          if (task.completed) {
            completedTasks++;
          } else if (task.isRepeatingTask) {
            repeatingTasks++;
          } else {
            normalTasks++;
          }
        }

        // Agregar dots basados en los tipos de tareas
        if (normalTasks > 0) {
          dots.push({
            key: "normal",
            color: tintColor,
            selectedDotColor: "white",
          });
        }
        if (repeatingTasks > 0) {
          dots.push({
            key: "repeating",
            color: "#FF6B6B",
            selectedDotColor: "white",
          });
        }
        if (completedTasks > 0) {
          dots.push({
            key: "completed",
            color: "#4ECDC4",
            selectedDotColor: "white",
          });
        }

        marked[date] = {
          dots: dots,
        };
      }
    }

    // Marcar día seleccionado
    if (marked[dateSelected as string]) {
      marked[dateSelected as string] = {
        ...marked[dateSelected as string],
        selected: true,
        selectedColor: tintColor,
      };
    } else {
      marked[dateSelected as string] = {
        selected: true,
        selectedColor: tintColor,
      };
    }

    return marked;
  }, [getTasksForDate, tasksByDate, dateSelected, tintColor]);

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
        <ThemedView style={styles.calendarContainer}>
          <Calendar
            onDayPress={handleDayPress}
            current={selected as string}
            markingType={"multi-dot"}
            markedDates={markedDates}
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
        </ThemedView>

        {/* Preview de tareas */}

        <ThemedView style={styles.taskPreview}>
          <ThemedText style={styles.previewTitle}>
            {new Date(selected as string).toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </ThemedText>

          {(() => {
            const selectedDayTasks = getTasksForDate(selected as string);
            return selectedDayTasks.length > 0 ? (
              <ScrollView
                showsVerticalScrollIndicator={true}
                style={{ height: 300 }}
              >
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
              </ScrollView>
            ) : (
              <ThemedText style={styles.noTasks}>
                No hay tareas este día
              </ThemedText>
            );
          })()}
        </ThemedView>

        {/* Botones */}
        <ThemedView style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#007bff" }]}
            onPress={handleGoToDate}
          >
            <ThemedText style={styles.buttonText}>
              � Ver tareas de este día
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
      
      {/* Modal de detalle del día */}
      <DayDetailModal
        visible={showDayDetail}
        onClose={handleCloseDayDetail}
        selectedDate={selected as string}
      />
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
  calendarContainer: {
    height: 320,
    overflow: "hidden",
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
