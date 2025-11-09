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
  tAgenda: (key: string, options?: any) => string;
  tCommon: (key: string, options?: any) => string;
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
  tAgenda,
  tCommon,
}: BookPageProps) {
  // Formatear fecha para el store usando utilidad que evita problemas de timezone
  const dateKey = dateToLocalDateString(day);

  // Estados locales
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<string>("");
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [forceRefresh, setForceRefresh] = useState(0);

  // Obtener configuración de líneas por página
  const { linesPerPage } = useBookSettingsStore();

  // Suscribirse directamente a las tareas de esta fecha específica
  const dayTasks = useAgendaTasksStore(
    (state) => state.tasksByDate[dateKey] || EMPTY_TASKS
  );

  const { setCalendarIsOpen, calendarIsopen, selectDate } =
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
  const getRepeatingPatternForTask = useRepeatingTasksStore(
    (state) => state.getRepeatingPatternForTask
  );

  // Store de tareas para acceder a todas las tareas por su ID
  const getAllTasks = useAgendaTasksStore((state) => state.getAllTasks);
  const getTaskForLine = useAgendaTasksStore((state) => state.getTaskForLine);

  // Suscribirse al estado de completado para forzar re-renders
  const repeatingCompletions = useRepeatingTasksStore(
    (state) => state.repeatingTaskCompletions
  );

  // Separar tareas normales y tareas repetidas en estructuras independientes
  const { allTasks, repeatedTasks } = React.useMemo(() => {
    const allExistingTasks = getAllTasks();
    const allPatterns = getAllRepeatingPatterns();

    // Crear un mapa de tareas originales y sus fechas de creación
    const originalTasksMap = new Map();
    for (const [dateKeyMap, dayTasksMap] of Object.entries(allExistingTasks)) {
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

    // Comenzar con las tareas del día (SIEMPRE mantener estas líneas)
    const normalTasks = { ...dayTasks };

    // Solo filtrar tareas que tienen patrones de repetición activos Y NO estamos en su día de creación
    for (const [line, task] of Object.entries(normalTasks)) {
      if (task && tasksWithActivePatterns.has(task.id)) {
        const originalInfo = originalTasksMap.get(task.id);
        // Solo filtrar si NO estamos en el día de creación original
        if (originalInfo && originalInfo.originalDate !== dateKey) {
          delete normalTasks[Number.parseInt(line, 10)];
        }
      }
    }

    // Crear array independiente de tareas repetidas (no ocupan líneas normales)
    const repeatedTasksList: AgendaTask[] = [];
    for (const pattern of allPatterns) {
      if (!pattern.isActive) continue;

      if (shouldTaskRepeatOnDate(pattern.originalTaskId, dateKey)) {
        const originalInfo = originalTasksMap.get(pattern.originalTaskId);

        // Solo agregar como tarea repetida si NO estamos en el día de creación original
        if (originalInfo && originalInfo.originalDate !== dateKey) {
          repeatedTasksList.push({
            ...originalInfo.task,
            id: `${originalInfo.task.id}-repeat-${dateKey}`,
            completed: isRepeatingTaskCompleted(originalInfo.task.id, dateKey),
            isRepeatingTask: true,
            repeatingTaskId: originalInfo.task.id,
            repeatingPatternId: pattern.id,
          });
        }
      }
    }

    return {
      allTasks: normalTasks,
      repeatedTasks: repeatedTasksList
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dayTasks,
    dateKey,
    getAllTasks,
    getAllRepeatingPatterns,
    shouldTaskRepeatOnDate,
    lastUpdateTime,
    repeatingCompletions,
    linesPerPage,
    forceRefresh,
  ]);
  const {
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion: originalToggleTaskCompletion,
  } = useAgendaTasksStore();

  // Función personalizada para manejar el toggle de tareas normales y repetidas
  const handleToggleTaskCompletion = (date: string, lineNumber: number) => {
    const task = getTaskForPageLine(lineNumber);
    if (task?.isRepeatingTask) {
      // Es una tarea repetida, usar el store de tareas repetidas
      toggleRepeatingTaskCompletion(task.repeatingTaskId!, date);
    } else if (task) {
      // Es una tarea normal, usar el store de tareas normales directamente
      originalToggleTaskCompletion(date, lineNumber);
    }
  };
  const formatDate = (date: Date) => {
    const dayNames = [
      tAgenda("days.sunday"),
      tAgenda("days.monday"),
      tAgenda("days.tuesday"),
      tAgenda("days.wednesday"),
      tAgenda("days.thursday"),
      tAgenda("days.friday"),
      tAgenda("days.saturday"),
    ];

    const monthNames = [
      tAgenda("months.january"),
      tAgenda("months.february"),
      tAgenda("months.march"),
      tAgenda("months.april"),
      tAgenda("months.may"),
      tAgenda("months.june"),
      tAgenda("months.july"),
      tAgenda("months.august"),
      tAgenda("months.september"),
      tAgenda("months.october"),
      tAgenda("months.november"),
      tAgenda("months.december"),
    ];

    return {
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      monthName: monthNames[date.getMonth()],
      year: date.getFullYear(),
    };
  };

  // Generar líneas para escritura (líneas normales + líneas virtuales para tareas repetidas)
  const generateLines = () => {
    const lines = [];
    
    // Líneas normales del día (siempre disponibles para el usuario)
    for (let i = 1; i <= linesPerPage; i++) {
      lines.push({ lineNumber: i, isVirtual: false });
    }
    
    // Líneas virtuales para tareas repetidas
    for (let i = 0; i < repeatedTasks.length; i++) {
      lines.push({ 
        lineNumber: linesPerPage + i + 1, 
        isVirtual: true,
        repeatedTaskIndex: i 
      });
    }
    
    return lines;
  };

  const dateInfo = formatDate(day);

  // Función para obtener tarea por línea (incluyendo líneas virtuales de tareas repetidas)
  const getTaskForPageLine = (lineNumber: number): AgendaTask | null => {
    // Primero verificar tareas normales
    if (allTasks[lineNumber]) {
      return allTasks[lineNumber];
    }
    
    // Si la línea está después de linesPerPage, puede ser una tarea repetida virtual
    const repeatedIndex = lineNumber - linesPerPage - 1;
    if (repeatedIndex >= 0 && repeatedIndex < repeatedTasks.length) {
      return repeatedTasks[repeatedIndex];
    }
    
    return null;
  };

  // Funciones para manejar las tareas
  const handleLinePress = (lineNumber: number) => {
    const existingTask = getTaskForPageLine(lineNumber);
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
      const existingTask = getTaskForPageLine(editingLine);

      if (existingTask) {
        // Verificar si es una tarea repetida virtual (isRepeatingTask = true)
        if (existingTask.isRepeatingTask) {
          // Editando una instancia virtual de tarea repetida
          if (repeat && repeat !== "none") {
            // Mantener como tarea repetida - actualizar SOLO la tarea original
            const allExistingTasks = getAllTasks();
            let foundOriginal = false;

            // Buscar la tarea original en todas las fechas
            for (const [date, tasks] of Object.entries(allExistingTasks)) {
              for (const [line, task] of Object.entries(tasks)) {
                if (task && task.id === existingTask.repeatingTaskId) {
                  // Actualizar la tarea original
                  await updateTask(date, Number.parseInt(line, 10), {
                    text,
                    reminder,
                    repeat,
                  });
                  
                  // También actualizar el patrón de repetición si cambió la frecuencia
                  const currentPattern = getRepeatingPatternForTask(task.id);
                  if (currentPattern && currentPattern.repeatOption !== repeat) {
                    // Eliminar el patrón actual
                    removeRepeatingPattern(task.id);
                    // Crear nuevo patrón con la nueva frecuencia
                    addRepeatingPattern({
                      originalTaskId: task.id,
                      repeatOption: repeat,
                      startDate: date,
                    });
                  }
                  
                  foundOriginal = true;
                  break;
                }
              }
              if (foundOriginal) break;
            }
          } else {
            // Convertir tarea repetida virtual a tarea normal
            // 1. Primero eliminar el patrón de repetición para detener la generación de instancias
            removeRepeatingPattern(existingTask.repeatingTaskId!);
            // 2. Encontrar la primera línea disponible del día para crear la tarea normal
            let availableLine = 1;
            for (let i = 1; i <= linesPerPage; i++) {
              if (!allTasks[i]) {
                availableLine = i;
                break;
              }
            }
            await addTask(dateKey, availableLine, text, reminder, "none");
          }
        } else {
          // Verificar si es la tarea original de un patrón de repetición
          const existingPattern = getRepeatingPatternForTask(existingTask.id);

          if (existingPattern && existingPattern.isActive) {
            // Estamos editando la tarea original de un patrón repetido
            if (repeat && repeat !== "none") {
              // Mantener como tarea repetida - solo actualizar la tarea original
              await updateTask(dateKey, editingLine, {
                text,
                reminder,
                repeat,
              });
            } else {
              // Convertir de repetida a normal - eliminar patrón
              removeRepeatingPattern(existingTask.id);
              await updateTask(dateKey, editingLine, {
                text,
                reminder,
                repeat: "none",
              });
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
        }
      } else if (repeat && repeat !== "none") {
        // Nueva tarea repetida
        // Si estamos en una línea virtual, encontrar una línea real disponible
        let targetLine = editingLine;
        if (editingLine > linesPerPage) {
          // Buscar primera línea disponible
          for (let i = 1; i <= linesPerPage; i++) {
            if (!allTasks[i]) {
              targetLine = i;
              break;
            }
          }
        }
        
        // 1. Crear la tarea normal primero
        await addTask(dateKey, targetLine, text, reminder, repeat);

        // 2. Obtener la tarea recién creada usando el store directamente
        // Usar un pequeño delay para asegurar que el store se actualice
        const newTask = getTaskForLine(dateKey, targetLine);
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
            const delayedTask = getTaskForLine(dateKey, targetLine);
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
        // Si estamos en una línea virtual, encontrar una línea real disponible
        let targetLine = editingLine;
        if (editingLine > linesPerPage) {
          // Buscar primera línea disponible
          for (let i = 1; i <= linesPerPage; i++) {
            if (!allTasks[i]) {
              targetLine = i;
              break;
            }
          }
        }
        await addTask(dateKey, targetLine, text, reminder, repeat);
      }

      // Forzar una actualización del componente para asegurar que se vean los cambios
      setModalVisible(false);
      setEditingLine(null);
      setEditingTask("");

      // Forzar múltiples actualizaciones para limpiar completamente las instancias virtuales
      const updateTime = Date.now();
      setLastUpdateTime(updateTime);
      setForceRefresh((prev) => prev + 1);

      // Para tareas repetidas, forzar limpieza agresiva
      if (existingTask?.isRepeatingTask || (repeat && repeat !== "none")) {
        setTimeout(() => {
          setLastUpdateTime(updateTime + 1);
          setForceRefresh((prev) => prev + 1);
        }, 50);
        setTimeout(() => {
          setLastUpdateTime(updateTime + 2);
          setForceRefresh((prev) => prev + 1);
        }, 150);
      }
    }
  };

  const handleDeleteTask = async () => {
    if (editingLine !== null) {
      const existingTask = getTaskForPageLine(editingLine);

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
                  { marginRight: 5, marginTop: 2 },
                ]}
              >
                {dateInfo.dayNumber}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.externalLinkButton,
                {
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 107, 53, 0.2)"
                      : "rgba(255, 107, 53, 0.15)",
                  borderColor:
                    colorScheme === "dark"
                      ? "rgba(255, 107, 53, 0.4)"
                      : "rgba(255, 107, 53, 0.3)",
                },
              ]}
              onPress={() => {
                setCalendarIsOpen(!calendarIsopen);
                selectDate(day.toISOString().split("T")[0]);
              }}
            >
              <Icon
                name="calendar"
                size={12}
                color={colorScheme === "dark" ? "#FF8A65" : "#FF6B35"}
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
        {generateLines().map((line, index) => {
          const prevLine = generateLines()[index - 1];
          const showSeparator = line.isVirtual && !prevLine?.isVirtual;
          const { lineNumber, isVirtual } = line;
          // Siempre usar el estilo con líneas visibles independientemente del contenido
          // Las líneas virtuales tienen un estilo diferente para indicar que son tareas repetidas
          const lineStyle = isVirtual 
            ? [dynamicStyles.lineWithTask, styles.expandedLine, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]
            : [dynamicStyles.lineWithTask, styles.expandedLine];

          return (
            <React.Fragment key={`${dayIndex}-line-${lineNumber}-${isVirtual ? 'virtual' : 'normal'}`}>
              {showSeparator && (
                <ThemedView style={{
                  height: 1,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.5)',
                  marginVertical: 5,
                  marginHorizontal: 10
                }}>
                  <ThemedText style={{
                    fontSize: 10,
                    color: colorScheme === 'dark' ? 'rgba(255, 215, 0, 0.7)' : 'rgba(255, 215, 0, 0.8)',
                    textAlign: 'center',
                    marginTop: -8,
                    backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
                    paddingHorizontal: 5
                  }}>
                    🔄 Tareas Repetidas
                  </ThemedText>
                </ThemedView>
              )}
              <TouchableOpacity
                style={lineStyle}
                onPress={() => handleLinePress(lineNumber)}
              >
              <ThemedView
                style={[
                  styles.lineNumber,
                  styles.expandedLineNumber,
                  {
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "transparent",
                  },
                ]}
              >
                {(() => {
                  const task = getTaskForPageLine(lineNumber);
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
                  const task = getTaskForPageLine(lineNumber);
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
                          numberOfLines={undefined}
                          ellipsizeMode="tail"
                        >
                          {`${
                            task.repeat && task.repeat !== "none" ? "🔄 " : ""
                          }${task.reminder ? "⏰ " : ""}${task.text}`}
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
            </React.Fragment>
          );
        })}
      </ThemedView>

      {/* Modal del calendario */}
      <AnotherCalendarModal
        visible={calendarIsopen}
        onClose={() => setCalendarIsOpen(false)}
      />

      {/* Modal para editar tareas */}
      <TaskEditModal
        tCommon={tCommon}
        visible={modalVisible}
        initialText={editingTask}
        initialReminder={editingLine ? getTaskForPageLine(editingLine)?.reminder : undefined}
        initialRepeat={
          (editingLine ? getTaskForPageLine(editingLine)?.repeat as RepeatOption : undefined) || "none"
        }
        onSave={handleSaveTask}
        toggleTaskCompletion={handleToggleTaskCompletion}
        date={dateKey}
        completed={editingLine ? getTaskForPageLine(editingLine)?.completed ?? false : false}
        lineNumber={editingLine as number}
        onCancel={handleCancelEdit}
        onDelete={editingTask ? handleDeleteTask : undefined}
        colorScheme={colorScheme as "light" | "dark"}
        colors={colors}
      />
    </ThemedView>
  );
}
