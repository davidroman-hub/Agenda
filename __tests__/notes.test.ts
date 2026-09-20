import { Attachment, buildStoredFileName, createAttachmentId } from "../utils/attachments";
import {
  columnsForWidth,
  DEFAULT_NOTE_COLOR,
  estimateNoteHeight,
  firstImageAttachment,
  isNoteColorId,
  isNoteEmpty,
  MAX_NOTE_LENGTH,
  Note,
  NOTE_CARD_MAX_LINES,
  NOTE_COLORS,
  noteColorHex,
  normalizeNotes,
  noteRotation,
  sanitizeNoteText,
  sortNotes,
  splitIntoColumns,
} from "../utils/notes";

const attachment = (name: string, mimeType: string, seed = 0.5): Attachment => {
  const id = createAttachmentId(1_700_000_000_000, seed);
  return { id, name, fileName: buildStoredFileName(id, name), mimeType, size: 100, addedAt: "2026-09-20T00:00:00.000Z" };
};

const note = (overrides: Partial<Note> = {}): Note => ({
  id: "note-1",
  text: "Comprar pilas",
  color: "yellow",
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
  ...overrides,
});

describe("colores", () => {
  it("todos los colores de la paleta tienen id único y un hex válido", () => {
    expect(new Set(NOTE_COLORS.map((color) => color.id)).size).toBe(NOTE_COLORS.length);
    for (const { hex } of NOTE_COLORS) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("el color por defecto existe en la paleta", () => {
    expect(isNoteColorId(DEFAULT_NOTE_COLOR)).toBe(true);
  });

  it("isNoteColorId solo acepta ids de la paleta", () => {
    expect(isNoteColorId("pink")).toBe(true);
    expect(isNoteColorId("#FF9EBB")).toBe(false);
    expect(isNoteColorId("magenta")).toBe(false);
    expect(isNoteColorId(undefined)).toBe(false);
  });

  it("noteColorHex devuelve el de cada id y el amarillo si no es válido", () => {
    expect(noteColorHex("blue")).toBe(NOTE_COLORS.find((color) => color.id === "blue")!.hex);
    expect(noteColorHex("nope")).toBe(noteColorHex("yellow"));
    expect(noteColorHex(undefined)).toBe(noteColorHex("yellow"));
    expect(noteColorHex(null)).toBe(noteColorHex("yellow"));
  });
});

describe("sanitizeNoteText", () => {
  it("quita los espacios de los extremos y normaliza los saltos de línea", () => {
    expect(sanitizeNoteText("  hola\r\nmundo \n")).toBe("hola\nmundo");
  });

  it("respeta los saltos de línea de dentro", () => {
    expect(sanitizeNoteText("a\n\nb")).toBe("a\n\nb");
  });

  it("acota el largo", () => {
    expect(sanitizeNoteText("x".repeat(MAX_NOTE_LENGTH + 500))).toHaveLength(MAX_NOTE_LENGTH);
  });

  it("lo que no es texto queda vacío", () => {
    expect(sanitizeNoteText(undefined)).toBe("");
    expect(sanitizeNoteText(42)).toBe("");
    expect(sanitizeNoteText(null)).toBe("");
  });
});

describe("isNoteEmpty", () => {
  it("una nota sin texto ni archivos está vacía", () => {
    expect(isNoteEmpty({ text: "" })).toBe(true);
    expect(isNoteEmpty({ text: "   \n " })).toBe(true);
    expect(isNoteEmpty({ text: undefined, attachments: [] })).toBe(true);
    expect(isNoteEmpty({})).toBe(true);
  });

  it("con texto no lo está", () => {
    expect(isNoteEmpty({ text: "a" })).toBe(false);
  });

  it("con solo un archivo tampoco (una nota puede ser solo una foto)", () => {
    expect(isNoteEmpty({ text: "", attachments: [attachment("a.png", "image/png")] })).toBe(false);
  });
});

describe("noteRotation", () => {
  it("es siempre la misma para la misma nota", () => {
    expect(noteRotation("note-abc")).toBe(noteRotation("note-abc"));
  });

  it("es pequeña: entre -2,5° y 2,5°, en pasos de medio grado", () => {
    for (let index = 0; index < 300; index++) {
      const rotation = noteRotation(`note-${index}-${index * 7919}`);
      expect(Math.abs(rotation)).toBeLessThanOrEqual(2.5);
      expect(Math.abs((rotation * 2) % 1)).toBe(0);
    }
  });

  it("no da el mismo ángulo a todas (si no, el tablero no parecería de papelitos)", () => {
    const angles = new Set(Array.from({ length: 60 }, (_, index) => noteRotation(`note-${index}`)));
    expect(angles.size).toBeGreaterThan(4);
  });

  it("aguanta un id vacío", () => {
    expect(Number.isFinite(noteRotation(""))).toBe(true);
  });
});

describe("sortNotes", () => {
  it("las más recientes primero", () => {
    const old = note({ id: "a", createdAt: "2026-01-01T00:00:00.000Z" });
    const recent = note({ id: "b", createdAt: "2026-09-01T00:00:00.000Z" });
    const middle = note({ id: "c", createdAt: "2026-05-01T00:00:00.000Z" });
    expect(sortNotes([old, recent, middle]).map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("a igualdad de fecha, por id (orden estable)", () => {
    const same = "2026-09-20T10:00:00.000Z";
    const notes = [note({ id: "z", createdAt: same }), note({ id: "a", createdAt: same })];
    expect(sortNotes(notes).map((item) => item.id)).toEqual(["a", "z"]);
  });

  it("una fecha rota va al final, sin descolocar el resto", () => {
    const broken = note({ id: "x", createdAt: "no es una fecha" });
    const good = note({ id: "y" });
    expect(sortNotes([broken, good]).map((item) => item.id)).toEqual(["y", "x"]);
  });

  it("no modifica la lista original", () => {
    const original = [note({ id: "a", createdAt: "2026-01-01T00:00:00.000Z" }), note({ id: "b" })];
    const copy = [...original];
    sortNotes(original);
    expect(original).toEqual(copy);
  });
});

describe("firstImageAttachment", () => {
  it("devuelve la primera imagen aunque haya otros archivos antes", () => {
    const pdf = attachment("a.pdf", "application/pdf", 0.1);
    const first = attachment("b.png", "image/png", 0.2);
    const second = attachment("c.jpg", "image/jpeg", 0.3);
    expect(firstImageAttachment([pdf, first, second])).toBe(first);
  });

  it("null si no hay ninguna imagen o no hay adjuntos", () => {
    expect(firstImageAttachment([attachment("a.pdf", "application/pdf")])).toBeNull();
    expect(firstImageAttachment([])).toBeNull();
    expect(firstImageAttachment(undefined)).toBeNull();
    expect(firstImageAttachment(null)).toBeNull();
  });
});

describe("normalizeNotes", () => {
  it("deja pasar las notas válidas tal cual", () => {
    const valid = note({ attachments: [attachment("a.png", "image/png")] });
    expect(normalizeNotes([valid])).toEqual([valid]);
  });

  it("todo lo que no sea una lista queda vacío", () => {
    expect(normalizeNotes(undefined)).toEqual([]);
    expect(normalizeNotes(null)).toEqual([]);
    expect(normalizeNotes({ 0: note() })).toEqual([]);
    expect(normalizeNotes("texto")).toEqual([]);
  });

  it("descarta lo que no es una nota", () => {
    expect(normalizeNotes([null, 5, "x", [], { text: "sin id" }, { id: "", text: "id vacío" }, { id: 7, text: "id no texto" }])).toEqual([]);
  });

  it("descarta notas vacías, pero no las que solo llevan un archivo", () => {
    const onlyFile = { id: "solo-archivo", text: "  ", createdAt: "2026-09-20T10:00:00.000Z", attachments: [attachment("a.png", "image/png")] };
    const result = normalizeNotes([{ id: "vacia", text: " \n " }, onlyFile]);
    expect(result.map((item) => item.id)).toEqual(["solo-archivo"]);
  });

  it("un color desconocido pasa al amarillo", () => {
    expect(normalizeNotes([note({ color: "morado" as never })])[0].color).toBe(DEFAULT_NOTE_COLOR);
    expect(normalizeNotes([{ id: "a", text: "x" }])[0].color).toBe(DEFAULT_NOTE_COLOR);
  });

  it("rellena las fechas que falten con las que haya, o con la época", () => {
    const [onlyUpdated] = normalizeNotes([{ id: "a", text: "x", updatedAt: "2026-02-02T00:00:00.000Z" }]);
    expect(onlyUpdated.createdAt).toBe("2026-02-02T00:00:00.000Z");

    const [none] = normalizeNotes([{ id: "b", text: "x" }]);
    expect(none.createdAt).toBe(new Date(0).toISOString());
    expect(none.updatedAt).toBe(new Date(0).toISOString());
  });

  it("quita los adjuntos con nombre de archivo inseguro, y la clave si no queda ninguno", () => {
    const bad = { ...attachment("a.png", "image/png"), fileName: "../../secreto" };
    const [result] = normalizeNotes([{ ...note(), attachments: [bad] }]);
    expect("attachments" in result).toBe(false);
  });

  it("quita los ids repetidos y se queda con el primero", () => {
    const result = normalizeNotes([note({ id: "dup", text: "primera" }), note({ id: "dup", text: "segunda" })]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("primera");
  });

  it("acota y limpia el texto guardado", () => {
    const [result] = normalizeNotes([note({ text: `  ${"x".repeat(MAX_NOTE_LENGTH + 10)}  ` })]);
    expect(result.text).toHaveLength(MAX_NOTE_LENGTH);
  });
});

describe("columnsForWidth", () => {
  it.each([
    [320, 2],
    [599, 2],
    [600, 3],
    [899, 3],
    [900, 4],
    [1400, 4],
  ])("ancho %p → %p columnas", (width, columns) => {
    expect(columnsForWidth(width)).toBe(columns);
  });

  it("un ancho raro no rompe el tablero", () => {
    expect(columnsForWidth(Number.NaN)).toBe(2);
    expect(columnsForWidth(0)).toBe(2);
    expect(columnsForWidth(-5)).toBe(2);
  });
});

describe("estimateNoteHeight", () => {
  it("una nota corta es más baja que una larga", () => {
    expect(estimateNoteHeight({ text: "hola" }, false)).toBeLessThan(estimateNoteHeight({ text: "x".repeat(150) }, false));
  });

  it("cuenta cada salto de línea como una línea", () => {
    expect(estimateNoteHeight({ text: "a\nb\nc" }, false)).toBeGreaterThan(estimateNoteHeight({ text: "abc" }, false));
  });

  it("el texto largo se acota a las líneas que caben en la tarjeta", () => {
    const capped = estimateNoteHeight({ text: "x".repeat(5000) }, false);
    const atLimit = estimateNoteHeight({ text: "x".repeat(20 * NOTE_CARD_MAX_LINES) }, false);
    expect(capped).toBe(atLimit);
  });

  it("la vista previa de imagen suma alto", () => {
    expect(estimateNoteHeight({ text: "a" }, true)).toBeGreaterThan(estimateNoteHeight({ text: "a" }, false));
  });

  it("la fila de otros archivos suma alto, pero una sola imagen (ya mostrada) no", () => {
    const image = attachment("a.png", "image/png", 0.1);
    const pdf = attachment("a.pdf", "application/pdf", 0.2);
    const onlyPreview = estimateNoteHeight({ text: "a", attachments: [image] }, true);
    const previewAndPdf = estimateNoteHeight({ text: "a", attachments: [image, pdf] }, true);
    expect(previewAndPdf).toBeGreaterThan(onlyPreview);
    expect(estimateNoteHeight({ text: "a", attachments: [pdf] }, false)).toBeGreaterThan(estimateNoteHeight({ text: "a" }, false));
  });
});

describe("splitIntoColumns", () => {
  const heights: Record<string, number> = { a: 100, b: 100, c: 100, d: 100, tall: 400, s1: 50, s2: 50, s3: 50 };
  const heightOf = (name: string) => heights[name];

  it("con alturas iguales reparte por turnos", () => {
    expect(splitIntoColumns(["a", "b", "c", "d"], 2, heightOf)).toEqual([["a", "c"], ["b", "d"]]);
  });

  it("mete lo siguiente en la columna más baja", () => {
    // "tall" ocupa la columna 0 sola; las tres pequeñas caben en la 1 antes de llegar a 400
    expect(splitIntoColumns(["tall", "s1", "s2", "s3"], 2, heightOf)).toEqual([["tall"], ["s1", "s2", "s3"]]);
  });

  it("no pierde ni repite ninguna nota", () => {
    const items = Array.from({ length: 23 }, (_, index) => `n${index}`);
    const columns = splitIntoColumns(items, 3, (name) => 40 + (name.length * 13) % 90);
    expect(columns.flat().sort()).toEqual([...items].sort());
  });

  it("conserva el orden de entrada dentro de cada columna", () => {
    const items = ["a", "b", "c", "d", "s1", "s2"];
    for (const column of splitIntoColumns(items, 2, heightOf)) {
      const positions = column.map((name) => items.indexOf(name));
      expect(positions).toEqual([...positions].sort((x, y) => x - y));
    }
  });

  it("siempre devuelve tantas columnas como se piden, aunque sobren", () => {
    expect(splitIntoColumns(["a"], 4, heightOf)).toEqual([["a"], [], [], []]);
    expect(splitIntoColumns([], 3, heightOf)).toEqual([[], [], []]);
  });

  it("un número de columnas raro se corrige a una", () => {
    expect(splitIntoColumns(["a", "b"], 0, heightOf)).toEqual([["a", "b"]]);
    expect(splitIntoColumns(["a", "b"], Number.NaN, heightOf)).toEqual([["a", "b"]]);
  });
});
