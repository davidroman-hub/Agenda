import {
  enCalendarLocales,
  esCalendarLocales,
  frCalendarLocales,
  getCalendarLocale,
  itCalendarLocales,
} from "../components/calendar/calendarLocales";
import { formatDayLabel } from "../utils/year-view";

describe("getCalendarLocale", () => {
  it("devuelve los textos de cada idioma", () => {
    expect(getCalendarLocale("es")).toBe(esCalendarLocales);
    expect(getCalendarLocale("en")).toBe(enCalendarLocales);
    expect(getCalendarLocale("fr")).toBe(frCalendarLocales);
    expect(getCalendarLocale("it")).toBe(itCalendarLocales);
  });

  it("un idioma que no tenemos cae en inglés, como el calendario de la app", () => {
    for (const language of ["de", "", "pt-BR", "ES"]) expect(getCalendarLocale(language)).toBe(enCalendarLocales);
  });

  it.each([["es"], ["en"], ["fr"], ["it"]])("%s trae 12 meses y 7 días, en largo y en corto", (language) => {
    const locale = getCalendarLocale(language);
    expect(locale.monthNames).toHaveLength(12);
    expect(locale.monthNamesShort).toHaveLength(12);
    expect(locale.dayNames).toHaveLength(7);
    expect(locale.dayNamesShort).toHaveLength(7);
    for (const name of [...locale.monthNames, ...locale.dayNames]) expect(name.trim()).not.toBe("");
  });

  it("sirve para etiquetar un día en cada idioma", () => {
    // 20 de septiembre de 2026 es domingo
    expect(formatDayLabel("2026-09-20", getCalendarLocale("es"))).toBe("Dom. 20 Sep.");
    expect(formatDayLabel("2026-09-20", getCalendarLocale("it"))).toBe("Dom. 20 Set.");
    expect(formatDayLabel("2026-09-20", getCalendarLocale("en")).startsWith("Sun")).toBe(true);
  });
});
