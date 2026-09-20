import {
  createLocalDateFromString,
  dateToLocalDateString,
  getCurrentLocalDateString,
  migrateDateKey,
  needsDateMigration,
  normalizeISOStringToLocal,
  normalizeToLocalMidnight,
} from "../utils/date-utils";

// `npm test` ejecuta esta suite en varias zonas horarias (ver scripts/run-tests.js).
// Este test garantiza que la zona pedida se aplicó de verdad y no pasamos "en falso".
describe("zona horaria de la ejecución", () => {
  it("coincide con la pedida en TZ", () => {
    if (process.env.TZ) {
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
        process.env.TZ
      );
    }
  });
});

describe("dateToLocalDateString", () => {
  it("usa el día local aunque en UTC sea otro día", () => {
    // 19:30 local ya es "mañana" en UTC si la zona es UTC-6, y 00:30 local
    // es "ayer" en UTC si la zona es UTC+2. toISOString() fallaría en una u otra.
    expect(dateToLocalDateString(new Date(2026, 8, 20, 19, 30))).toBe(
      "2026-09-20"
    );
    expect(dateToLocalDateString(new Date(2026, 8, 20, 0, 30))).toBe(
      "2026-09-20"
    );
    expect(dateToLocalDateString(new Date(2026, 8, 20, 23, 59, 59, 999))).toBe(
      "2026-09-20"
    );
  });

  it("rellena con ceros el mes y el día", () => {
    expect(dateToLocalDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("respeta el cambio de año", () => {
    expect(dateToLocalDateString(new Date(2025, 11, 31, 23, 59))).toBe(
      "2025-12-31"
    );
    expect(dateToLocalDateString(new Date(2026, 0, 1, 0, 0))).toBe(
      "2026-01-01"
    );
  });

  it("acepta un string ISO y lo lleva a la fecha local", () => {
    const noonLocal = new Date(2026, 8, 20, 12, 0).toISOString();
    expect(dateToLocalDateString(noonLocal)).toBe("2026-09-20");
  });
});

describe("getCurrentLocalDateString", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("devuelve el día local actual, también a última hora de la tarde", () => {
    jest.setSystemTime(new Date(2026, 8, 20, 19, 30));
    expect(getCurrentLocalDateString()).toBe("2026-09-20");
  });
});

describe("createLocalDateFromString", () => {
  it("crea la medianoche local del día indicado (no la interpreta como UTC)", () => {
    const date = createLocalDateFromString("2026-09-01");
    expect([
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
    ]).toEqual([2026, 8, 1, 0, 0]);
  });

  it("es inversa de dateToLocalDateString durante años enteros (bisiesto y cambios de horario incluidos)", () => {
    for (const year of [2026, 2028]) {
      const cursor = new Date(year, 0, 1);
      while (cursor.getFullYear() === year) {
        const key = dateToLocalDateString(cursor);
        expect(dateToLocalDateString(createLocalDateFromString(key))).toBe(key);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  });
});

describe("normalizeToLocalMidnight", () => {
  it("quita la hora y conserva el día local", () => {
    const normalized = normalizeToLocalMidnight(new Date(2026, 8, 20, 19, 30));
    expect(normalized.getTime()).toBe(new Date(2026, 8, 20).getTime());
  });

  it("acepta strings", () => {
    const iso = new Date(2026, 8, 20, 12, 0).toISOString();
    expect(normalizeToLocalMidnight(iso).getTime()).toBe(
      new Date(2026, 8, 20).getTime()
    );
  });
});

describe("needsDateMigration", () => {
  it("es false para una medianoche local", () => {
    expect(needsDateMigration(new Date(2026, 8, 20).toISOString())).toBe(false);
  });

  it("es true si la fecha trae hora", () => {
    expect(needsDateMigration(new Date(2026, 8, 20, 10, 30).toISOString())).toBe(
      true
    );
  });
});

describe("normalizeISOStringToLocal", () => {
  it("devuelve la medianoche local del mismo día", () => {
    const result = normalizeISOStringToLocal(
      new Date(2026, 8, 20, 19, 30).toISOString()
    );
    expect(new Date(result).getTime()).toBe(new Date(2026, 8, 20).getTime());
  });
});

describe("migrateDateKey", () => {
  it("deja intacta una clave YYYY-MM-DD", () => {
    expect(migrateDateKey("2026-09-20")).toBe("2026-09-20");
  });

  it("convierte una clave ISO antigua a la fecha local", () => {
    const legacyKey = new Date(2026, 8, 20, 12, 0).toISOString();
    expect(migrateDateKey(legacyKey)).toBe("2026-09-20");
  });

  it("devuelve tal cual una clave que no se puede interpretar", () => {
    expect(migrateDateKey("no-es-una-fecha")).toBe("no-es-una-fecha");
  });
});
