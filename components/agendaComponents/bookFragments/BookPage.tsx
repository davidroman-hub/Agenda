import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import React, { useState } from "react";
import { TouchableOpacity } from "react-native";

import { styles } from "../bookStyles";
import TaskEditModal from "./TaskEditModal";

interface BookPageProps {
  readonly day: Date;
  readonly dayIndex: number;
  readonly isLeftPage?: boolean;
  readonly viewMode: string;
  readonly colorScheme: string;
  readonly colors: any;
  readonly dynamicStyles: any;
}

// Objeto vacío estable para evitar re-renders innecesarios
const EMPTY_TASKS = {};

export default function BookPage({
  day,
  dayIndex,
  isLeftPage = false,
  viewMode,
  colorScheme,
  colors,
  dynamicStyles,
}: BookPageProps) {
  // Formatear fecha para el store (YYYY-MM-DD)
  const dateKey = day.toISOString().split("T")[0];

  // Suscribirse directamente a las tareas de esta fecha específica
  const dayTasks = useAgendaTasksStore(
    (state) => state.tasksByDate[dateKey] || EMPTY_TASKS
  );
  const { addTask, updateTask, deleteTask, toggleTaskCompletion } =
    useAgendaTasksStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<string>("");
  const formatDate = (date: Date) => {
    const dayNames = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];

    const monthNames = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    return {
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      monthName: monthNames[date.getMonth()],
      year: date.getFullYear(),
    };
  };

  // Generar líneas para escritura (como en agenda real)
  const generateLines = () => {
    const lines = [];
    for (let i = 1; i <= 8; i++) {
      lines.push(i);
    }
    return lines;
  };

  const dateInfo = formatDate(day);

  // Funciones para manejar las tareas
  const handleLinePress = (lineNumber: number) => {
    const existingTask = dayTasks[lineNumber];
    setEditingLine(lineNumber);
    setEditingTask(existingTask?.text || "");
    setModalVisible(true);
  };

  const handleSaveTask = async (text: string, reminder?: string | null) => {
    if (editingLine !== null) {
      const existingTask = dayTasks[editingLine];

      if (existingTask) {
        await updateTask(dateKey, editingLine, { text, reminder });
      } else {
        await addTask(dateKey, editingLine, text, reminder);
      }

      setModalVisible(false);
      setEditingLine(null);
      setEditingTask("");
    }
  };

  const handleDeleteTask = async () => {
    if (editingLine !== null) {
      await deleteTask(dateKey, editingLine);
      setModalVisible(false);
      setEditingLine(null);
      setEditingTask("");
    }
  };

  const handleCancelEdit = () => {
    setModalVisible(false);
    setEditingLine(null);
    setEditingTask("");
  };

  // Determinar estilo de página según el modo de vista
  let pageStyle;
  if (viewMode === "expanded") {
    if (isLeftPage) {
      pageStyle = [dynamicStyles.page, styles.leftPage];
    } else {
      pageStyle = [dynamicStyles.page, styles.rightPage];
    }
  } else {
    pageStyle = dynamicStyles.page;
  }

  return (
    <ThemedView style={pageStyle}>
      {/* Encabezado de la página como agenda real */}
      <ThemedView
        style={[
          styles.pageHeader,
          dynamicStyles.pageHeaderBorder,
          viewMode === "expanded" ? styles.expandedPageHeader : null,
        ]}
      >
        <ThemedText
          style={[
            styles.dayName,
            viewMode === "expanded" ? styles.expandedDayName : null,
          ]}
        >
          {dateInfo.dayName}
        </ThemedText>
        <ThemedView style={styles.dateContainer}>
          <ThemedText
            style={[
              styles.dayNumber,
              dynamicStyles.dayNumber,
              viewMode === "expanded" ? styles.expandedDayNumber : null,
            ]}
          >
            {dateInfo.dayNumber}
          </ThemedText>
          <ThemedText
            style={[
              styles.monthYear,
              viewMode === "expanded" ? styles.expandedMonthYear : null,
            ]}
          >
            {dateInfo.monthName} {dateInfo.year}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Líneas de escritura como en agenda real */}
      <ThemedView style={styles.linesContainer}>
        {generateLines().map((lineNumber) => {
          const hasTask = dayTasks[lineNumber];
          
          let lineStyle;
          if (hasTask) {
            lineStyle = viewMode === "expanded" 
              ? [dynamicStyles.lineWithTask, styles.expandedLine] 
              : dynamicStyles.lineWithTask;
          } else {
            lineStyle = viewMode === "expanded" 
              ? [dynamicStyles.line, styles.expandedLine] 
              : dynamicStyles.line;
          }
          
          return (
            <TouchableOpacity
              key={`${dayIndex}-line-${lineNumber}`}
              style={lineStyle}
              onPress={() => handleLinePress(lineNumber)}
            >
            <ThemedText
              style={[
                styles.lineNumber,
                viewMode === "expanded" ? styles.expandedLineNumber : null,
              ]}
            >
              {lineNumber}
            </ThemedText>
            <ThemedView style={[styles.writingLine, { backgroundColor: "transparent" }]}>
              {(() => {
                const task = dayTasks[lineNumber];
                if (task) {
                  return (
                    <ThemedView
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                        backgroundColor: "transparent", // Fondo transparente explícito
                      }}
                    >
                      <TouchableOpacity
                        style={(() => {
                          let borderColor;
                          if (task.completed) {
                            borderColor = "#4CAF50";
                          } else if (colorScheme === "dark") {
                            borderColor = "#888";
                          } else {
                            borderColor = "#666";
                          }

                          return {
                            marginRight: 8,
                            width: 20,
                            height: 25,
                            borderWidth: 2,
                            borderColor,
                            backgroundColor: task.completed
                              ? "#4CAF50"
                              : "transparent",
                            borderRadius: 3,
                            justifyContent: "center",
                            alignItems: "center",
                          };
                        })()}
                        onPress={() =>
                          toggleTaskCompletion(dateKey, lineNumber)
                        }
                      >
                        {task.completed && (
                          <ThemedText
                            style={{
                              fontSize: 16,
                              color: "white",
                              fontWeight: "bold",
                            }}
                          >
                            ✓
                          </ThemedText>
                        )}
                      </TouchableOpacity>
                      <ThemedText
                        style={[
                          viewMode === "expanded" ? dynamicStyles.expandedTaskText : dynamicStyles.taskText,
                          { flex: 1 },
                          task.completed && {
                            textDecorationLine: "line-through",
                            opacity: 0.6,
                          },
                        ]}
                      >
                        {task.text.length > 30
                          ? `${task.text.slice(0, 25)}...`
                          : task.text}
                      </ThemedText>
                    </ThemedView>
                  );
                }
                return (
                  <ThemedText
                    style={[
                      viewMode === "expanded" ? dynamicStyles.expandedTaskText : dynamicStyles.taskText,
                      { opacity: 0.4, fontStyle: "italic" },
                    ]}
                  ></ThemedText>
                );
              })()}
            </ThemedView>
          </TouchableOpacity>
          );
        })}
      </ThemedView>

      {/* Modal para editar tareas */}
      <TaskEditModal
        visible={modalVisible}
        initialText={editingTask}
        initialReminder={dayTasks[editingLine as number]?.reminder}
        onSave={handleSaveTask}
        toggleTaskCompletion={toggleTaskCompletion}
        date={dateKey}
        completed={dayTasks[editingLine as number]?.completed || false}
        lineNumber={editingLine as number}
        onCancel={handleCancelEdit}
        onDelete={editingTask ? handleDeleteTask : undefined}
        colorScheme={colorScheme as "light" | "dark"}
        colors={colors}
      />
    </ThemedView>
  );
}
