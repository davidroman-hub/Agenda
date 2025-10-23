import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React, { useState } from "react";
import { Alert, Modal, TextInput, TouchableOpacity } from "react-native";

interface TaskEditModalProps {
  readonly visible: boolean;
  readonly initialText?: string;
  readonly onSave: (text: string) => void;
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

  React.useEffect(() => {
    setTaskText(initialText);
  }, [initialText, visible]);

  const handleSave = () => {
    const trimmedText = taskText.trim();
    if (trimmedText.length > 0) {
      onSave(trimmedText);
      setTaskText("");
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
            },
          },
        ]
      );
    }
  };

  const handleCancel = () => {
    setTaskText("");
    onCancel();
  };

  // Estilos dinámicos basados en el tema
  const modalStyles = {
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center" as const,
      alignItems: "center" as const,
      padding: 20,
    },
    container: {
      backgroundColor: colorScheme === "dark" ? "#2c2c2c" : "#ffffff",
      borderRadius: 16,
      padding: 24,
      width: "100%" as const,
      maxWidth: 400,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold" as const,
      marginBottom: 16,
      textAlign: "center" as const,
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
    },
    input: {
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#404040" : "#e0e0e0",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f8f9fa",
      minHeight: 80,
      maxHeight: 120,
      textAlignVertical: "top" as const,
      marginBottom: 20,
    },
    buttonsContainer: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    cancelButton: {
      backgroundColor: colorScheme === "dark" ? "#404040" : "#e0e0e0",
    },
    deleteButton: {
      backgroundColor: "#ff4757",
    },
    completedButton: {
      backgroundColor: "#4CAF50",
    },
    incompleteButton: {
      backgroundColor: "#FFA500",
    },
    saveButton: {
      backgroundColor: colors.tint,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600" as const,
    },
    buttonTextSmall: {
      fontSize: 12,
      marginLeft: 10,
      fontWeight: "600" as const,
    },
    cancelButtonText: {
      color: colorScheme === "dark" ? "#ffffff" : "#333333",
    },
    deleteButtonText: {
      color: "#ffffff",
    },
    saveButtonText: {
      color: "#ffffff",
    },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <ThemedView style={modalStyles.overlay}>
        <ThemedView style={modalStyles.container}>
          <ThemedText style={modalStyles.title}>
            {initialText ? "Editar tarea" : "Nueva tarea"}
          </ThemedText>

          <TextInput
            style={modalStyles.input}
            value={taskText}
            onChangeText={setTaskText}
            placeholder="Escribe tu tarea aquí..."
            placeholderTextColor={
              colorScheme === "dark" ? "#888888" : "#666666"
            }
            multiline
            maxLength={100}
            autoFocus
          />

          <ThemedView style={modalStyles.buttonsContainer}>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.cancelButton]}
              onPress={handleCancel}
            >
              <ThemedText
                style={[modalStyles.buttonText, modalStyles.cancelButtonText]}
              >
                Cancelar
              </ThemedText>
            </TouchableOpacity>

            {Boolean(initialText && onDelete) && (
              <TouchableOpacity
                style={[modalStyles.button, modalStyles.deleteButton]}
                onPress={handleDelete}
              >
                <ThemedText
                  style={[modalStyles.buttonText, modalStyles.deleteButtonText]}
                >
                  Eliminar
                </ThemedText>
              </TouchableOpacity>
            )}

            {taskText.length > 0 && initialText === taskText && (
              <TouchableOpacity
                style={[
                  modalStyles.button,
                  !completed
                    ? modalStyles.completedButton
                    : modalStyles.incompleteButton,
                ]}
                onPress={handleCompleted}
              >
                <ThemedText
                  style={[
                    modalStyles.buttonTextSmall,
                    modalStyles.saveButtonText,
                  ]}
                >
                  {completed
                    ? "Marcar como incompleta"
                    : "Marcar como completa"}
                </ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.saveButton]}
              onPress={handleSave}
            >
              <ThemedText
                style={[modalStyles.buttonText, modalStyles.saveButtonText]}
              >
                Guardar
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}
