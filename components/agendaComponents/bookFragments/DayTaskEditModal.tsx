import useAgendaTasksStore, { AgendaTask } from "@/stores/agenda-tasks-store";
import useBookSettingsStore from "@/stores/boook-settings";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import { deleteRepeatingOccurrence } from "@/services/repeating-occurrence-service";
import { Attachment } from "@/utils/attachments";
import { getTotalLines } from "@/utils/book-lines";
import { findFreeLine, findTaskLine } from "@/utils/book-navigation";
import { buildDayTasks } from "@/utils/day-tasks";
import {
  promptDeleteRepeatingOccurrence,
  promptDeleteRepeatingSeries,
} from "@/utils/repeat-delete-prompts";
import React from "react";
import TaskEditModal from "./TaskEditModal";
import { RepeatOption } from "./TaskRepeat";

// Lo que se edita: la línea de la página del día y el texto con el que arranca el borrador
export interface DayEditTarget {
  line: number;
  text: string;
}

// Línea (y texto) de una tarea de un día, o de la primera línea libre si no se da id. Lee los stores
// en el momento, para poder usarse desde un evento sin suscribirse a nada. null si no hay tarea ni hueco
export function resolveDayEditTarget(dateKey: string, taskId: string | null): DayEditTarget | null {
  const { tasksByDate, linesStatus } = useAgendaTasksStore.getState();
  const { repeatingPatterns, repeatingTaskCompletions } = useRepeatingTasksStore.getState();
  const { normalTasks, repeatedTasks } = buildDayTasks(
    dateKey,
    tasksByDate,
    repeatingPatterns,
    repeatingTaskCompletions
  );
  const totalUserLines = getTotalLines(
    normalTasks,
    useBookSettingsStore.getState().linesPerPage,
    linesStatus[dateKey]?.extraLines || 0
  );
  const line =
    taskId === null
      ? findFreeLine(normalTasks, totalUserLines)
      : findTaskLine(taskId, normalTasks, repeatedTasks, totalUserLines);
  if (line === null) return null;

  const task = normalTasks[line] ?? repeatedTasks[line - totalUserLines - 1] ?? null;
  return { line, text: task?.text ?? "" };
}

interface DayTaskEditModalProps {
  readonly dateKey: string;
  readonly visible: boolean;
  readonly editingLine: number | null;
  // Texto con el que se abrió: no sigue a la tarea mientras el modal está abierto
  readonly initialText: string;
  readonly onClose: () => void;
  readonly tCommon: (key: string, options?: any) => string;
}

// El modal de editar una tarea de un día con toda su lógica de guardar y borrar (tareas normales,
// repetidas y sus series). Lo usan la página del libro y la vista de año, para que editar desde el año
// no obligue a montar el libro
export default function DayTaskEditModal({
  dateKey,
  visible,
  editingLine,
  initialText: editingTask,
  onClose,
  tCommon,
}: DayTaskEditModalProps) {
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const linesStatus = useAgendaTasksStore((state) => state.linesStatus);
  const linesPerPage = useBookSettingsStore((state) => state.linesPerPage);
  const repeatingPatterns = useRepeatingTasksStore((state) => state.repeatingPatterns);
  const repeatingCompletions = useRepeatingTasksStore((state) => state.repeatingTaskCompletions);
  const addRepeatingPattern = useRepeatingTasksStore((state) => state.addRepeatingPattern);
  const removeRepeatingPattern = useRepeatingTasksStore((state) => state.removeRepeatingPattern);
  const toggleRepeatingTaskCompletion = useRepeatingTasksStore(
    (state) => state.toggleRepeatingTaskCompletion
  );
  const getRepeatingPatternForTask = useRepeatingTasksStore(
    (state) => state.getRepeatingPatternForTask
  );
  const getAllTasks = useAgendaTasksStore((state) => state.getAllTasks);
  const getTaskForLine = useAgendaTasksStore((state) => state.getTaskForLine);
  const addTask = useAgendaTasksStore((state) => state.addTask);
  const updateTask = useAgendaTasksStore((state) => state.updateTask);
  const deleteTask = useAgendaTasksStore((state) => state.deleteTask);
  const originalToggleTaskCompletion = useAgendaTasksStore((state) => state.toggleTaskCompletion);

  const { normalTasks: allTasks, repeatedTasks } = React.useMemo(
    () => buildDayTasks(dateKey, tasksByDate, repeatingPatterns, repeatingCompletions),
    [dateKey, tasksByDate, repeatingPatterns, repeatingCompletions]
  );
  const totalUserLines = getTotalLines(
    allTasks,
    linesPerPage,
    linesStatus[dateKey]?.extraLines || 0
  );

  // Tarea de una línea de la página (las instancias de una repetida van después de las líneas de escribir)
  const getTaskForPageLine = (lineNumber: number): AgendaTask | null => {
    if (allTasks[lineNumber]) return allTasks[lineNumber];
    const repeatedIndex = lineNumber - totalUserLines - 1;
    if (repeatedIndex >= 0 && repeatedIndex < repeatedTasks.length) {
      return repeatedTasks[repeatedIndex];
    }
    return null;
  };

  const handleToggleTaskCompletion = (date: string, lineNumber: number) => {
    const task = getTaskForPageLine(lineNumber);
    if (task?.isRepeatingTask) {
      toggleRepeatingTaskCompletion(task.repeatingTaskId!, date);
    } else if (task) {
      originalToggleTaskCompletion(date, lineNumber);
    }
  };

  const handleSaveTask = async (
    text: string,
    reminder?: string | null,
    repeat?: RepeatOption,
    typeId?: string | null,
    attachments?: Attachment[]
  ) => {
    // Los adjuntos solo se tocan si el modal los envía; una clave `undefined` borraría los que ya tiene
    const attachmentUpdate = attachments ? { attachments } : {};

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
                    typeId,
                    ...attachmentUpdate,
                  });

                  // Actualizar el patrón de repetición (la función ya maneja duplicados)
                  addRepeatingPattern({
                    originalTaskId: task.id,
                    repeatOption: repeat,
                    startDate: date,
                  });

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
            for (let i = 1; i <= totalUserLines; i++) {
              if (!allTasks[i]) {
                availableLine = i;
                break;
              }
            }
            await addTask(dateKey, availableLine, text, reminder, "none", typeId, attachments);
          }
        } else {
          // Verificar si es la tarea original de un patrón de repetición
          const existingPattern = getRepeatingPatternForTask(existingTask.id);

          if (existingPattern && existingPattern.isActive) {
            // Estamos editando la tarea original de un patrón repetido
            if (repeat && repeat !== "none") {
              // Actualizar la tarea primero
              await updateTask(dateKey, editingLine, {
                text,
                reminder,
                repeat,
                typeId,
                ...attachmentUpdate,
              });

              // Agregar/actualizar patrón de repetición (la función ya maneja duplicados)
              addRepeatingPattern({
                originalTaskId: existingTask.id,
                repeatOption: repeat,
                startDate: dateKey,
              });
            } else {
              // Convertir de repetida a normal - eliminar patrón
              removeRepeatingPattern(existingTask.id);
              await updateTask(dateKey, editingLine, {
                text,
                reminder,
                repeat: "none",
                typeId,
                ...attachmentUpdate,
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
            await updateTask(dateKey, editingLine, {
              text,
              reminder,
              repeat,
              typeId,
              ...attachmentUpdate,
            });
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
                typeId,
                ...attachmentUpdate,
              });
            }
          }
        }
      } else if (repeat && repeat !== "none") {
        // Nueva tarea repetida
        // Si estamos en una línea virtual, encontrar una línea real disponible
        let targetLine = editingLine;
        if (editingLine > totalUserLines) {
          // Buscar primera línea disponible
          for (let i = 1; i <= totalUserLines; i++) {
            if (!allTasks[i]) {
              targetLine = i;
              break;
            }
          }
        }

        // 1. Crear la tarea normal primero
        await addTask(dateKey, targetLine, text, reminder, repeat, typeId, attachments);

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
        if (editingLine > totalUserLines) {
          // Buscar primera línea disponible
          for (let i = 1; i <= totalUserLines; i++) {
            if (!allTasks[i]) {
              targetLine = i;
              break;
            }
          }
        }
        await addTask(dateKey, targetLine, text, reminder, repeat, typeId, attachments);
      }

      // No hace falta forzar nada más: la página se recalcula sola porque está
      // suscrita a las tareas, los patrones y los completados (ver buildDayTasks)
      onClose();
    }
  };

  // ¿Es una tarea que pertenece a una serie repetida? (una instancia, o la original de la serie)
  const isPartOfSeries = (task: AgendaTask | null) =>
    Boolean(
      task &&
        (task.isRepeatingTask || getRepeatingPatternForTask(task.id)?.isActive)
    );

  const closeEditModal = onClose;

  const handleDeleteTask = async () => {
    if (editingLine !== null) {
      const existingTask = getTaskForPageLine(editingLine);

      if (existingTask?.isRepeatingTask) {
        // Una ocurrencia de una serie: se pregunta si se quiere borrar solo esta,
        // esta y las siguientes, o toda la serie. Si se cancela, el modal sigue abierto.
        promptDeleteRepeatingOccurrence(tCommon, async (scope) => {
          await deleteRepeatingOccurrence(scope, existingTask.repeatingTaskId!, dateKey);
          closeEditModal();
        });
        return;
      }

      if (existingTask && isPartOfSeries(existingTask)) {
        // La tarea original de una serie: borrarla borra toda la serie, así que se confirma
        promptDeleteRepeatingSeries(tCommon, async () => {
          await deleteRepeatingOccurrence("all", existingTask.id, dateKey);
          closeEditModal();
        });
        return;
      }

      if (existingTask) {
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

      onClose();
    }
  };

  const editingTaskData = editingLine ? getTaskForPageLine(editingLine) : null;

  return (
    <TaskEditModal
      tCommon={tCommon}
      visible={visible}
      initialText={editingTask}
      initialReminder={editingTaskData?.reminder}
      initialTypeId={editingTaskData?.typeId}
      initialAttachments={editingTaskData?.attachments}
      initialRepeat={(editingTaskData?.repeat as RepeatOption | undefined) || "none"}
      onSave={handleSaveTask}
      toggleTaskCompletion={handleToggleTaskCompletion}
      date={dateKey}
      completed={editingTaskData?.completed ?? false}
      lineNumber={editingLine as number}
      onCancel={onClose}
      onDelete={editingTask ? handleDeleteTask : undefined}
      confirmDelete={!isPartOfSeries(editingTaskData)}
    />
  );
}
