import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { promptForExactAlarmsOnce } from "@/services/exact-alarm-service";
import useTaskTypesStore from "@/stores/task-types-store";
import useThemeStore from "@/stores/theme-store";
import { initialTypeChoice } from "@/utils/task-types";
import React, { useState } from "react";
import { Alert, Modal, TextInput, TouchableOpacity, View } from "react-native";
import { modalStyles } from "./TaskEditionModalStyles";
import TaskReminder from "./TaskReminder";
import TaskRepeat, { RepeatOption } from "./TaskRepeat";
import TaskTypePicker from "./TaskTypePicker";

interface TaskEditModalProps {
  readonly visible: boolean;
  readonly initialText?: string;
  readonly initialReminder?: string | null;
  readonly initialRepeat?: RepeatOption;
  // Tipo que ya tiene la tarea (null o ausente: sin tipo)
  readonly initialTypeId?: string | null;
  readonly onSave: (
    text: string,
    reminder?: string | null,
    repeat?: RepeatOption,
    typeId?: string | null
  ) => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
  // Si es false, no se muestra la confirmación genérica antes de llamar a onDelete
  // (para tareas repetidas, cuyo borrado ya pregunta qué se quiere eliminar)
  readonly confirmDelete?: boolean;

  readonly toggleTaskCompletion: (date: string, lineNumber: number) => void;
  readonly date: string;
  readonly lineNumber: number;
  readonly completed: boolean;
  readonly tCommon: (key: string, options?: any) => string;
}

export default function TaskEditModal({
  visible,
  initialText = "",
  initialReminder,
  initialRepeat = "none",
  initialTypeId,
  onSave,
  onCancel,
  onDelete,
  confirmDelete = true,
  toggleTaskCompletion,
  date,
  lineNumber,
  completed,
  tCommon,
}: TaskEditModalProps) {
  const [taskText, setTaskText] = useState(initialText);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [repeatOption, setRepeatOption] = useState<RepeatOption>(initialRepeat);
  const [repeatEnabled, setRepeatEnabled] = useState(initialRepeat !== "none");
  // Tipo elegido: null = "Sin tipo" a propósito; undefined = tarea antigua sin tipo que aún
  // no se ha decidido (al guardar hay que elegir uno, o "Sin tipo" expresamente)
  const [typeChoice, setTypeChoice] = useState<string | null | undefined>(null);
  const [typeError, setTypeError] = useState(false);
  const types = useTaskTypesStore((state) => state.types);

  const { colorScheme } = useThemeStore();

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
    setRepeatEnabled(initialRepeat !== "none");

    // Tipo: se lee el estado actual de los tipos sin suscribirse, para no reiniciar el
    // modal (ni el texto que se está escribiendo) si cambian mientras está abierto
    const { types: currentTypes, activeFilter } = useTaskTypesStore.getState();
    setTypeChoice(
      initialTypeChoice({
        isNewTask: !initialText,
        taskTypeId: initialTypeId,
        types: currentTypes,
        activeFilter,
      })
    );
    setTypeError(false);
  }, [initialText, initialReminder, initialRepeat, initialTypeId, visible]);

  const handleSave = () => {
    const trimmedText = taskText.trim();
    if (trimmedText.length > 0) {
      // Tarea antigua sin tipo, existiendo tipos: no se guarda hasta que se elija uno
      if (typeChoice === undefined) {
        setTypeError(true);
        return;
      }

      const reminderString =
        reminderEnabled && reminderDate ? reminderDate.toISOString() : null;
      const finalRepeatOption = repeatEnabled ? repeatOption : "none";
      onSave(trimmedText, reminderString, finalRepeatOption, typeChoice);
      // Un recordatorio solo suena a su hora si Android permite alarmas exactas; se le explica una vez
      if (reminderString) promptForExactAlarmsOnce(tCommon);
      setTaskText("");
      setReminderDate(null);
      setReminderEnabled(false);
      setRepeatOption("none");
      setRepeatEnabled(false);
    } else {
      Alert.alert("Error", tCommon("taskEditModal.emptyTaskError"));
    }
  };

  const handleCompleted = () => {
    const trimmedText = taskText.trim();
    if (trimmedText.length > 0) {
      toggleTaskCompletion(date, lineNumber);
      setTaskText("");
      onCancel();
    } else {
      Alert.alert("Error", tCommon("taskEditModal.incompleteTaskError"));
    }
  };

  const handleDelete = () => {
    if (onDelete && !confirmDelete) {
      onDelete();
      return;
    }

    if (onDelete) {
      Alert.alert(
        tCommon("taskEditModal.deleteTask"),
        tCommon("taskEditModal.deleteTaskConfirm"),
        [
          { text: tCommon("buttons.cancel"), style: "cancel" },
          {
            text: tCommon("buttons.delete"),
            style: "destructive",
            onPress: () => {
              onDelete();
              setTaskText("");
              setReminderDate(null);
              setReminderEnabled(false);
              setRepeatOption("none");
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
    setRepeatOption("none");
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
      <ThemedView style={modalStyles(colorScheme).overlay}>
        <ThemedView style={modalStyles(colorScheme).container}>
          <ThemedText style={modalStyles(colorScheme).title}>
            {initialText
              ? tCommon("taskEditModal.taskEdit")
              : tCommon("taskEditModal.taskCreate")}
          </ThemedText>

          <TextInput
            style={modalStyles(colorScheme).input}
            value={taskText}
            onChangeText={setTaskText}
            placeholder={tCommon("taskEditModal.writeTaskHere")}
            placeholderTextColor={
              colorScheme === "dark" ? "#888888" : "#666666"
            }
            multiline
            maxLength={320}
            autoFocus
          />
          {types.length > 0 && (
            <TaskTypePicker
              types={types}
              value={typeChoice}
              onChange={(typeId) => {
                setTypeChoice(typeId);
                setTypeError(false);
              }}
              showError={typeError}
              colorScheme={colorScheme}
              tCommon={tCommon}
            />
          )}
          <TaskRepeat
            repeatOption={repeatOption}
            onRepeatChange={setRepeatOption}
            isEnabled={repeatEnabled}
            onToggleEnabled={setRepeatEnabled}
            tCommon={tCommon}
          />
          <TaskReminder
            tCommon={tCommon}
            reminderDate={reminderDate}
            onReminderChange={setReminderDate}
            isEnabled={reminderEnabled}
            onToggleEnabled={setReminderEnabled}
            taskDate={date}
          />

          <View style={modalStyles(colorScheme).buttonsContainer}>
            <TouchableOpacity
              style={[
                modalStyles(colorScheme).button,
                modalStyles(colorScheme).cancelButton,
              ]}
              onPress={handleCancel}
            >
              <ThemedText
                style={[
                  modalStyles(colorScheme).buttonText,
                  modalStyles(colorScheme).cancelButtonText,
                ]}
              >
                {tCommon("buttons.cancel")}
              </ThemedText>
            </TouchableOpacity>

            {Boolean(initialText && onDelete) && (
              <TouchableOpacity
                style={[
                  modalStyles(colorScheme).button,
                  modalStyles(colorScheme).deleteButton,
                ]}
                onPress={handleDelete}
              >
                <ThemedText
                  style={[
                    modalStyles(colorScheme).buttonText,
                    modalStyles(colorScheme).deleteButtonText,
                  ]}
                >
                  {tCommon("buttons.delete")}
                </ThemedText>
              </TouchableOpacity>
            )}

            {taskText.length > 0 && initialText === taskText && (
              <TouchableOpacity
                style={[
                  modalStyles(colorScheme).button,
                  completed
                    ? modalStyles(colorScheme).incompleteButton
                    : modalStyles(colorScheme).completedButton,
                ]}
                onPress={handleCompleted}
              >
                <ThemedText
                  style={[
                    modalStyles(colorScheme).buttonTextSmall,
                    modalStyles(colorScheme).saveButtonText,
                  ]}
                >
                  {completed
                    ? tCommon("taskEditModal.markAsIncomplete")
                    : tCommon("taskEditModal.markAsCompleted")}
                </ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                modalStyles(colorScheme).button,
                modalStyles(colorScheme).saveButton,
              ]}
              onPress={handleSave}
            >
              <ThemedText
                style={[
                  modalStyles(colorScheme).buttonText,
                  modalStyles(colorScheme).saveButtonText,
                ]}
              >
                {tCommon("buttons.save")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}
