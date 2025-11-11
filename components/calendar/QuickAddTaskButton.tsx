import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import React, { useState } from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import TaskEditModal from "../agendaComponents/bookFragments/TaskEditModal";
import { RepeatOption } from "../agendaComponents/bookFragments/TaskRepeat";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";
import { styles } from "./calendarStyles/QuickAddTaskButtonStyles";

interface QuickAddTaskButtonProps {
  readonly selectedDate: string;
  readonly availableLines: number[];
  readonly onTaskAdded?: () => void;
}

export default function QuickAddTaskButton({
  selectedDate,
  availableLines,
  onTaskAdded,
}: QuickAddTaskButtonProps) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const { tCommon } = useI18n();
  const tintColor = useThemeColor({}, "tint");
  const { addTask, toggleTaskCompletion } = useAgendaTasksStore();
  const { addRepeatingPattern } = useRepeatingTasksStore();

  const handleOpenModal = () => {
    if (availableLines.length === 0) {
      return; // No hacer nada si no hay líneas disponibles
    }
    setShowTaskModal(true);
  };

  const handleSaveTask = async (
    text: string,
    reminder?: string | null,
    repeat?: RepeatOption
  ) => {
    if (availableLines.length === 0) return;

    setIsCreatingTask(true);

    try {
      const targetLine = availableLines[0];

      // Agregar la tarea primero
      await addTask(selectedDate, targetLine, text, reminder, repeat || "none");

      // Si tiene repetición, necesitamos encontrar la tarea que acabamos de crear
      // para obtener su ID real y crear el patrón de repetición
      if (repeat && repeat !== "none") {
        // Esperar un poco para asegurar que la tarea se haya guardado
        setTimeout(() => {
          // Buscar la tarea que acabamos de crear (la más reciente en esta línea)
          const allTasks = useAgendaTasksStore.getState().getAllTasks();
          const dayTasks = allTasks[selectedDate];

          const task = dayTasks?.[targetLine];
          if (task) {
            addRepeatingPattern({
              originalTaskId: task.id,
              startDate: selectedDate,
              repeatOption: repeat,
            });

            console.log(
              `🔄 Patrón de repetición agregado para tarea: ${task.id}`
            );
          }
          setIsCreatingTask(false);
        }, 100); // 100ms de delay para asegurar que la tarea se haya guardado
      } else {
        setIsCreatingTask(false);
      }

      setShowTaskModal(false);
      onTaskAdded?.();
    } catch (error) {
      console.error("Error guardando tarea:", error);
      setIsCreatingTask(false);
    }
  };

  const handleCancelTask = () => {
    setShowTaskModal(false);
  };

  return (
    <>
      {/* Botón flotante de agregar */}
      <TouchableOpacity
        style={[
          styles.addButton,
          {
            backgroundColor: availableLines.length > 0 ? tintColor : "#ccc",
          },
        ]}
        onPress={handleOpenModal}
        disabled={availableLines.length === 0 || isCreatingTask}
      >
        {isCreatingTask ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Icon name="plus" size={20} color="white" />
        )}
      </TouchableOpacity>

      {/* TaskEditModal para crear nueva tarea */}
      {showTaskModal && availableLines.length > 0 && (
        <>
          <TaskEditModal
            visible={showTaskModal}
            initialText=""
            initialReminder={null}
            initialRepeat="none"
            onSave={handleSaveTask}
            onCancel={handleCancelTask}
            colorScheme="light"
            colors={{}}
            toggleTaskCompletion={toggleTaskCompletion}
            date={selectedDate}
            lineNumber={availableLines[0]}
            completed={false}
            tCommon={tCommon}
          />

          {/* Overlay de loading cuando se está creando la tarea */}
          {isCreatingTask && (
            <ThemedView style={styles.loadingOverlay}>
              <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={tintColor} />
                <ThemedText style={styles.loadingText}>
                  Creando tarea...
                </ThemedText>
              </ThemedView>
            </ThemedView>
          )}
        </>
      )}
    </>
  );
}

