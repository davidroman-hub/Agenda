import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React, { useState } from "react";
import { Alert, Modal, TextInput, TouchableOpacity, View } from "react-native";
import { modalStyles } from "./TaskEditionModalStyles";
import TaskReminder from "./TaskReminder";
import TaskRepeat, { RepeatOption } from "./TaskRepeat";

interface TaskEditModalProps {
  readonly visible: boolean;
  readonly initialText?: string;
  readonly initialReminder?: string | null;
  readonly initialRepeat?: RepeatOption;
  readonly onSave: (text: string, reminder?: string | null, repeat?: RepeatOption) => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
  readonly colorScheme: "light" | "dark";
  readonly colors: any;
  readonly toggleTaskCompletion: (date: string, lineNumber: number) => void;
  readonly date: string;
  readonly lineNumber: number;
  readonly completed: boolean;
}

export default function TaskEditModal({
  visible,
  initialText = "",
  initialReminder,
  initialRepeat = 'none',
  onSave,
  onCancel,
  onDelete,
  colorScheme,
  colors,
  toggleTaskCompletion,
  date,
  lineNumber,
  completed,
}: TaskEditModalProps) {
  const [taskText, setTaskText] = useState(initialText);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [repeatOption, setRepeatOption] = useState<RepeatOption>(initialRepeat);
  const [repeatEnabled, setRepeatEnabled] = useState(initialRepeat !== 'none');

  React.useEffect(() => {
    setTaskText(initialText);

    // Inicializar recordatorio desde la tarea existente
    if (initialReminder) {
      const reminderDateObj = new Date(initialReminder);
      setReminderDate(reminderDateObj);
      setReminderEnabled(true);
    } else {
      setReminderDate(null);
      setReminderEnabled(false);
    }

    // Inicializar repetición desde la tarea existente
    setRepeatOption(initialRepeat);
    setRepeatEnabled(initialRepeat !== 'none');
  }, [initialText, initialReminder, initialRepeat, visible]);

  const handleSave = () => {
    const trimmedText = taskText.trim();
    if (trimmedText.length > 0) {
      const reminderString =
        reminderEnabled && reminderDate ? reminderDate.toISOString() : null;
      const finalRepeatOption = repeatEnabled ? repeatOption : 'none';
      onSave(trimmedText, reminderString, finalRepeatOption);
      setTaskText("");
      setReminderDate(null);
      setReminderEnabled(false);
      setRepeatOption('none');
      setRepeatEnabled(false);
    } else {
      Alert.alert("Error", "La tarea no puede estar vacía");
    }
  };

  const handleCompleted = () => {
    const trimmedText = taskText.trim();
    if (trimmedText.length > 0) {
      toggleTaskCompletion(date, lineNumber);
      setTaskText("");
      onCancel();
    } else {
      Alert.alert("Error", "La tarea no se pudo completar");
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      Alert.alert(
        "Eliminar tarea",
        "¿Estás seguro de que quieres eliminar esta tarea?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => {
              onDelete();
              setTaskText("");
              setReminderDate(null);
              setReminderEnabled(false);
              setRepeatOption('none');
              setRepeatEnabled(false);
            },
          },
        ]
      );
    }
  };

  const handleCancel = () => {
    setTaskText("");
    setReminderDate(null);
    setReminderEnabled(false);
    setRepeatOption('none');
    setRepeatEnabled(false);
    onCancel();
  };

  // Estilos dinámicos basados en el tema

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <ThemedView style={modalStyles(colorScheme, colors).overlay}>
        <ThemedView style={modalStyles(colorScheme, colors).container}>
          <ThemedText style={modalStyles(colorScheme, colors).title}>
            {initialText ? "Editar tarea" : "Nueva tarea"}
          </ThemedText>

          <TextInput
            style={modalStyles(colorScheme, colors).input}
            value={taskText}
            onChangeText={setTaskText}
            placeholder="Escribe tu tarea aquí..."
            placeholderTextColor={
              colorScheme === "dark" ? "#888888" : "#666666"
            }
            multiline
            maxLength={320}
            autoFocus
          />
          <TaskRepeat
            repeatOption={repeatOption}
            onRepeatChange={setRepeatOption}
            isEnabled={repeatEnabled}
            onToggleEnabled={setRepeatEnabled}
          />
          <TaskReminder
            reminderDate={reminderDate}
            onReminderChange={setReminderDate}
            isEnabled={reminderEnabled}
            onToggleEnabled={setReminderEnabled}
            taskDate={date}
          />

          <View style={modalStyles(colorScheme, colors).buttonsContainer}>
            <TouchableOpacity
              style={[
                modalStyles(colorScheme, colors).button,
                modalStyles(colorScheme, colors).cancelButton,
              ]}
              onPress={handleCancel}
            >
              <ThemedText
                style={[
                  modalStyles(colorScheme, colors).buttonText,
                  modalStyles(colorScheme, colors).cancelButtonText,
                ]}
              >
                Cancelar
              </ThemedText>
            </TouchableOpacity>

            {Boolean(initialText && onDelete) && (
              <TouchableOpacity
                style={[
                  modalStyles(colorScheme, colors).button,
                  modalStyles(colorScheme, colors).deleteButton,
                ]}
                onPress={handleDelete}
              >
                <ThemedText
                  style={[
                    modalStyles(colorScheme, colors).buttonText,
                    modalStyles(colorScheme, colors).deleteButtonText,
                  ]}
                >
                  Eliminar
                </ThemedText>
              </TouchableOpacity>
            )}

            {taskText.length > 0 && initialText === taskText && (
              <TouchableOpacity
                style={[
                  modalStyles(colorScheme, colors).button,
                  completed
                    ? modalStyles(colorScheme, colors).incompleteButton
                    : modalStyles(colorScheme, colors).completedButton,
                ]}
                onPress={handleCompleted}
              >
                <ThemedText
                  style={[
                    modalStyles(colorScheme, colors).buttonTextSmall,
                    modalStyles(colorScheme, colors).saveButtonText,
                  ]}
                >
                  {completed
                    ? "Marcar como incompleta"
                    : "Marcar como completa"}
                </ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                modalStyles(colorScheme, colors).button,
                modalStyles(colorScheme, colors).saveButton,
              ]}
              onPress={handleSave}
            >
              <ThemedText
                style={[
                  modalStyles(colorScheme, colors).buttonText,
                  modalStyles(colorScheme, colors).saveButtonText,
                ]}
              >
                Guardar
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}
