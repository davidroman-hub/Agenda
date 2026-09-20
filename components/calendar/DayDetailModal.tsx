import { useThemeColor } from "@/hooks/use-theme-color";
import { deleteRepeatingOccurrence } from "@/services/repeating-occurrence-service";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import useTaskTypesStore from "@/stores/task-types-store";
import { createLocalDateFromString } from "@/utils/date-utils";
import { buildDayTasks } from "@/utils/day-tasks";
import {
  promptDeleteRepeatingOccurrence,
  promptDeleteRepeatingSeries,
} from "@/utils/repeat-delete-prompts";
import { formatDateWithI18n } from "@/utils/locale-config";
import { matchesTypeFilter, resolveFilter } from "@/utils/task-types";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";
import { styles } from "./DayDetailsStyles";

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
  const updateTask = useAgendaTasksStore((state) => state.updateTask);
  const deleteTask = useAgendaTasksStore((state) => state.deleteTask);

  const repeatingPatterns = useRepeatingTasksStore(
    (state) => state.repeatingPatterns
  );
  const repeatingCompletions = useRepeatingTasksStore(
    (state) => state.repeatingTaskCompletions
  );
  const toggleRepeatingTaskCompletion = useRepeatingTasksStore(
    (state) => state.toggleRepeatingTaskCompletion
  );

  // El estado local (optimista) de completados tiene prioridad sobre el del store
  const completions = React.useMemo(
    () => ({ ...repeatingCompletions, ...localRepeatingCompletions }),
    [repeatingCompletions, localRepeatingCompletions]
  );

  // Pestaña de tipo activa: el detalle solo enseña las tareas que la cumplen
  const taskTypes = useTaskTypesStore((state) => state.types);
  const activeTypeFilter = useTaskTypesStore((state) => state.activeFilter);
  const knownTypeIds = React.useMemo(
    () => new Set(taskTypes.map((type) => type.id)),
    [taskTypes]
  );
  const typeFilter = resolveFilter(activeTypeFilter, knownTypeIds);

  // Tareas del día (normales + instancias de repetidas). La lógica vive en utils/day-tasks.ts
  const allDayTasks = React.useMemo(() => {
    const { normalTasks, repeatedTasks } = buildDayTasks(
      selectedDate,
      tasksByDate,
      repeatingPatterns,
      completions
    );

    // Tareas normales con su número de línea
    const normalTasksArray = Object.entries(normalTasks)
      .filter(([_, task]) => task !== null)
      .map(([line, task]) => ({
        ...task,
        line: Number.parseInt(line, 10),
        isRepeatingTask: false,
      }));

    // Las tareas repetidas no tienen línea específica
    return [
      ...normalTasksArray,
      ...repeatedTasks.map((task) => ({ ...task, line: -1 })),
    ];
  }, [selectedDate, tasksByDate, repeatingPatterns, completions]);

  // Las que se enseñan, según el filtro por tipo
  const dayTasks = React.useMemo(
    () =>
      allDayTasks.filter((task) =>
        matchesTypeFilter(task, typeFilter, knownTypeIds)
      ),
    [allDayTasks, typeFilter, knownTypeIds]
  );

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
  // El límite cuenta todas las tareas del día, no solo las que deja ver el filtro
  const isTaskLimitReached = allDayTasks.length >= MAX_TASKS;

  const handleToggleComplete = (task: any) => {
    if (task.isRepeatingTask) {
      // Actualizar estado local inmediatamente para reactividad instantánea
      const completionKey = `${task.repeatingTaskId}-${selectedDate}`;
      setLocalRepeatingCompletions((prev) => ({
        ...prev,
        [completionKey]: !task.completed,
      }));

      // También actualizar el store para persistencia
      toggleRepeatingTaskCompletion(task.repeatingTaskId, selectedDate);
    } else {
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
      // Una ocurrencia de una serie: se pregunta si se quiere borrar solo esta,
      // esta y las siguientes, o toda la serie
      promptDeleteRepeatingOccurrence(tCommon, (scope) => {
        deleteRepeatingOccurrence(scope, task.repeatingTaskId, selectedDate).catch(
          console.error
        );
      });
      return;
    }

    // La tarea original de una serie: borrarla borra toda la serie, así que se confirma
    if (
      repeatingPatterns.some(
        (pattern) => pattern.originalTaskId === task.id && pattern.isActive
      )
    ) {
      promptDeleteRepeatingSeries(tCommon, () => {
        deleteRepeatingOccurrence("all", task.id, selectedDate).catch(console.error);
      });
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
            📅 {formatDateWithI18n(createLocalDateFromString(selectedDate))}
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
                      <TouchableOpacity
                        onPress={() => handleDeleteTask(task)}
                        style={styles.actionButton}
                      >
                        <Icon name="trash" size={16} color="#ff4444" />
                      </TouchableOpacity>
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

