import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import LinkableText from "@/components/ui/linkable-text";
import useAgendaTasksStore, { AgendaTask } from "@/stores/agenda-tasks-store";
import useBookNavigationStore from "@/stores/book-navigation-store";
import useBookSettingsStore from "@/stores/boook-settings";
import useTaskTypesStore from "@/stores/task-types-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import { dateToLocalDateString } from "@/utils/date-utils";
import { getTotalLines } from "@/utils/book-lines";
import { findFreeLine, findTaskLine } from "@/utils/book-navigation";
import { filterVisibleLines, resolveFilter } from "@/utils/task-types";
import { buildDayTasks } from "@/utils/day-tasks";
import React, { useState } from "react";
import { TouchableOpacity } from "react-native";

import useAgendaSectionStore from "@/stores/agenda-section-store";
import { styles } from "../bookStyles";
import AddExtraLine from "./BookAddExtraLine";
import DayTaskEditModal from "./DayTaskEditModal";

interface BookPageProps {
  readonly day: Date;
  readonly dayIndex: number;
  readonly isLeftPage?: boolean;
  readonly columns: number;
  readonly colorScheme: string;
  readonly colors: any;
  readonly dynamicStyles: any;
  // Copia solo para dibujar (la hoja que gira durante el cambio de página): no abre tareas
  // por una notificación ni monta los modales, para no duplicarlos ni cargar la animación
  readonly inert?: boolean;
  tAgenda: (key: string, options?: any) => string;
  tCommon: (key: string, options?: any) => string;
}

export default function BookPage({
  day,
  dayIndex,
  isLeftPage = false,
  columns,
  colorScheme,
  colors,
  dynamicStyles,
  inert = false,
  tAgenda,
  tCommon,
}: BookPageProps) {
  // Formatear fecha para el store usando utilidad que evita problemas de timezone
  const dateKey = dateToLocalDateString(day);

  // Estados locales
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<string>("");

  // Obtener configuración de líneas por página
  const { linesPerPage } = useBookSettingsStore();
  const linesStatus = useAgendaTasksStore((state) => state.linesStatus);

  const extraLines = linesStatus[dateKey]?.extraLines || 0;

  // Datos de los que depende lo que se ve en esta página. La instancia virtual de una
  // tarea repetida viene de una tarea de OTRO día, así que hay que suscribirse a todas
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const repeatingPatterns = useRepeatingTasksStore(
    (state) => state.repeatingPatterns
  );
  const repeatingCompletions = useRepeatingTasksStore(
    (state) => state.repeatingTaskCompletions
  );


  const toggleRepeatingTaskCompletion = useRepeatingTasksStore(
    (state) => state.toggleRepeatingTaskCompletion
  );
  const originalToggleTaskCompletion = useAgendaTasksStore(
    (state) => state.toggleTaskCompletion
  );

  // Tipos de tarea y pestaña activa. El filtro solo decide qué filas se dibujan: qué líneas están
  // ocupadas se sigue calculando con TODAS las tareas del día (allTasks), así una tarea nueva
  // nunca puede pisar una que está oculta por el filtro
  const taskTypes = useTaskTypesStore((state) => state.types);
  const activeTypeFilter = useTaskTypesStore((state) => state.activeFilter);
  const knownTypeIds = React.useMemo(
    () => new Set(taskTypes.map((type) => type.id)),
    [taskTypes]
  );
  const typeColorById = React.useMemo(
    () => new Map(taskTypes.map((type) => [type.id, type.color])),
    [taskTypes]
  );
  const typeFilter = resolveFilter(activeTypeFilter, knownTypeIds);

  // Separar tareas normales y tareas repetidas en estructuras independientes.
  // La lógica vive en utils/day-tasks.ts (compartida con el calendario y el widget)
  const { normalTasks: allTasks, repeatedTasks } = React.useMemo(
    () =>
      buildDayTasks(dateKey, tasksByDate, repeatingPatterns, repeatingCompletions),
    [dateKey, tasksByDate, repeatingPatterns, repeatingCompletions]
  );

  // Líneas que dibuja esta página: las del ajuste + las extra del día, y nunca menos que
  // la última línea con una tarea (si no, al bajar el ajuste esas tareas dejarían de verse)
  const totalUserLines = getTotalLines(allTasks, linesPerPage, extraLines);

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

  // Generar líneas para escritura (líneas normales + líneas extra + líneas virtuales para tareas repetidas)
  const generateLines = () => {
    const lines = [];

    // Líneas normales del día + líneas extra (siempre disponibles para el usuario)
    for (let i = 1; i <= totalUserLines; i++) {
      lines.push({ lineNumber: i, isVirtual: false });
    }

    // Líneas virtuales para tareas repetidas (después de las líneas normales + extra)
    for (let i = 0; i < repeatedTasks.length; i++) {
      lines.push({
        lineNumber: totalUserLines + i + 1,
        isVirtual: true,
        repeatedTaskIndex: i,
      });
    }

    return lines;
  };

  const dateInfo = formatDate(day);

  // Función para obtener tarea por línea (incluyendo líneas virtuales de tareas repetidas)
  const getTaskForPageLine = (lineNumber: number): AgendaTask | null => {
    // Primero verificar tareas normales (líneas normales + extra)
    if (allTasks[lineNumber]) {
      return allTasks[lineNumber];
    }

    // Si la línea está después de las líneas de la página, puede ser una tarea repetida virtual
    const repeatedIndex = lineNumber - totalUserLines - 1;
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

  // Si se ha pedido mostrar una tarea de este día (p. ej. al tocar una notificación) o crear una, se abre.
  // La petición se consume siempre que sea de esta página, se encuentre la tarea o no
  const bookTarget = useBookNavigationStore((state) => state.target);
  const clearBookTarget = useBookNavigationStore((state) => state.clearTarget);
  React.useEffect(() => {
    if (inert || !bookTarget || bookTarget.date !== dateKey) return;

    clearBookTarget();
    // Sin id: se pide una tarea nueva, que va en la primera línea libre
    const line =
      bookTarget.taskId === null
        ? findFreeLine(allTasks, totalUserLines)
        : findTaskLine(bookTarget.taskId, allTasks, repeatedTasks, totalUserLines);
    if (line !== null) handleLinePress(line);
  });

  // El número del día es un atajo a ese día en la vista de año
  const openDayInYear = () => {
    const year = Number(dateKey.slice(0, 4));
    const section = useAgendaSectionStore.getState();
    section.setYearFocus({ year, scope: { kind: "day", dateKey } });
    section.showYear();
  };

  const handleCancelEdit = () => {
    setModalVisible(false);
    setEditingLine(null);
    setEditingTask("");
  };

  // Líneas que se dibujan: las libres, y las escritas que cumplen el filtro por tipo
  const visibleLines = filterVisibleLines(
    generateLines(),
    getTaskForPageLine,
    typeFilter,
    knownTypeIds
  );

  // Determinar estilo de página según el modo de vista
  let pageStyle;
  if (columns > 1) {
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
          columns > 1 ? styles.expandedPageHeader : null,
        ]}
      >
        <ThemedText
          style={[
            styles.dayName,
            columns > 1 ? styles.expandedDayName : null,
          ]}
        >
          {dateInfo.dayName}
        </ThemedText>
        <ThemedView style={styles.dateContainer}>
          <ThemedView style={styles.dayNumberContainer}>
            <TouchableOpacity
              onPress={openDayInYear}
              accessibilityRole="button"
            >
              <ThemedText
                style={[
                  styles.dayNumber,
                  dynamicStyles.dayNumber,
                  columns > 1 ? styles.expandedDayNumber : null,
                  { marginRight: 5, marginTop: 2 },
                ]}
              >
                {dateInfo.dayNumber}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedText
            style={[
              styles.monthYear,
              columns > 1 ? styles.expandedMonthYear : null,
            ]}
          >
            {dateInfo.monthName} {dateInfo.year}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Líneas de escritura como en agenda real */}
      <ThemedView style={styles.linesContainer}>
        {visibleLines.map((line, index) => {
          const prevLine = visibleLines[index - 1];
          const showSeparator = line.isVirtual && !prevLine?.isVirtual;
          const { lineNumber, isVirtual } = line;
          // Siempre usar el estilo con líneas visibles independientemente del contenido
          // Las líneas virtuales tienen un estilo diferente para indicar que son tareas repetidas
          const lineStyle = isVirtual
            ? [
                dynamicStyles.lineWithTask,
                styles.expandedLine,
                { backgroundColor: "rgba(255, 215, 0, 0.1)" },
              ]
            : [dynamicStyles.lineWithTask, styles.expandedLine];

          return (
            <React.Fragment
              key={`${dayIndex}-line-${lineNumber}-${
                isVirtual ? "virtual" : "normal"
              }`}
            >
              {showSeparator && (
                <ThemedView
                  style={{
                    height: 12,
                    marginVertical: 5,
                    marginHorizontal: 10,
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 10,
                      color:
                        colorScheme === "dark"
                          ? "rgba(255, 215, 0, 0.7)"
                          : "#1976D2",
                      textAlign: "center",
                      marginTop: -5,
                      backgroundColor:
                        colorScheme === "dark" ? "transparent" : "#fff",
                      paddingHorizontal: 5,
                    }}
                  >
                    🔄 {tCommon("taskRepeat.repeatedTasks")}
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
                  style={[
                    styles.writingLine,
                    { backgroundColor: "transparent" },
                  ]}
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
                            // Franja del color del tipo (si la tarea tiene un tipo que existe)
                            ...(typeColorById.get(task.typeId ?? "")
                              ? {
                                  borderLeftWidth: 3,
                                  borderLeftColor: typeColorById.get(task.typeId ?? ""),
                                  paddingLeft: 6,
                                }
                              : {}),
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
                              ...(columns > 1
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
                            }${task.reminder ? "⏰ " : ""}${
                              task.attachments?.length ? "📎 " : ""
                            }${task.text}`}
                          </LinkableText>
                        </ThemedView>
                      );
                    }
                    return (
                      <ThemedText
                        style={[
                          columns > 1
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

      {!inert && (
        <>
          {/* Modal para editar tareas */}
          <DayTaskEditModal
            tCommon={tCommon}
            dateKey={dateKey}
            visible={modalVisible}
            editingLine={editingLine}
            initialText={editingTask}
            onClose={handleCancelEdit}
          />
        </>
      )}

      <AddExtraLine linesPerPage={linesPerPage} date={dateKey} />
    </ThemedView>
  );
}
