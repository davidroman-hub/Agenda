import { useThemeColor } from "@/hooks/use-theme-color";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import { formatDateWithI18n } from "@/utils/locale-config";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";

interface DayDetailModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly selectedDate: string;
  readonly tCommon: (key: string, options?: any) => string;
  readonly tAgenda: (key: string, options?: any) => string;
}

export default function DayDetailModal({
  visible,
  onClose,
  selectedDate,
  tCommon,
  tAgenda,
}: DayDetailModalProps) {
  const [newTaskText, setNewTaskText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [localRepeatingCompletions, setLocalRepeatingCompletions] = useState<
    Record<string, boolean>
  >({});

  // Colores del tema
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  // Stores
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const addTask = useAgendaTasksStore((state) => state.addTask);
  const updateTask = useAgendaTasksStore((state) => state.updateTask);
  const deleteTask = useAgendaTasksStore((state) => state.deleteTask);
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
  const toggleRepeatingTaskCompletion = useRepeatingTasksStore(
    (state) => state.toggleRepeatingTaskCompletion
  );

  // Estado para forzar re-renders
  // const [forceUpdate, setForceUpdate] = useState(0);

  // Función para calcular las tareas del día
  const calculateDayTasks = React.useCallback(() => {
    const allExistingTasks = getAllTasks();
    const allPatterns = getAllRepeatingPatterns();

    // Comenzar con las tareas normales del día
    const normalTasks = tasksByDate[selectedDate] || {};
    const combined = { ...normalTasks };

    // Crear un mapa de tareas originales y sus fechas de creación
    const originalTasksMap = new Map();
    for (const [dateKey, dayTasks] of Object.entries(allExistingTasks)) {
      for (const [line, task] of Object.entries(dayTasks)) {
        if (task) {
          originalTasksMap.set(task.id, {
            task,
            originalDate: dateKey,
            line: Number.parseInt(line, 10),
          });
        }
      }
    }

    // Solo filtrar tareas originales si NO estamos en su día de creación
    const tasksWithActivePatterns = new Set(
      allPatterns
        .filter((pattern) => pattern.isActive)
        .map((pattern) => pattern.originalTaskId)
    );

    for (const [line, task] of Object.entries(combined)) {
      if (task && tasksWithActivePatterns.has(task.id)) {
        const originalInfo = originalTasksMap.get(task.id);
        // Solo filtrar si NO estamos en el día de creación original
        if (originalInfo && originalInfo.originalDate !== selectedDate) {
          delete combined[Number.parseInt(line, 10)];
        }
      }
    }

    // Agregar tareas repetidas para esta fecha (solo si NO es el día original)
    const repeatedTasks: any[] = [];
    for (const pattern of allPatterns) {
      if (!pattern.isActive) continue;

      if (shouldTaskRepeatOnDate(pattern.originalTaskId, selectedDate)) {
        const originalInfo = originalTasksMap.get(pattern.originalTaskId);

        // Solo agregar como tarea repetida si NO estamos en el día de creación original
        if (originalInfo && originalInfo.originalDate !== selectedDate) {
          repeatedTasks.push({
            ...originalInfo.task,
            id: `${originalInfo.task.id}-repeat-${selectedDate}`,
            completed:
              localRepeatingCompletions[
                `${originalInfo.task.id}-${selectedDate}`
              ] ?? isRepeatingTaskCompleted(originalInfo.task.id, selectedDate),
            isRepeatingTask: true,
            repeatingTaskId: originalInfo.task.id,
            repeatingPatternId: pattern.id,
            line: -1, // Las tareas repetidas no tienen línea específica
          });
        }
      }
    }

    // Convertir tareas normales a array con información de línea
    const normalTasksArray = Object.entries(combined)
      .filter(([_, task]) => task !== null)
      .map(([line, task]) => ({
        ...task,
        line: Number.parseInt(line, 10),
        isRepeatingTask: false,
      }));

    // Retornar todas las tareas (normales + repetidas)
    return [...normalTasksArray, ...repeatedTasks];
  }, [
    tasksByDate,
    selectedDate,
    getAllTasks,
    getAllRepeatingPatterns,
    shouldTaskRepeatOnDate,
    isRepeatingTaskCompleted,
    localRepeatingCompletions,
  ]);

  // Calcular las tareas usando la función
  const dayTasks = calculateDayTasks();

  // Efecto para forzar re-render cuando cambien las tareas repetidas
  React.useEffect(() => {
    // Sincronizar estado local con el store cuando cambie el modal
    const syncCompletions = async () => {
      const newCompletions: Record<string, boolean> = {};
      setLocalRepeatingCompletions(newCompletions);
    };

    if (visible) {
      syncCompletions();
    }
  }, [visible, selectedDate]);

  // Constante para el límite máximo de tareas
  const MAX_TASKS = 12;

  // Verificar si se ha alcanzado el límite de tareas
  const isTaskLimitReached = dayTasks.length >= MAX_TASKS;

  const handleToggleComplete = (task: any) => {
    console.log(
      "🔄 Toggleando tarea:",
      task.id,
      "isRepeating:",
      task.isRepeatingTask
    );
    if (task.isRepeatingTask) {
      console.log(
        "📅 Tarea repetida - toggleando:",
        task.repeatingTaskId,
        selectedDate
      );

      // Actualizar estado local inmediatamente para reactividad instantánea
      const completionKey = `${task.repeatingTaskId}-${selectedDate}`;
      setLocalRepeatingCompletions((prev) => ({
        ...prev,
        [completionKey]: !task.completed,
      }));

      // También actualizar el store para persistencia
      toggleRepeatingTaskCompletion(task.repeatingTaskId, selectedDate);
    } else {
      console.log("📝 Tarea normal - actualizando:", selectedDate, task.line);
      updateTask(selectedDate, task.line, {
        ...task,
        completed: !task.completed,
      });
    }
  };

  const handleStartEdit = (task: any) => {
    if (task.isRepeatingTask) {
      Alert.alert(
        "Tarea Repetida",
        "No puedes editar directamente una tarea repetida. Edita la tarea original en su día de creación."
      );
      return;
    }
    setEditingTaskId(task.id);
    setEditingText(task.text);
  };

  const handleSaveEdit = () => {
    if (!editingText.trim() || !editingTaskId) return;

    const task = dayTasks.find((t) => t.id === editingTaskId);
    if (task && !task.isRepeatingTask) {
      updateTask(selectedDate, task.line, {
        ...task,
        text: editingText.trim(),
      });
    }

    setEditingTaskId(null);
    setEditingText("");
  };

  const handleDeleteTask = (task: any) => {
    if (task.isRepeatingTask) {
      Alert.alert(tCommon("taskRepeat.cannotDeleteRepeated"));
      return;
    }

    Alert.alert(
      tCommon("taskEditModal.deleteTask"),
      tCommon("taskEditModal.deleteTaskConfirm"),
      [
        { text: tCommon("buttons.cancel"), style: "cancel" },
        {
          text: tCommon("buttons.delete"),
          style: "destructive",
          onPress: () => {
            deleteTask(selectedDate, task.line).catch(console.error);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <ThemedView style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText style={[styles.title, { color: textColor }]}>
            📅 {formatDateWithI18n(new Date(selectedDate))}
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="times" size={20} color={textColor} />
          </TouchableOpacity>
        </ThemedView>

        {/* Lista de tareas */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.content}>
            {dayTasks.length > 0 ? (
              <>
                <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                  {dayTasks.length}{" "}
                  {tAgenda(
                    dayTasks.length === 1
                      ? "task.taskCount"
                      : "tasks.taskCount_plural",
                    {
                      count: dayTasks.length,
                    }
                  )}{" "}
                </ThemedText>

                {dayTasks.map((task, index) => (
                  <ThemedView
                    key={task.id}
                    style={[
                      styles.taskCard,
                      task.completed && styles.taskCardCompleted,
                      task.isRepeatingTask &&
                        !task.completed &&
                        styles.taskCardRepeating,
                    ]}
                  >
                    <ThemedView style={styles.taskContent}>
                      {/* Checkbox */}
                      <TouchableOpacity
                        onPress={() => handleToggleComplete(task)}
                        style={styles.checkbox}
                      >
                        <ThemedText style={styles.taskCheckbox}>
                          {task.completed ? "✅" : "☐"}
                        </ThemedText>
                      </TouchableOpacity>

                      {/* Texto de la tarea */}
                      <ThemedView style={styles.taskTextContainer}>
                        {editingTaskId === task.id ? (
                          <TextInput
                            style={[
                              styles.editInput,
                              { color: textColor, borderColor: tintColor },
                            ]}
                            value={editingText}
                            onChangeText={setEditingText}
                            onSubmitEditing={handleSaveEdit}
                            onBlur={handleSaveEdit}
                            autoFocus
                            multiline
                          />
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleStartEdit(task)}
                          >
                            <ThemedText
                              style={[
                                styles.taskText,
                                {
                                  color: textColor,
                                  backgroundColor: "transparent",
                                },
                                task.completed && styles.taskTextCompleted,
                              ]}
                              numberOfLines={2}
                            >
                              {task.text}
                            </ThemedText>
                          </TouchableOpacity>
                        )}

                        {/* Indicadores */}
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

                      {/* Botones de acción */}
                      {!task.isRepeatingTask && (
                        <TouchableOpacity
                          onPress={() => handleDeleteTask(task)}
                          style={styles.actionButton}
                        >
                          <Icon name="trash" size={16} color="#ff4444" />
                        </TouchableOpacity>
                      )}
                    </ThemedView>
                  </ThemedView>
                ))}
              </>
            ) : (
              <ThemedText style={[styles.emptyText, { color: textColor }]}>
                {tCommon("taskEditModal.noTask")}
              </ThemedText>
            )}
          </ThemedView>
        </ScrollView>

        {/* Agregar nueva tarea */}
        <ThemedView
          style={[
            styles.addTaskContainer,
            { borderTopColor: tintColor + "30" },
          ]}
        >
          {/* Mensaje de límite alcanzado */}
          {isTaskLimitReached && (
            <ThemedView style={styles.limitMessageContainer}>
              <ThemedText style={[styles.limitMessage, { color: "#ff8800" }]}>
                📋 {tCommon("taskEditModal.limitReached")}
              </ThemedText>
              <ThemedText
                style={[styles.limitSubMessage, { color: textColor }]}
              >
                {tCommon("taskEditModal.soon")}
              </ThemedText>
            </ThemedView>
          )}
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
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "capitalize",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  taskItem: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    padding: 12,
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
    marginBottom: 8,
  },
  taskCardCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderLeftColor: "#22C55E",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  taskCardRepeating: {
    backgroundColor: "transparent",
    borderLeftColor: "#007AFF",
    borderColor: "rgba(0, 122, 255, 0.2)",
  },
  taskCheckbox: {
    fontSize: 16,
    marginRight: 12,
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "transparent",
    flex: 1,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  taskTextContainer: {
    backgroundColor: "transparent",
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    lineHeight: 22,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  completedTask: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
    minHeight: 40,
  },
  indicators: {
    flexDirection: "row",
    marginTop: 4,
  },
  taskIcons: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  indicator: {
    fontSize: 12,
    marginRight: 4,
  },
  taskIcon: {
    fontSize: 12,
  },
  actions: {
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.6,
    marginTop: 40,
    fontSize: 16,
  },
  addTaskContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  limitMessageContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 136, 0, 0.1)",
  },
  limitMessage: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  limitSubMessage: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.8,
    fontStyle: "italic",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  addTaskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
    minHeight: 50,
    maxHeight: 100,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});
