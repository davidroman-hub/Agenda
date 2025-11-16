import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useCalendarSettingsStore from "@/stores/Calendar-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import { formatDateWithI18n } from "@/utils/locale-config";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import Icon from "react-native-vector-icons/FontAwesome";
import TaskEditModal from "../agendaComponents/bookFragments/TaskEditModal";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";
import {
  enCalendarLocales,
  esCalendarLocales,
  frCalendarLocales,
  itCalendarLocales,
} from "./calendarLocales";
import DayDetailModal from "./DayDetailModal";
import QuickAddTaskButton from "./QuickAddTaskButton";

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

  const [localRepeatingCompletions, setLocalRepeatingCompletions] = useState<
    Record<string, boolean>
  >({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Estados para el modal de edición de tareas
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTaskLine, setSelectedTaskLine] = useState<number | null>(null);

  // Hooks de internacionalización
  const { tAgenda, currentLanguage, tCommon } = useI18n();

  React.useEffect(() => {
    try {
      // Configurar locales con verificación de estructura
      LocaleConfig.locales["es"] = esCalendarLocales;
      LocaleConfig.locales["en"] = enCalendarLocales;
      LocaleConfig.locales["fr"] = frCalendarLocales;
      LocaleConfig.locales["it"] = itCalendarLocales;

      // Configurar el idioma por defecto con fallback
      const targetLanguage = currentLanguage || "en";
      if (LocaleConfig.locales[targetLanguage]) {
        LocaleConfig.defaultLocale = targetLanguage;
      } else {
        LocaleConfig.defaultLocale = "en"; // Fallback seguro
      }
    } catch (error) {
      console.warn("Error configurando localización del calendario:", error);
      // Fallback a inglés en caso de error
      LocaleConfig.defaultLocale = "en";
    }
  }, [currentLanguage]);

  // Colores del tema
  const { dateSelected, selectDate } = useCalendarSettingsStore();
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const getAllTasks = useAgendaTasksStore((state) => state.getAllTasks);
  const updateLinesStatus = useAgendaTasksStore(
    (state) => state.updateLinesStatus
  );

  const getAvailableLinesForDate = useAgendaTasksStore(
    (state) => state.getAvailableLinesForDate
  );
  const updateTask = useAgendaTasksStore((state) => state.updateTask);
  const deleteTask = useAgendaTasksStore((state) => state.deleteTask);
  const toggleTaskCompletion = useAgendaTasksStore(
    (state) => state.toggleTaskCompletion
  );
  const getAllRepeatingPatterns = useRepeatingTasksStore(
    (state) => state.getAllRepeatingPatterns
  );
  const shouldTaskRepeatOnDate = useRepeatingTasksStore(
    (state) => state.shouldTaskRepeatOnDate
  );
  const isRepeatingTaskCompleted = useRepeatingTasksStore(
    (state) => state.isRepeatingTaskCompleted
  );
  const addRepeatingPattern = useRepeatingTasksStore(
    (state) => state.addRepeatingPattern
  );
  const removeRepeatingPattern = useRepeatingTasksStore(
    (state) => state.removeRepeatingPattern
  );
  const toggleRepeatingTaskCompletion = useRepeatingTasksStore(
    (state) => state.toggleRepeatingTaskCompletion
  );

  const getTasksForDate = React.useCallback(
    (dateString: string) => {
      const allExistingTasks = getAllTasks();
      const allPatterns = getAllRepeatingPatterns();

      // Comenzar con las tareas normales del día
      const normalTasks = tasksByDate[dateString] || {};
      const combined = { ...normalTasks };

      // Crear un mapa de tareas originales y sus fechas de creación
      const originalTasksMap = new Map();
      for (const [dateKeyMap, dayTasksMap] of Object.entries(
        allExistingTasks
      )) {
        for (const [line, task] of Object.entries(dayTasksMap)) {
          if (task) {
            originalTasksMap.set(task.id, {
              task,
              originalDate: dateKeyMap,
              line: Number.parseInt(line, 10),
            });
          }
        }
      }

      // Crear un Set de IDs de tareas que tienen patrones de repetición activos
      const tasksWithActivePatterns = new Set(
        allPatterns
          .filter((pattern) => pattern.isActive)
          .map((pattern) => pattern.originalTaskId)
      );

      // Solo filtrar tareas que tienen patrones de repetición activos Y NO estamos en su día de creación
      for (const [line, task] of Object.entries(combined)) {
        if (task && tasksWithActivePatterns.has(task.id)) {
          const originalInfo = originalTasksMap.get(task.id);
          // Solo filtrar si NO estamos en el día de creación original
          if (originalInfo && originalInfo.originalDate !== dateString) {
            delete combined[Number.parseInt(line, 10)];
          }
        }
      }

      // Agregar tareas repetidas para esta fecha (solo si NO es el día original)
      const repeatedTasks: any[] = [];
      for (const pattern of allPatterns) {
        if (!pattern.isActive) continue;

        if (shouldTaskRepeatOnDate(pattern.originalTaskId, dateString)) {
          const originalInfo = originalTasksMap.get(pattern.originalTaskId);

          // Solo agregar como tarea repetida si NO estamos en el día de creación original
          if (originalInfo && originalInfo.originalDate !== dateString) {
            repeatedTasks.push({
              ...originalInfo.task,
              id: `${originalInfo.task.id}-repeat-${dateString}`,
              completed:
                localRepeatingCompletions[
                  `${originalInfo.task.id}-${dateString}`
                ] ?? isRepeatingTaskCompleted(originalInfo.task.id, dateString),
              isRepeatingTask: true,
              repeatingTaskId: originalInfo.task.id,
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
      localRepeatingCompletions,
      refreshKey,
    ]
  );

  const backgroundColor = useThemeColor(
    {
      light: "#FFFFFF",
    },
    "background"
  );
  const textColor = useThemeColor(
    {
      light: "#000000",
      dark: "#FFFFFF",
    },
    "text"
  );
  const tintColor = useThemeColor(
    {
      light: "#007AFF",
      dark: "#007AFF",
    },
    "tint"
  );

  // Detectar si es pantalla grande (teléfono plegable o tablet)
  const { width } = Dimensions.get("window");
  const isLargeScreen = width > 600; // Pantallas más anchas que 600px se consideran grandes
  const scrollHeight = isLargeScreen ? 180 : 230;

  // Obtener fecha actual como fallback (en zona horaria local)
  const getCurrentDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selected, setSelected] = useState(dateSelected as any);

  // Efecto para sincronizar el estado local con el store
  React.useEffect(() => {
    setSelected(dateSelected || getCurrentDateString());
  }, [dateSelected]);

  // Efecto para sincronizar estado local cuando se cierra el DayDetailModal
  React.useEffect(() => {
    if (!showDayDetail) {
      // Limpiar estado local para forzar recarga desde el store
      setLocalRepeatingCompletions({});
    }
  }, [showDayDetail]);

  // Efecto para forzar actualización cuando cambian las tareas de la fecha seleccionada
  React.useEffect(() => {
    // Forzar re-render cuando cambien las tareas del día seleccionado
    setRefreshKey((prev) => prev + 1);
  }, [tasksByDate, selected]);

  const handleDayPress = (day: any) => {
    setSelected(day.dateString);
    selectDate(day.dateString);
  };

  // Función para manejar la selección de una tarea
  const handleTaskSelect = (task: any, taskIndex: number) => {
    setSelectedTask(task);
    // Para tareas repetidas virtuales, usar un line number ficticio
    setSelectedTaskLine(task.isRepeatingTask ? 999 + taskIndex : taskIndex + 1);
    setShowTaskEditModal(true);
  };

  // Función para manejar la edición/guardado de tareas
  const handleSaveTask = async (
    text: string,
    reminder?: string | null,
    repeat?: any
  ) => {
    if (!selectedTask) return;

    try {
      if (selectedTask.isRepeatingTask) {
        // Manejar tareas repetidas
        const allExistingTasks = getAllTasks();
        let foundOriginal = false;

        // Buscar la tarea original en todas las fechas
        for (const [dateKey, tasks] of Object.entries(allExistingTasks)) {
          for (const [line, task] of Object.entries(tasks)) {
            if (task && task.id === selectedTask.repeatingTaskId) {
              // Actualizar la tarea original
              await updateTask(dateKey, Number.parseInt(line, 10), {
                text,
                reminder,
                repeat,
              });

              // Si cambia el patrón de repetición
              if (repeat && repeat !== "none") {
                // Actualizar el patrón de repetición
                addRepeatingPattern({
                  originalTaskId: task.id,
                  repeatOption: repeat,
                  startDate: dateKey,
                });
              } else {
                // Eliminar patrón si se cambia a "none"
                removeRepeatingPattern(selectedTask.repeatingTaskId);
              }

              foundOriginal = true;
              break;
            }
          }
          if (foundOriginal) break;
        }
      } else {
        // Manejar tareas normales - buscar la línea correcta por ID
        const allExistingTasks = getAllTasks();
        const dayTasks = allExistingTasks[selected] || {};

        let actualLineNumber: number | null = null;
        for (const [line, task] of Object.entries(dayTasks)) {
          if (task && task.id === selectedTask.id) {
            actualLineNumber = Number.parseInt(line, 10);
            break;
          }
        }

        if (actualLineNumber !== null) {
          await updateTask(selected, actualLineNumber, {
            text,
            reminder,
            repeat: repeat || "none",
          });

          // Si se agregó repetición a una tarea normal
          if (repeat && repeat !== "none") {
            addRepeatingPattern({
              originalTaskId: selectedTask.id,
              repeatOption: repeat,
              startDate: selected,
            });
          }
        } else {
          return;
        }
      }

      // Refrescar datos
      setRefreshKey((prev) => prev + 1);
      setShowTaskEditModal(false);
      setSelectedTask(null);
      setSelectedTaskLine(null);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Función para eliminar tarea
  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      if (selectedTask.isRepeatingTask) {
        // Eliminar patrón de repetición completo
        removeRepeatingPattern(selectedTask.repeatingTaskId);

        // También eliminar la tarea original si existe
        const allExistingTasks = getAllTasks();
        for (const [dateKey, tasks] of Object.entries(allExistingTasks)) {
          for (const [line, task] of Object.entries(tasks)) {
            if (task && task.id === selectedTask.repeatingTaskId) {
              await deleteTask(dateKey, Number.parseInt(line, 10));
              break;
            }
          }
        }
      } else {
        // Para tareas normales, necesitamos encontrar la línea correcta en el día actual
        const allExistingTasks = getAllTasks();
        const dayTasks = allExistingTasks[selected] || {};

        // Buscar la línea correcta por ID de tarea
        let actualLineNumber: number | null = null;
        for (const [line, task] of Object.entries(dayTasks)) {
          if (task && task.id === selectedTask.id) {
            actualLineNumber = Number.parseInt(line, 10);
            break;
          }
        }

        if (actualLineNumber !== null) {
          await deleteTask(selected, actualLineNumber);
        } else {
          return;
        }
      }

      // Refrescar datos
      setRefreshKey((prev) => prev + 1);
      setShowTaskEditModal(false);
      setSelectedTask(null);
      setSelectedTaskLine(null);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Función para toggle completion desde el modal
  const handleToggleCompletion = (dateKey: string, lineNumber: number) => {
    if (selectedTask?.isRepeatingTask) {
      toggleRepeatingTaskCompletion(selectedTask.repeatingTaskId, dateKey);

      // Actualizar el estado local para reflejar el cambio inmediatamente
      setLocalRepeatingCompletions((prev) => ({
        ...prev,
        [`${selectedTask.repeatingTaskId}-${dateKey}`]: !selectedTask.completed,
      }));

      // Refrescar la vista
      setRefreshKey((prev) => prev + 1);
    } else {
      // Para tareas normales, buscar la línea real de la tarea
      const dayTasks = tasksByDate[dateKey] || {};

      let realLineNumber: number | null = null;
      for (const [line, existingTask] of Object.entries(dayTasks)) {
        if (existingTask && existingTask.id === selectedTask?.id) {
          realLineNumber = Number.parseInt(line, 10);
          break;
        }
      }

      if (realLineNumber !== null) {
        toggleTaskCompletion(dateKey, realLineNumber);
      } else {
        // Fallback: usar el lineNumber que viene del modal (aunque puede ser ficticio)
        toggleTaskCompletion(dateKey, lineNumber);
      }
    }

    setRefreshKey((prev) => prev + 1);
  };

  // Función para toggle completion desde la vista de calendario
  const handleTaskToggleFromList = (task: any) => {
    if (task.isRepeatingTask) {
      toggleRepeatingTaskCompletion(task.repeatingTaskId, selected);
      setLocalRepeatingCompletions((prev) => ({
        ...prev,
        [`${task.repeatingTaskId}-${selected}`]: !task.completed,
      }));
    } else {
      // Para tareas normales, usar directamente tasksByDate que tiene la estructura correcta
      const dayTasks = tasksByDate[selected] || {};

      let found = false;
      // Buscar la línea donde está la tarea
      for (const [lineNumber, existingTask] of Object.entries(dayTasks)) {
        if (existingTask && existingTask.id === task.id) {
          toggleTaskCompletion(selected, Number.parseInt(lineNumber, 10));
          found = true;
          break;
        }
      }

      if (!found) {
        // Intentar buscar en getAllTasks como respaldo
        const allTasks = getAllTasks();
        const allDayTasks = allTasks[selected] || {};

        for (const [lineNumber, existingTask] of Object.entries(allDayTasks)) {
          if (existingTask && existingTask.id === task.id) {
            toggleTaskCompletion(selected, Number.parseInt(lineNumber, 10));
            found = true;
            break;
          }
        }
      }
    }
    setRefreshKey((prev) => prev + 1);
  };

  // Función para obtener el texto "sin tareas" según el idioma
  const getNoTasksText = () => {
    switch (currentLanguage) {
      case "en":
        return "No tasks this day";
      case "fr":
        return "Aucune tâche ce jour";
      case "it":
        return "Nessuna attività in questo giorno";
      default:
        return "No hay tareas este día";
    }
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
            color: "#007AFF",
            selectedDotColor: "white",
          });
        }
        if (repeatingTasks > 0) {
          dots.push({
            key: "repeating",
            color: "#rgb(255, 215, 0)",
            selectedDotColor: "white",
          });
        }
        if (completedTasks > 0) {
          dots.push({
            key: "completed",
            color: "#22C55E",
            selectedDotColor: "white",
          });
        }

        marked[date] = {
          dots: dots,
        };
      }
    }

    // Marcar día seleccionado
    if (marked[selected]) {
      marked[selected] = {
        ...marked[selected],
        selected: true,
        selectedColor: tintColor,
      };
    } else {
      marked[selected] = {
        selected: true,
        selectedColor: tintColor,
      };
    }

    return marked;
  }, [getTasksForDate, tasksByDate, selected, tintColor]);
  const selectedDayTasks = getTasksForDate(selected);
  return (
    <Modal visible={visible} animationType="slide">
      <ThemedView style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>
            {tAgenda("calendar.title")}
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="times" size={20} color={textColor} />
          </TouchableOpacity>
        </ThemedView>

        {/* Calendario */}
        <ThemedView style={styles.calendarContainer}>
          {LocaleConfig.defaultLocale && (
            <Calendar
              onDayPress={handleDayPress}
              current={selected}
              markingType={"multi-dot"}
              markedDates={markedDates}
              // Configuración de localización basada en el idioma del usuario
              firstDay={currentLanguage === "en" ? 0 : 1} // Domingo para inglés, Lunes para otros
              // Deshabilitar fechas anteriores al día actual
              // minDate={getCurrentDateString()}
              theme={{
                backgroundColor: backgroundColor,
                calendarBackground: backgroundColor,
                textSectionTitleColor: textColor,
                dayTextColor: textColor,
                todayTextColor: tintColor,
                selectedDayBackgroundColor: tintColor,
                selectedDayTextColor: "#fff",
                monthTextColor: textColor,
                indicatorColor: tintColor,
                arrowColor: tintColor,
              }}
            />
          )}
        </ThemedView>

        {/* Preview de tareas */}
        <ThemedView style={styles.taskPreview}>
          <ThemedText style={styles.previewTitle}>
            {formatDateWithI18n(new Date(selected))}
          </ThemedText>

          {/* Botón QuickAdd debajo de la fecha */}
          <ThemedView
            style={[
              styles.quickAddContainer,
              { display: getCurrentDateString() <= selected ? "flex" : "none" },
            ]}
          >
            <QuickAddTaskButton
              selectedDate={selected}
              availableLines={getAvailableLinesForDate(selected)}
              onTaskAdded={() => {
                // Forzar actualización del estado local para reflejar la nueva tarea
                setLocalRepeatingCompletions({});

                // Usar un pequeño delay para asegurar que la tarea se haya guardado
                setTimeout(() => {
                  // Actualizar el estado de líneas para la fecha seleccionada
                  updateLinesStatus(selected);
                  // Forzar re-render del callback
                  setRefreshKey((prev) => prev + 1);
                }, 100);
              }}
            />
            <ThemedText style={styles.taskCount}>
              {selectedDayTasks.length}{" "}
              {selectedDayTasks.length === 1
                ? tAgenda("tasks.taskCount")
                : tAgenda("tasks.taskCount_plural")}
            </ThemedText>
          </ThemedView>

          {(() => {
            const selectedDayTasks = getTasksForDate(selected);
            return selectedDayTasks.length > 0 ? (
              <ScrollView
                showsVerticalScrollIndicator={true}
                style={{ height: scrollHeight }}
              >
                <ThemedView style={styles.tasksContainer}>
                  {selectedDayTasks.map((task, index) => (
                    <TouchableOpacity
                      key={task.id || `task-${index}`}
                      style={[
                        styles.taskCard,
                        task.completed && styles.taskCardCompleted,
                        task.isRepeatingTask &&
                          !task.completed &&
                          styles.taskCardRepeating,
                      ]}
                      onPress={() => handleTaskSelect(task, index)}
                    >
                      <TouchableOpacity
                        style={styles.taskCheckbox}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleTaskToggleFromList(task);
                        }}
                      >
                        <ThemedText style={styles.checkboxText}>
                          {task.completed ? "✅" : "⭕"}
                        </ThemedText>
                      </TouchableOpacity>

                      <ThemedView
                        style={[
                          styles.taskContent,
                          { backgroundColor: "transparent" },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.taskText,
                            task.completed && styles.taskTextCompleted,
                            { backgroundColor: "transparent" },
                          ]}
                          numberOfLines={2}
                        >
                          {task.text}
                        </ThemedText>

                        <ThemedView
                          style={[
                            styles.taskIcons,
                            { backgroundColor: "transparent" },
                          ]}
                        >
                          {task.isRepeatingTask && (
                            <ThemedText style={styles.taskIcon}>🔄</ThemedText>
                          )}
                          {task.reminder && (
                            <ThemedText style={styles.taskIcon}>⏰</ThemedText>
                          )}
                        </ThemedView>
                      </ThemedView>
                    </TouchableOpacity>
                  ))}
                </ThemedView>
              </ScrollView>
            ) : (
              <ThemedText style={styles.noTasks}>{getNoTasksText()}</ThemedText>
            );
          })()}
        </ThemedView>

        {/* Botones */}
      </ThemedView>

      {/* Modal de detalle del día */}
      <DayDetailModal
        tCommon={tCommon}
        tAgenda={tAgenda}
        visible={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        selectedDate={selected}
      />

      {/* Modal de edición de tareas */}
      {selectedTask && (
        <TaskEditModal
          tCommon={tCommon}
          visible={showTaskEditModal}
          initialText={selectedTask.text}
          initialReminder={selectedTask.reminder}
          initialRepeat={selectedTask.repeat || "none"}
          onSave={handleSaveTask}
          toggleTaskCompletion={handleToggleCompletion}
          date={selected}
          completed={selectedTask.completed}
          lineNumber={selectedTaskLine!}
          onCancel={() => {
            setShowTaskEditModal(false);
            setSelectedTask(null);
            setSelectedTaskLine(null);
          }}
          onDelete={selectedTask.text ? handleDeleteTask : undefined}
        />
      )}
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
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 10,
    position: "sticky",
    top: 0,
  },
  tasksContainer: {
    gap: 8,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.2)",
  },
  taskCardCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderLeftColor: "#22C55E",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  taskCardRepeating: {
    backgroundColor: "transparent",
    borderLeftColor: "#rgb(255, 215, 0)",
    borderColor: "#rgb(255, 215, 0, 0.1)",
  },
  taskCheckbox: {
    fontSize: 16,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  taskIcons: {
    flexDirection: "row",
    gap: 4,
  },
  taskIcon: {
    fontSize: 12,
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
  mainButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  quickAddContainer: {
    marginTop: 10,
    marginBottom: 0,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  checkboxText: {
    fontSize: 16,
  },
});
