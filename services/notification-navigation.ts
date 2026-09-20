import type { NotificationResponse } from "expo-notifications";
import { router } from "expo-router";
import useBookNavigationStore from "../stores/book-navigation-store";

/** Día y tarea a los que apunta una notificación */
export interface NotificationTarget {
  date: string;
  taskId: string;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isDateKey = (value: unknown): value is string =>
  typeof value === "string" && DATE_KEY.test(value);

/**
 * Lee de los datos de una notificación a qué día y tarea lleva. Devuelve null si no es una
 * notificación de tarea, o es de una versión antigua que no guardaba la fecha de la ocurrencia.
 */
export function parseNotificationTarget(
  data: Record<string, unknown> | null | undefined
): NotificationTarget | null {
  if (!data) return null;

  // Recordatorio de una tarea repetida: la fecha es la de la ocurrencia que avisa
  if (data.type === "repeated-task-reminder") {
    return typeof data.originalTaskId === "string" && isDateKey(data.occurrenceDate)
      ? { taskId: data.originalTaskId, date: data.occurrenceDate }
      : null;
  }

  // Recordatorio normal: la fecha es el día de la tarea
  if (data.type === "task-reminder") {
    return typeof data.taskId === "string" && isDateKey(data.taskDate)
      ? { taskId: data.taskId, date: data.taskDate }
      : null;
  }

  return null;
}

// Al abrir la app desde una notificación, el mismo toque puede llegar dos veces (el listener y la
// lectura de "última respuesta"); dentro de este margen se cuenta como uno solo
const SAME_TAP_WINDOW_MS = 2000;
let lastTap = { key: "", at: 0 };

/**
 * Atiende un toque en una notificación: lleva el libro al día de la tarea y la abre.
 * Devuelve true si la notificación apuntaba a una tarea y se atendió.
 */
export function handleNotificationResponse(response: NotificationResponse): boolean {
  const { notification, actionIdentifier } = response;
  const key = `${notification.request.identifier}|${actionIdentifier}`;
  const now = Date.now();

  if (key === lastTap.key && now - lastTap.at < SAME_TAP_WINDOW_MS) return false;
  lastTap = { key, at: now };

  const target = parseNotificationTarget(notification.request.content.data);
  if (!target) return false;

  // El libro recoge el destino cuando esté montado (también si la app se acaba de abrir)…
  useBookNavigationStore.getState().requestTarget(target.date, target.taskId);

  // …y si se estaba en otra pestaña, se vuelve a la agenda
  try {
    router.navigate("/(tabs)");
  } catch (error) {
    // En el arranque en frío la navegación puede no estar lista; la agenda es la pantalla inicial
    console.warn("No se pudo navegar a la agenda desde la notificación:", error);
  }

  return true;
}

/** Solo para tests: olvida el último toque */
export const resetLastNotificationTap = () => {
  lastTap = { key: "", at: 0 };
};
