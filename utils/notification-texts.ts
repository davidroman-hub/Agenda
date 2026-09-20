import i18n from "i18next";

type Options = Record<string, string | number>;

// Traduce en el idioma actual. Si i18next aún no ha arrancado (las notificaciones pueden
// programarse en cuanto se cargan las tareas, y i18next se inicia de forma asíncrona) o falta
// la clave, usa el texto en español: nunca debe salir una clave suelta en una notificación.
function translate(key: string, fallback: string, options: Options = {}): string {
  const fillIn = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options[name] ?? ""));

  if (!i18n.isInitialized) return fillIn(fallback);

  // eslint-disable-next-line import/no-named-as-default-member -- es la instancia global de la app
  const translated = i18n.t(`notificationTexts.${key}`, {
    ns: "common",
    defaultValue: fallback,
    ...options,
  }) as string;
  return translated || fillIn(fallback);
}

/** Textos de las notificaciones que programa la app, en el idioma que esté activo */
export const notificationTexts = {
  channelName: () => translate("channelName", "Recordatorios de tareas"),
  taskReminderTitle: () => translate("taskReminderTitle", "📋 Recordatorio de tarea"),
  taskScheduledFor: (date: string) =>
    translate("taskScheduledFor", "Tarea programada para: {{date}}", { date }),
  repeatedTaskTitle: (text: string) =>
    translate("repeatedTaskTitle", "📅 Tarea repetida: {{text}}", { text }),
  repeatedTaskBody: () =>
    translate("repeatedTaskBody", "Tienes una tarea repetida pendiente"),

  /** Idioma actual (código de 2 letras). Los avisos ya programados llevan el idioma en el que se escribieron. */
  language: () => (i18n.language ?? "").split("-")[0],
};
