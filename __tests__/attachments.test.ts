import {
  Attachment,
  attachmentFileNames,
  buildStoredFileName,
  createAttachmentId,
  draftAddedFileNames,
  formatFileSize,
  getAttachmentKind,
  getExtension,
  guessMimeType,
  isStoredFileName,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ITEM,
  normalizeAttachments,
  ORPHAN_GRACE_MS,
  orphanFileNames,
  parseAttachmentTimestamp,
  removedFileNames,
  sanitizeDisplayName,
  taskAttachmentFileNames,
  unreferencedFileNames,
  validateNewAttachment,
} from "../utils/attachments";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 20, 12, 0, 0);

// Ficha de prueba cuyo archivo se creó hace `ageMs`
const attachmentAged = (ageMs: number, name = "doc.pdf", random = 0.5): Attachment => {
  const id = createAttachmentId(NOW - ageMs, random);
  return {
    id,
    name,
    fileName: buildStoredFileName(id, name),
    mimeType: guessMimeType(name),
    size: 1000,
    addedAt: new Date(NOW - ageMs).toISOString(),
  };
};

describe("getExtension", () => {
  it("devuelve la extensión en minúsculas y sin punto", () => {
    expect(getExtension("Foto.JPG")).toBe("jpg");
    expect(getExtension("informe.final.PDF")).toBe("pdf");
  });

  it("no inventa extensión cuando no la hay", () => {
    expect(getExtension("archivo")).toBe("");
    expect(getExtension(".bashrc")).toBe("");
    expect(getExtension("termina.")).toBe("");
  });

  it("descarta caracteres raros y acota el largo", () => {
    expect(getExtension("a.p d/f")).toBe("pdf");
    expect(getExtension("a.abcdefghijklmnop")).toBe("abcdefgh");
  });
});

describe("guessMimeType", () => {
  it("prefiere el tipo del selector si es útil", () => {
    expect(guessMimeType("x.bin", "Image/PNG")).toBe("image/png");
  });

  it("si el selector solo dice octet-stream o nada, se deduce de la extensión", () => {
    expect(guessMimeType("a.pdf", "application/octet-stream")).toBe("application/pdf");
    expect(guessMimeType("a.PNG", null)).toBe("image/png");
    expect(guessMimeType("a.docx", "")).toContain("wordprocessingml");
  });

  it("una extensión desconocida queda como genérica", () => {
    expect(guessMimeType("a.xyz")).toBe("application/octet-stream");
    expect(guessMimeType("sin-extension")).toBe("application/octet-stream");
  });
});

describe("getAttachmentKind", () => {
  it("distingue imagen, PDF y otros", () => {
    expect(getAttachmentKind({ mimeType: "image/heic", name: "a" })).toBe("image");
    expect(getAttachmentKind({ mimeType: "application/pdf", name: "a" })).toBe("pdf");
    expect(getAttachmentKind({ mimeType: "application/zip", name: "a.zip" })).toBe("other");
  });

  it("un PDF con tipo genérico se reconoce por su extensión", () => {
    expect(getAttachmentKind({ mimeType: "application/octet-stream", name: "Factura.PDF" })).toBe("pdf");
  });

  it("no depende de mayúsculas en el tipo", () => {
    expect(getAttachmentKind({ mimeType: "IMAGE/JPEG", name: "a" })).toBe("image");
  });
});

describe("sanitizeDisplayName", () => {
  it("quita rutas, caracteres de control y espacios de más", () => {
    expect(sanitizeDisplayName("C:\\Users\\yo\\mi   archivo.pdf")).toBe("mi archivo.pdf");
    expect(sanitizeDisplayName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeDisplayName("a\u0000b\nc.txt")).toBe("abc.txt");
  });

  it("usa el nombre de reserva si no queda nada", () => {
    expect(sanitizeDisplayName("   ")).toBe("file");
    expect(sanitizeDisplayName("folder/", "archivo")).toBe("archivo");
  });

  it("al recortar conserva la extensión y el largo total", () => {
    const result = sanitizeDisplayName(`${"a".repeat(300)}.pdf`);
    expect(result.length).toBeLessThanOrEqual(120);
    expect(result.endsWith("….pdf")).toBe(true);
  });

  it("no toca un nombre que cabe", () => {
    expect(sanitizeDisplayName("Contrato 2026.pdf")).toBe("Contrato 2026.pdf");
  });
});

describe("nombres de archivo guardado", () => {
  it("el id sale del instante y del azar, con relleno fijo", () => {
    expect(createAttachmentId(0, 0)).toBe("att_0_000000");
    expect(createAttachmentId(36, 0.999999999)).toMatch(/^att_10_[0-9a-z]{6}$/);
  });

  it("ids distintos con el mismo instante pero distinto azar", () => {
    expect(createAttachmentId(NOW, 0.1)).not.toBe(createAttachmentId(NOW, 0.2));
  });

  it("buildStoredFileName conserva la extensión del original", () => {
    expect(buildStoredFileName("att_1_a", "Mi Foto.JPG")).toBe("att_1_a.jpg");
    expect(buildStoredFileName("att_1_a", "sin-extension")).toBe("att_1_a");
  });

  it("isStoredFileName solo acepta los nombres que genera la app", () => {
    const id = createAttachmentId(NOW, 0.3);
    expect(isStoredFileName(`${id}.pdf`)).toBe(true);
    expect(isStoredFileName(id)).toBe(true);
  });

  it.each([
    "../att_1_a.pdf",
    "att_1_a/../../x",
    "carpeta/att_1_a.pdf",
    "att_1_a.pdf/",
    "att_1_a.",
    "foto.jpg",
    "",
    "ATT_1_A.pdf",
    "att_1_a.p d f",
  ])("isStoredFileName rechaza %j", (name) => {
    expect(isStoredFileName(name)).toBe(false);
  });

  it("isStoredFileName rechaza lo que no es texto", () => {
    expect(isStoredFileName(undefined)).toBe(false);
    expect(isStoredFileName(null)).toBe(false);
    expect(isStoredFileName(42)).toBe(false);
  });

  it("parseAttachmentTimestamp recupera el instante de creación", () => {
    const id = createAttachmentId(NOW, 0.9);
    expect(parseAttachmentTimestamp(`${id}.png`)).toBe(NOW);
    expect(parseAttachmentTimestamp(id)).toBe(NOW);
  });

  it("parseAttachmentTimestamp devuelve null para archivos ajenos", () => {
    expect(parseAttachmentTimestamp("foto.jpg")).toBeNull();
    expect(parseAttachmentTimestamp("../att_1_a")).toBeNull();
  });
});

describe("validateNewAttachment", () => {
  it("acepta un archivo normal", () => {
    expect(validateNewAttachment({ size: 1024, existingCount: 0 })).toBeNull();
  });

  it("rechaza vacíos y tamaños que no son números", () => {
    expect(validateNewAttachment({ size: 0, existingCount: 0 })).toBe("empty");
    expect(validateNewAttachment({ size: Number.NaN, existingCount: 0 })).toBe("empty");
    expect(validateNewAttachment({ size: -5, existingCount: 0 })).toBe("empty");
  });

  it("el límite de tamaño es inclusivo", () => {
    expect(validateNewAttachment({ size: MAX_ATTACHMENT_BYTES, existingCount: 0 })).toBeNull();
    expect(validateNewAttachment({ size: MAX_ATTACHMENT_BYTES + 1, existingCount: 0 })).toBe("too-large");
  });

  it("el máximo de adjuntos por elemento se respeta", () => {
    expect(validateNewAttachment({ size: 10, existingCount: MAX_ATTACHMENTS_PER_ITEM - 1 })).toBeNull();
    expect(validateNewAttachment({ size: 10, existingCount: MAX_ATTACHMENTS_PER_ITEM })).toBe("too-many");
  });

  it("si hay demasiados, se avisa de eso antes que del tamaño", () => {
    expect(validateNewAttachment({ size: MAX_ATTACHMENT_BYTES * 2, existingCount: MAX_ATTACHMENTS_PER_ITEM })).toBe(
      "too-many"
    );
  });
});

describe("formatFileSize", () => {
  it.each([
    [0, "0 B"],
    [Number.NaN, "0 B"],
    [512, "512 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [1024 * 1024, "1 MB"],
    [25 * 1024 * 1024, "25 MB"],
    [1024 ** 3, "1 GB"],
    [5 * 1024 ** 4, "5120 GB"],
  ])("%p → %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe("archivos en uso", () => {
  const a = attachmentAged(DAY, "a.pdf", 0.1);
  const b = attachmentAged(DAY, "b.png", 0.2);
  const c = attachmentAged(DAY, "c.txt", 0.3);

  it("attachmentFileNames reúne los archivos de todas las fichas", () => {
    const names = attachmentFileNames([{ attachments: [a, b] }, { attachments: [c] }, {}, null, undefined]);
    expect([...names].sort()).toEqual([a.fileName, b.fileName, c.fileName].sort());
  });

  it("attachmentFileNames ignora fichas con nombre de archivo inseguro", () => {
    const bad = { ...a, fileName: "../../secreto" };
    expect(attachmentFileNames([{ attachments: [bad, b] }])).toEqual(new Set([b.fileName]));
  });

  it("taskAttachmentFileNames recorre todos los días y líneas", () => {
    const names = taskAttachmentFileNames({
      "2026-09-20": { 1: { attachments: [a] }, 2: null, 3: {} },
      "2026-09-21": { 1: { attachments: [b, c] } },
    });
    expect(names.size).toBe(3);
    expect(names.has(a.fileName)).toBe(true);
    expect(names.has(c.fileName)).toBe(true);
  });

  it("removedFileNames devuelve solo lo que ha desaparecido", () => {
    const before = new Set(["x", "y", "z"]);
    expect(removedFileNames(before, new Set(["y", "nuevo"]))).toEqual(["x", "z"]);
    expect(removedFileNames(before, before)).toEqual([]);
  });

  it("unreferencedFileNames respeta lo que otra ficha sigue usando", () => {
    const inUse = new Set([b.fileName]);
    expect(unreferencedFileNames([a.fileName, b.fileName], inUse)).toEqual([a.fileName]);
  });

  it("unreferencedFileNames nunca propone nombres que no son nuestros", () => {
    expect(unreferencedFileNames(["../x", "foto.jpg", a.fileName], new Set())).toEqual([a.fileName]);
  });

  it("unreferencedFileNames no repite candidatos", () => {
    expect(unreferencedFileNames([a.fileName, a.fileName], new Set())).toEqual([a.fileName]);
  });
});

describe("orphanFileNames", () => {
  const inUse = attachmentAged(30 * DAY, "usado.pdf", 0.1);
  const oldOrphan = attachmentAged(3 * DAY, "viejo.pdf", 0.2);
  const recentOrphan = attachmentAged(DAY / 2, "reciente.pdf", 0.3);

  const stored = [inUse.fileName, oldOrphan.fileName, recentOrphan.fileName];
  const live = new Set([inUse.fileName]);

  it("propone solo lo que nadie usa y lleva más tiempo que el margen", () => {
    expect(orphanFileNames({ stored, inUse: live, now: NOW })).toEqual([oldOrphan.fileName]);
  });

  it("respeta a los archivos recientes (pueden ser de un borrador abierto)", () => {
    expect(orphanFileNames({ stored: [recentOrphan.fileName], inUse: live, now: NOW })).toEqual([]);
  });

  it("el margen es exclusivo: justo en el límite todavía no", () => {
    const edge = attachmentAged(ORPHAN_GRACE_MS, "borde.pdf", 0.4);
    expect(orphanFileNames({ stored: [edge.fileName], inUse: live, now: NOW })).toEqual([]);
    const past = attachmentAged(ORPHAN_GRACE_MS + 1, "pasado.pdf", 0.5);
    expect(orphanFileNames({ stored: [past.fileName], inUse: live, now: NOW })).toEqual([past.fileName]);
  });

  it("con un margen propio", () => {
    expect(orphanFileNames({ stored: [recentOrphan.fileName], inUse: live, now: NOW, graceMs: 1000 })).toEqual([
      recentOrphan.fileName,
    ]);
  });

  it("NO propone borrar nada si no hay ningún archivo en uso (almacenamiento sin leer)", () => {
    expect(orphanFileNames({ stored, inUse: new Set(), now: NOW })).toEqual([]);
  });

  it("no toca archivos que no llevan nuestro nombre", () => {
    expect(orphanFileNames({ stored: ["foto.jpg", "notas.txt", ".nomedia"], inUse: live, now: NOW })).toEqual([]);
  });
});

describe("draftAddedFileNames", () => {
  const original = attachmentAged(DAY, "orig.pdf", 0.1);
  const added = attachmentAged(0, "nuevo.png", 0.2);

  it("devuelve solo lo añadido durante la edición", () => {
    expect(draftAddedFileNames([original], [original, added])).toEqual([added.fileName]);
  });

  it("si se quitó un original y no se añadió nada, no hay nada que tirar", () => {
    expect(draftAddedFileNames([original], [])).toEqual([]);
  });

  it("una tarea sin adjuntos: todo lo del borrador es nuevo", () => {
    expect(draftAddedFileNames(undefined, [added])).toEqual([added.fileName]);
    expect(draftAddedFileNames(null, [added])).toEqual([added.fileName]);
  });
});

describe("normalizeAttachments", () => {
  const good = attachmentAged(DAY, "ok.pdf", 0.1);

  it("deja pasar las fichas válidas", () => {
    expect(normalizeAttachments([good])).toEqual([good]);
  });

  it("descarta las que no se pueden usar con seguridad", () => {
    expect(
      normalizeAttachments([
        good,
        { ...good, fileName: "../../data" },
        { ...good, id: 5 },
        { name: "solo nombre" },
        null,
        "texto",
      ])
    ).toEqual([good]);
  });

  it("todo lo que no sea una lista queda vacío", () => {
    expect(normalizeAttachments(undefined)).toEqual([]);
    expect(normalizeAttachments(null)).toEqual([]);
    expect(normalizeAttachments({ 0: good })).toEqual([]);
  });
});
