import {
  addDaysToDateKey,
  daysBetweenDateKeys,
  hasOccurrencesAfterStart,
  patternOccursOn,
  shouldRepeatOnDate,
} from "../utils/repeat-utils";

// Devuelve las claves YYYY-MM-DD desde `start`, `count` días seguidos (aritmética en UTC: no depende de la zona)
const daysFrom = (start: string, count: number): string[] => {
  const [year, month, day] = start.split("-").map(Number);
  return Array.from({ length: count }, (_, offset) =>
    new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10)
  );
};

const occurrences = (option: string, start: string, count: number) =>
  daysFrom(start, count).filter((day) => shouldRepeatOnDate(option, start, day));

describe("daysBetweenDateKeys", () => {
  it("cuenta días de calendario", () => {
    expect(daysBetweenDateKeys("2026-09-01", "2026-09-01")).toBe(0);
    expect(daysBetweenDateKeys("2026-09-01", "2026-09-08")).toBe(7);
    expect(daysBetweenDateKeys("2026-09-08", "2026-09-01")).toBe(-7);
  });

  it("cruza meses y años", () => {
    expect(daysBetweenDateKeys("2025-12-30", "2026-01-02")).toBe(3);
  });

  it("no le afectan los cambios de horario de verano", () => {
    // Europa cambia de hora el 29-mar-2026 y EE. UU. el 8-mar-2026
    expect(daysBetweenDateKeys("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetweenDateKeys("2026-03-07", "2026-03-09")).toBe(2);
  });
});

describe("shouldRepeatOnDate: opciones de intervalo fijo", () => {
  it("daily: todos los días desde el inicio", () => {
    expect(occurrences("daily", "2026-09-01", 5)).toHaveLength(5);
  });

  it("twice (cada 2 días): 1, 3, 5, 7…", () => {
    expect(occurrences("twice", "2026-09-01", 8)).toEqual([
      "2026-09-01",
      "2026-09-03",
      "2026-09-05",
      "2026-09-07",
    ]);
  });

  it("three (cada 3 días): 1, 4, 7…", () => {
    expect(occurrences("three", "2026-09-01", 8)).toEqual([
      "2026-09-01",
      "2026-09-04",
      "2026-09-07",
    ]);
  });

  it("five (cada 5 días): 1, 6, 11…", () => {
    expect(occurrences("five", "2026-09-01", 12)).toEqual([
      "2026-09-01",
      "2026-09-06",
      "2026-09-11",
    ]);
  });

  it("weekly (cada 7 días): 1, 8, 15…", () => {
    expect(occurrences("weekly", "2026-09-01", 16)).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
    ]);
  });

  it("weekly sigue cayendo en el mismo día al cruzar un cambio de horario", () => {
    expect(shouldRepeatOnDate("weekly", "2026-03-01", "2026-03-29")).toBe(true);
    expect(shouldRepeatOnDate("weekly", "2026-03-01", "2026-03-28")).toBe(false);
  });
});

describe("shouldRepeatOnDate: mensual", () => {
  it("cae el mismo día del mes", () => {
    expect(shouldRepeatOnDate("monthly", "2026-09-15", "2026-10-15")).toBe(true);
    expect(shouldRepeatOnDate("monthly", "2026-09-15", "2026-10-16")).toBe(false);
  });

  it("funciona empezando el día 1 (falló en zonas UTC- al leer la fecha como UTC)", () => {
    for (const target of ["2026-10-01", "2026-11-01", "2026-12-01", "2027-01-01"]) {
      expect(shouldRepeatOnDate("monthly", "2026-09-01", target)).toBe(true);
    }
    expect(shouldRepeatOnDate("monthly", "2026-09-01", "2026-10-02")).toBe(false);
  });

  it("día 31: solo en los meses que tienen día 31", () => {
    expect(shouldRepeatOnDate("monthly", "2026-01-31", "2026-03-31")).toBe(true);
    expect(shouldRepeatOnDate("monthly", "2026-01-31", "2026-02-28")).toBe(false);
  });
});

describe("shouldRepeatOnDate: casos límite", () => {
  it("no aparece antes de la fecha de inicio", () => {
    expect(shouldRepeatOnDate("daily", "2026-09-10", "2026-09-09")).toBe(false);
    expect(shouldRepeatOnDate("monthly", "2026-09-10", "2026-08-10")).toBe(false);
  });

  it("una opción desconocida (o 'none') nunca repite", () => {
    expect(shouldRepeatOnDate("none", "2026-09-01", "2026-09-01")).toBe(false);
    expect(shouldRepeatOnDate("yearly", "2026-09-01", "2027-09-01")).toBe(false);
  });

  it("acepta una fecha de inicio ISO antigua y la interpreta en hora local", () => {
    const legacyStart = new Date(2026, 8, 1, 10, 0).toISOString();
    expect(shouldRepeatOnDate("daily", legacyStart, "2026-09-02")).toBe(true);
    expect(shouldRepeatOnDate("weekly", legacyStart, "2026-09-08")).toBe(true);
  });

  it("una fecha inválida no repite en vez de fallar", () => {
    expect(shouldRepeatOnDate("daily", "basura", "2026-09-02")).toBe(false);
    expect(shouldRepeatOnDate("monthly", "2026-09-02", "basura")).toBe(false);
  });
});

describe("addDaysToDateKey", () => {
  it("suma y resta días cruzando mes y año", () => {
    expect(addDaysToDateKey("2026-09-08", -1)).toBe("2026-09-07");
    expect(addDaysToDateKey("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysToDateKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysToDateKey("2028-02-28", 1)).toBe("2028-02-29"); // año bisiesto
    expect(addDaysToDateKey("2026-03-28", 2)).toBe("2026-03-30"); // cambio de horario en Europa
  });
});

describe("patternOccursOn", () => {
  const daily = { repeatOption: "daily", startDate: "2026-09-01" };

  it("sin fin ni exclusiones se comporta igual que shouldRepeatOnDate", () => {
    expect(patternOccursOn(daily, "2026-09-05")).toBe(true);
    expect(patternOccursOn({ repeatOption: "weekly", startDate: "2026-09-01" }, "2026-09-05")).toBe(false);
  });

  it("no ocurre después de la fecha de fin, pero sí en la propia fecha de fin", () => {
    const ended = { ...daily, endDate: "2026-09-07" };
    expect(patternOccursOn(ended, "2026-09-07")).toBe(true);
    expect(patternOccursOn(ended, "2026-09-08")).toBe(false);
    expect(patternOccursOn(ended, "2026-12-01")).toBe(false);
  });

  it("no ocurre en las fechas saltadas, y sí en las de alrededor", () => {
    const skipped = { ...daily, excludedDates: ["2026-09-04", "2026-09-06"] };
    expect(patternOccursOn(skipped, "2026-09-03")).toBe(true);
    expect(patternOccursOn(skipped, "2026-09-04")).toBe(false);
    expect(patternOccursOn(skipped, "2026-09-05")).toBe(true);
    expect(patternOccursOn(skipped, "2026-09-06")).toBe(false);
  });

  it("fin y exclusiones se combinan", () => {
    const rule = { ...daily, endDate: "2026-09-10", excludedDates: ["2026-09-05"] };
    expect(patternOccursOn(rule, "2026-09-05")).toBe(false);
    expect(patternOccursOn(rule, "2026-09-09")).toBe(true);
    expect(patternOccursOn(rule, "2026-09-11")).toBe(false);
  });

  it("endDate nulo o excludedDates vacío equivalen a no tenerlos (datos guardados antes de existir)", () => {
    expect(patternOccursOn({ ...daily, endDate: null, excludedDates: [] }, "2026-09-05")).toBe(true);
  });

  it("una saltada mensual del día 1 sigue funcionando en zonas UTC-", () => {
    const monthly = { repeatOption: "monthly", startDate: "2026-09-01", excludedDates: ["2026-11-01"] };
    expect(patternOccursOn(monthly, "2026-10-01")).toBe(true);
    expect(patternOccursOn(monthly, "2026-11-01")).toBe(false);
    expect(patternOccursOn(monthly, "2026-12-01")).toBe(true);
  });
});

describe("hasOccurrencesAfterStart", () => {
  it("una serie sin fin siempre tiene más ocurrencias", () => {
    expect(hasOccurrencesAfterStart({ repeatOption: "weekly", startDate: "2026-09-01" })).toBe(true);
  });

  it("una serie que termina el mismo día que empieza ya no tiene ocurrencias", () => {
    expect(hasOccurrencesAfterStart({ repeatOption: "daily", startDate: "2026-09-01", endDate: "2026-09-01" })).toBe(false);
  });

  it("una semanal cortada antes de su segunda ocurrencia ya no tiene más", () => {
    expect(hasOccurrencesAfterStart({ repeatOption: "weekly", startDate: "2026-09-01", endDate: "2026-09-07" })).toBe(false);
    expect(hasOccurrencesAfterStart({ repeatOption: "weekly", startDate: "2026-09-01", endDate: "2026-09-08" })).toBe(true);
  });

  it("si se han saltado todas las que quedaban, tampoco tiene más", () => {
    const rule = { repeatOption: "daily", startDate: "2026-09-01", endDate: "2026-09-03", excludedDates: ["2026-09-02", "2026-09-03"] };
    expect(hasOccurrencesAfterStart(rule)).toBe(false);
    expect(hasOccurrencesAfterStart({ ...rule, excludedDates: ["2026-09-02"] })).toBe(true);
  });
});
