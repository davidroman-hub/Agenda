import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import LinkableText from "@/components/ui/linkable-text";
import useAgendaTasksStore, { AgendaTask } from "@/stores/agenda-tasks-store";
import useBookSettingsStore from "@/stores/boook-settings";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import { dateToLocalDateString } from "@/utils/date-utils";
import React, { useState } from "react";
import { TouchableOpacity } from "react-native";

import AnotherCalendarModal from "@/components/calendar/anotherCalendarModal";
import useCalendarSettingsStore from "@/stores/Calendar-store";
import Icon from "react-native-vector-icons/FontAwesome";
import { styles } from "../bookStyles";
import TaskEditModal from "./TaskEditModal";
import { RepeatOption } from "./TaskRepeat";

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
  //console.log("📋 BookPage renderizado para:", day.toString(), "ISO:", day.toISOString());

  // Formatear fecha para el store usando utilidad que evita problemas de timezone
  const dateKey = dateToLocalDateString(day);

  // Estados locales
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<string>("");
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Obtener configuración de líneas por página
  const { linesPerPage } = useBookSettingsStore();

  // Suscribirse directamente a las tareas de esta fecha específica
  const dayTasks = useAgendaTasksStore(
    (state) => state.tasksByDate[dateKey] || EMPTY_TASKS
  );

  const { setCalendarIsOpen, calendarIsopen, selectDate, dateSelected } =
    useCalendarSettingsStore();

  // Obtener funciones del store de patrones de repetición
  const getAllRepeatingPatterns = useRepeatingTasksStore(
    (state) => state.getAllRepeatingPatterns
  );
  const shouldTaskRepeatOnDate = useRepeatingTasksStore(
    (state) => state.shouldTaskRepeatOnDate
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
  const isRepeatingTaskCompleted = useRepeatingTasksStore(
    (state) => state.isRepeatingTaskCompleted
  );

  // Store de tareas para acceder a todas las tareas por su ID
  const getAllTasks = useAgendaTasksStore((state) => state.getAllTasks);
  const getTaskForLine = useAgendaTasksStore((state) => state.getTaskForLine);

  // Suscribirse al estado de completado para forzar re-renders
  const repeatingCompletions = useRepeatingTasksStore(
    (state) => state.repeatingTaskCompletions
  );

  // Combinar tareas normales con tareas repetidas usando el nuevo sistema ID-based
  const allTasks = React.useMemo(() => {
    const allExistingTasks = getAllTasks();
    const allPatterns = getAllRepeatingPatterns();

    // Crear un Set de IDs de tareas que tienen patrones de repetición activos
    const tasksWithActivePatterns = new Set(
      allPatterns
        .filter((pattern) => pattern.isActive)
        .map((pattern) => pattern.originalTaskId)
    );

    // Comenzar con las tareas del día, excluyendo las que tienen patrones de repetición
    const combined = { ...dayTasks };

    // Filtrar tareas que tienen patrones de repetición activos
    for (const [line, task] of Object.entries(combined)) {
      if (task && tasksWithActivePatterns.has(task.id)) {
        delete combined[Number.parseInt(line, 10)];
      }
    }

    // Obtener tareas repetidas para hoy
    const repeatedTasks: AgendaTask[] = [];
    for (const pattern of allPatterns) {
      if (!pattern.isActive) continue;

      if (shouldTaskRepeatOnDate(pattern.originalTaskId, dateKey)) {
        const originalTask = Object.values(allExistingTasks)
          .flatMap((dayTasks) => Object.values(dayTasks))
          .find(
            (task): task is AgendaTask =>
              task !== null && task.id === pattern.originalTaskId
          );

        if (originalTask) {
          repeatedTasks.push({
            ...originalTask,
            id: `${originalTask.id}-repeat-${dateKey}`,
            completed: isRepeatingTaskCompleted(originalTask.id, dateKey),
            isRepeatingTask: true,
            repeatingTaskId: originalTask.id,
            repeatingPatternId: pattern.id,
          });
        }
      }
    }

    // Agregar las tareas repetidas a las líneas disponibles
    for (const repeatedTask of repeatedTasks) {
      // Buscar la primera línea disponible para la tarea repetida
      for (let line = 1; line <= linesPerPage; line++) {
        if (!combined[line]) {
          combined[line] = repeatedTask;
          break;
        }
      }
    }

    return combined;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dayTasks,
    dateKey,
    getAllTasks,
    getAllRepeatingPatterns,
    shouldTaskRepeatOnDate,
    lastUpdateTime,
    repeatingCompletions,
  ]);
  const {
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion: originalToggleTaskCompletion,
  } = useAgendaTasksStore();

  // Función personalizada para manejar el toggle de tareas normales y repetidas
  const handleToggleTaskCompletion = (date: string, lineNumber: number) => {
    const task = allTasks[lineNumber];
    if (task?.isRepeatingTask) {
      // Es una tarea repetida, usar el store de tareas repetidas
      toggleRepeatingTaskCompletion(task.repeatingTaskId!, date);
    } else {
      // Es una tarea normal, usar el store de tareas normales directamente
      originalToggleTaskCompletion(date, lineNumber);
    }
  };
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
    for (let i = 1; i <= linesPerPage; i++) {
      lines.push(i);
    }
    return lines;
  };

  const dateInfo = formatDate(day);

  // Funciones para manejar las tareas
  const handleLinePress = (lineNumber: number) => {
    const existingTask = allTasks[lineNumber];
    setEditingLine(lineNumber);
    setEditingTask(existingTask?.text || "");
    setModalVisible(true);
  };

  const handleSaveTask = async (
    text: string,
    reminder?: string | null,
    repeat?: RepeatOption
  ) => {
    if (editingLine !== null) {
      const existingTask = allTasks[editingLine];

      if (existingTask) {
        if (existingTask.isRepeatingTask) {
          // Editando una tarea repetida
          if (repeat && repeat !== "none") {
            // Mantener como tarea repetida - actualizar la tarea original
            // Encontrar la tarea original y actualizarla
            const allExistingTasks = getAllTasks();
            const originalTask = Object.values(allExistingTasks)
              .flatMap((dayTasks) => Object.values(dayTasks))
              .find(
                (task): task is AgendaTask =>
                  task !== null && task.id === existingTask.repeatingTaskId
              );

            if (originalTask) {
              // Encontrar en qué fecha y línea está la tarea original
              for (const [date, tasks] of Object.entries(allExistingTasks)) {
                for (const [line, task] of Object.entries(tasks)) {
                  if (task && task.id === existingTask.repeatingTaskId) {
                    await updateTask(date, Number.parseInt(line, 10), {
                      text,
                      reminder,
                      repeat,
                    });
                    break;
                  }
                }
              }
            }
          } else {
            // Convertir tarea repetida a tarea normal
            // 1. Eliminar el patrón de repetición
            removeRepeatingPattern(existingTask.repeatingTaskId!);
            // 2. Crear una tarea normal en esta fecha específica
            await addTask(dateKey, editingLine, text, reminder, "none");
            // 3. Forzar actualización inmediata para evitar duplicaciones
            setLastUpdateTime(Date.now());
          }
        } else if (repeat && repeat !== "none") {
          // Convertir tarea normal a tarea repetida
          // 1. Crear un patrón de repetición usando el ID de la tarea existente
          addRepeatingPattern({
            originalTaskId: existingTask.id,
            repeatOption: repeat,
            startDate: dateKey,
          });
          // 2. Actualizar la tarea para incluir la info de repetición
          await updateTask(dateKey, editingLine, { text, reminder, repeat });
        } else {
          // Actualizar tarea normal usando la línea directamente
          const allExistingTasks = getAllTasks();
          const dayTasks = allExistingTasks[dateKey] || {};

          // Buscar la línea original de la tarea por su ID
          let originalLineNumber: number | null = null;
          for (const [line, originalTask] of Object.entries(dayTasks)) {
            if (originalTask && originalTask.id === existingTask.id) {
              originalLineNumber = Number.parseInt(line, 10);
              break;
            }
          }

          if (originalLineNumber !== null) {
            await updateTask(dateKey, originalLineNumber, {
              text,
              reminder,
              repeat,
            });
          }
        }
      } else if (repeat && repeat !== "none") {
        // Nueva tarea repetida
        // 1. Crear la tarea normal primero
        await addTask(dateKey, editingLine, text, reminder, repeat);

        // 2. Obtener la tarea recién creada usando el store directamente
        // Usar un pequeño delay para asegurar que el store se actualice
        const newTask = getTaskForLine(dateKey, editingLine);
        if (newTask) {
          // 3. Crear el patrón de repetición
          addRepeatingPattern({
            originalTaskId: newTask.id,
            repeatOption: repeat,
            startDate: dateKey,
          });
        } else {
          // Si no podemos obtener la tarea inmediatamente, intentar después del siguiente render
          setTimeout(() => {
            const delayedTask = getTaskForLine(dateKey, editingLine);
            if (delayedTask) {
              addRepeatingPattern({
                originalTaskId: delayedTask.id,
                repeatOption: repeat,
                startDate: dateKey,
              });
            }
          }, 100);
        }
      } else {
        // Nueva tarea normal
        await addTask(dateKey, editingLine, text, reminder, repeat);
      }

      // Forzar una actualización del componente para asegurar que se vean los cambios
      setModalVisible(false);
      setEditingLine(null);
      setEditingTask("");

      // Forzar actualización del useMemo
      setLastUpdateTime(Date.now());

      // Esperar un frame adicional para asegurar que todos los stores se actualicen
      setTimeout(() => {
        // Este setTimeout fuerza un re-render después de que los stores se actualicen
        setLastUpdateTime(Date.now());
      }, 50);
    }
  };

  const handleDeleteTask = async () => {
    if (editingLine !== null) {
      const existingTask = allTasks[editingLine];

      if (existingTask?.isRepeatingTask) {
        // Eliminar patrón de repetición del store
        removeRepeatingPattern(existingTask.repeatingTaskId!);
        // Forzar actualización inmediata
        setLastUpdateTime(Date.now());
      } else if (existingTask) {
        // Eliminar tarea normal - buscar su línea original
        const allExistingTasks = getAllTasks();
        const dayTasks = allExistingTasks[dateKey] || {};

        // Buscar la línea original de la tarea por su ID
        let originalLineNumber: number | null = null;
        for (const [line, originalTask] of Object.entries(dayTasks)) {
          if (originalTask && originalTask.id === existingTask.id) {
            originalLineNumber = Number.parseInt(line, 10);
            break;
          }
        }

        if (originalLineNumber !== null) {
          await deleteTask(dateKey, originalLineNumber);
        }
      }

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
          <ThemedView style={styles.dayNumberContainer}>
            <TouchableOpacity
              onPress={() => {
                setCalendarIsOpen(!calendarIsopen);
                selectDate(day.toISOString().split("T")[0]);
              }}
            >
              <ThemedText
                style={[
                  styles.dayNumber,
                  dynamicStyles.dayNumber,
                  viewMode === "expanded" ? styles.expandedDayNumber : null,
                ]}
              >
                {dateInfo.dayNumber}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.externalLinkButton}
              onPress={() => {
                setCalendarIsOpen(!calendarIsopen);
                selectDate(day.toISOString().split("T")[0]);
              }}
            >
              <Icon
                name="calendar"
                size={12}
                color={colorScheme === "dark" ? "#fff" : "#000"}
              />
            </TouchableOpacity>
          </ThemedView>

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
          const hasTask = allTasks[lineNumber];

          let lineStyle;
          if (hasTask) {
            lineStyle =
              viewMode === "expanded"
                ? [dynamicStyles.lineWithTask, styles.expandedLine]
                : dynamicStyles.lineWithTask;
          } else {
            lineStyle =
              viewMode === "expanded"
                ? [dynamicStyles.line, styles.expandedLine]
                : dynamicStyles.line;
          }

          return (
            <TouchableOpacity
              key={`${dayIndex}-line-${lineNumber}`}
              style={lineStyle}
              onPress={() => handleLinePress(lineNumber)}
            >
              <ThemedView
                style={[
                  styles.lineNumber,
                  viewMode === "expanded" ? styles.expandedLineNumber : null,
                  {
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "transparent",
                  },
                ]}
              >
                {(() => {
                  const task = allTasks[lineNumber];
                  if (task?.reminder) {
                    // Si hay tarea con reminder, mostrar la hora arriba y minutos abajo
                    const reminderDate = new Date(task.reminder);

                    // Debug: verificar la fecha del reminder

                    const hours = reminderDate
                      .getHours()
                      .toString()
                      .padStart(2, "0");
                    const minutes = reminderDate
                      .getMinutes()
                      .toString()
                      .padStart(2, "0");

                    return (
                      <>
                        <ThemedText
                          style={{
                            fontSize: 9,
                            lineHeight: 12,
                            textAlign: "center",
                          }}
                        >
                          {hours}
                        </ThemedText>
                        <ThemedText
                          style={{
                            fontSize: 9,
                            lineHeight: 12,
                            textAlign: "center",
                          }}
                        >
                          {minutes}
                        </ThemedText>
                      </>
                    );
                  } else {
                    // Si no hay tarea o no tiene reminder, mostrar viñeta
                    return (
                      <ThemedText
                        style={{
                          fontSize: 16,
                          backgroundColor: "transparent",
                          textAlign: "center",
                        }}
                      >
                        •
                      </ThemedText>
                    );
                  }
                })()}
              </ThemedView>
              <ThemedView
                style={[styles.writingLine, { backgroundColor: "transparent" }]}
              >
                {(() => {
                  const task = allTasks[lineNumber];
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
                            handleToggleTaskCompletion(dateKey, lineNumber)
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
                        <LinkableText
                          style={{
                            ...(viewMode === "expanded"
                              ? dynamicStyles.expandedTaskText
                              : dynamicStyles.taskText),
                            flex: 1,
                            ...(task.completed && {
                              textDecorationLine: "line-through",
                              opacity: 0.6,
                            }),
                          }}
                          linkStyle={{
                            color:
                              colorScheme === "dark" ? "#64B5F6" : "#1976D2",
                            textDecorationLine: "underline",
                          }}
                          numberOfLines={
                            viewMode === "expanded" ? undefined : 2
                          }
                          ellipsizeMode="tail"
                        >
                          {`${
                            task.repeat && task.repeat !== "none" ? "🔄 " : ""
                          }${task.reminder ? "⏰ " : ""}${
                            task.text.length > 80 && viewMode !== "expanded"
                              ? task.text.slice(0, 75) + "..."
                              : task.text
                          }`}
                        </LinkableText>
                      </ThemedView>
                    );
                  }
                  return (
                    <ThemedText
                      style={[
                        viewMode === "expanded"
                          ? dynamicStyles.expandedTaskText
                          : dynamicStyles.taskText,
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

      {/* Modal del calendario */}
      <AnotherCalendarModal
        visible={calendarIsopen}
        onClose={() => setCalendarIsOpen(false)}
        selectedDate={day.toISOString().split("T")[0]}
        // onDateSelect={(date: Date) => {
        //   // Aquí necesitaremos una prop para navegar a la fecha
        //   console.log('Navegar a fecha:', date);
        //   setCalendarIsOpen(false);
        // }}
        // currentDate={day}
      />

      {/* Modal para editar tareas */}
      <TaskEditModal
        visible={modalVisible}
        initialText={editingTask}
        initialReminder={allTasks[editingLine as number]?.reminder}
        initialRepeat={
          (allTasks[editingLine as number]?.repeat as RepeatOption) || "none"
        }
        onSave={handleSaveTask}
        toggleTaskCompletion={handleToggleTaskCompletion}
        date={dateKey}
        completed={allTasks[editingLine as number]?.completed || false}
        lineNumber={editingLine as number}
        onCancel={handleCancelEdit}
        onDelete={editingTask ? handleDeleteTask : undefined}
        colorScheme={colorScheme as "light" | "dark"}
        colors={colors}
      />
    </ThemedView>
  );
}
