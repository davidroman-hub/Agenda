import enCommon from "../locales/en/common.json";
import esCommon from "../locales/es/common.json";
import frCommon from "../locales/fr/common.json";
import itCommon from "../locales/it/common.json";

const resources = {
  es: { common: esCommon },
  en: { common: enCommon },
  fr: { common: frCommon },
  it: { common: itCommon },
};

// Módulos nuevos en cada test: i18next empieza sin arrancar, como en los primeros instantes de la app
const load = async (options: { init?: boolean; language?: string; withResources?: typeof resources } = {}) => {
  const { init = true, language = "es", withResources = resources } = options;
  jest.resetModules();

  const i18nModule = require("i18next");
  const i18n = i18nModule.default ?? i18nModule;
  if (init) {
    await i18n.init({
      lng: language,
      fallbackLng: "en",
      defaultNS: "common",
      resources: withResources,
      interpolation: { escapeValue: false },
    });
  }
  const { notificationTexts } = require("../utils/notification-texts");
  return { i18n, notificationTexts };
};

describe("textos de las notificaciones", () => {
  it.each([
    ["es", "📋 Recordatorio de tarea", "📅 Tarea repetida: Regar", "Tarea programada para: 2026-09-04", "Tienes una tarea repetida pendiente", "Recordatorios de tareas"],
    ["en", "📋 Task reminder", "📅 Repeating task: Regar", "Task scheduled for: 2026-09-04", "You have a repeating task pending", "Task reminders"],
    ["fr", "📋 Rappel de tâche", "📅 Tâche récurrente : Regar", "Tâche prévue pour : 2026-09-04", "Vous avez une tâche récurrente en attente", "Rappels de tâches"],
    ["it", "📋 Promemoria attività", "📅 Attività ripetuta: Regar", "Attività prevista per: 2026-09-04", "Hai un'attività ripetuta in sospeso", "Promemoria attività"],
  ])("%s: todos los textos salen en ese idioma y con sus datos", async (language, reminder, repeatedTitle, scheduledFor, repeatedBody, channel) => {
    const { notificationTexts } = await load({ language });

    expect(notificationTexts.taskReminderTitle()).toBe(reminder);
    expect(notificationTexts.repeatedTaskTitle("Regar")).toBe(repeatedTitle);
    expect(notificationTexts.taskScheduledFor("2026-09-04")).toBe(scheduledFor);
    expect(notificationTexts.repeatedTaskBody()).toBe(repeatedBody);
    expect(notificationTexts.channelName()).toBe(channel);
    expect(notificationTexts.language()).toBe(language);
  });

  it("al cambiar de idioma los textos cambian", async () => {
    const { i18n, notificationTexts } = await load({ language: "es" });
    expect(notificationTexts.taskReminderTitle()).toBe("📋 Recordatorio de tarea");

    await i18n.changeLanguage("en");

    expect(notificationTexts.taskReminderTitle()).toBe("📋 Task reminder");
  });

  it("un texto de la tarea con llaves o símbolos sale tal cual, sin escapar", async () => {
    const { notificationTexts } = await load({ language: "en" });

    expect(notificationTexts.repeatedTaskTitle("Pan & leche {{x}}")).toBe("📅 Repeating task: Pan & leche {{x}}");
  });

  it("los idiomas con región (es-MX) usan el idioma base", async () => {
    const { i18n, notificationTexts } = await load({ language: "es" });
    await i18n.changeLanguage("es-MX");

    expect(notificationTexts.language()).toBe("es");
  });

  describe("cuando i18next aún no ha arrancado", () => {
    it("usa el español, con los datos rellenados, en vez de dejar una clave suelta", async () => {
      const { notificationTexts } = await load({ init: false });

      expect(notificationTexts.taskReminderTitle()).toBe("📋 Recordatorio de tarea");
      expect(notificationTexts.repeatedTaskTitle("Regar")).toBe("📅 Tarea repetida: Regar");
      expect(notificationTexts.taskScheduledFor("2026-09-04")).toBe("Tarea programada para: 2026-09-04");
      expect(notificationTexts.language()).toBe("");
    });
  });

  describe("cuando falta la traducción", () => {
    it("usa el español en vez de la clave", async () => {
      const withoutTexts = { es: { common: {} }, en: { common: {} } } as unknown as typeof resources;
      const { notificationTexts } = await load({ language: "en", withResources: withoutTexts });

      expect(notificationTexts.taskReminderTitle()).toBe("📋 Recordatorio de tarea");
      expect(notificationTexts.repeatedTaskTitle("Regar")).toBe("📅 Tarea repetida: Regar");
    });
  });

  it("las cinco claves existen en los cuatro idiomas y ninguna está vacía", () => {
    const keys = ["channelName", "taskReminderTitle", "taskScheduledFor", "repeatedTaskTitle", "repeatedTaskBody"];
    for (const { common } of Object.values(resources)) {
      const group = (common as unknown as { notificationTexts: Record<string, string> }).notificationTexts;
      expect(Object.keys(group).sort()).toEqual([...keys].sort());
      for (const key of keys) expect(group[key].trim().length).toBeGreaterThan(0);
    }
  });
});
