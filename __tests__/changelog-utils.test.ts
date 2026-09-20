import { changeLogLocales } from "../components/settings/changeLogLocales";
import { getChangelogForVersion } from "../utils/changelog-utils";

const SAMPLE = [
  "🚀 **Version 2.0.0 - Grande**",
  "• Novedad A",
  "• Novedad B",
  "",
  "� **Version 1.9.0 - Anterior**", // el emoji de algunas cabeceras del changelog real está corrupto
  "• Cosa antigua",
  "",
  "🌍 **Previous Features (v1.8.0):**", // menciona una versión, pero no es una cabecera
  "• Otra cosa",
].join("\n");

describe("getChangelogForVersion", () => {
  it("devuelve el bloque de una versión sin invadir la siguiente", () => {
    const block = getChangelogForVersion(SAMPLE, "2.0.0");
    expect(block).toContain("Novedad A");
    expect(block).toContain("Novedad B");
    expect(block).not.toContain("Cosa antigua");
    expect(block).not.toContain("1.9.0");
  });

  it("acepta cabeceras con el emoji corrupto y llega hasta el final del texto", () => {
    const block = getChangelogForVersion(SAMPLE, "1.9.0");
    expect(block).toContain("Cosa antigua");
    // "(v1.8.0)" no es una cabecera de versión, así que pertenece al bloque 1.9.0
    expect(block).toContain("Otra cosa");
  });

  it("devuelve null si la versión no tiene entrada", () => {
    expect(getChangelogForVersion(SAMPLE, "1.8.0")).toBeNull();
    expect(getChangelogForVersion(SAMPLE, "9.9.9")).toBeNull();
    expect(getChangelogForVersion("", "1.0.0")).toBeNull();
  });

  it("no confunde 1.9.0 con 1.9.01 ni con 11.9.0", () => {
    const text = "**Version 11.9.0 - X**\n• a\n**Version 1.9.01 - Y**\n• b";
    expect(getChangelogForVersion(text, "1.9.0")).toBeNull();
  });
});

describe("changelog real de la app", () => {
  const languages = Object.keys(changeLogLocales) as (keyof typeof changeLogLocales)[];

  it.each(languages)("%s: encuentra la 1.9.0 y la 1.8.1 por separado", (language) => {
    const { changes } = changeLogLocales[language];
    const latest = getChangelogForVersion(changes, "1.9.0");
    const previous = getChangelogForVersion(changes, "1.8.1");

    expect(latest).toBeTruthy();
    expect(previous).toBeTruthy();
    expect(latest).not.toContain("1.8.1");
    expect(previous).not.toContain("1.9.0");
    // Los bloques no se pisan ni se pierde texto: juntos cubren todo lo que hay a partir de la 1.9.0
    expect(changes.replace(/\s/g, "")).toContain((latest as string).replace(/\s/g, ""));
  });
});
