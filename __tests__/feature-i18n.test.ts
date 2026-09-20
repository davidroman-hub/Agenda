/**
 * Los textos de adjuntos, notas y vista de año se editan a mano en cuatro archivos JSON; esto avisa si falta una
 * clave (en la app saldría la clave a pelo en ese idioma) o si a una traducción se le pierde un {{dato}}.
 */
import fs from "node:fs";
import path from "node:path";
import enCommon from "../locales/en/common.json";
import esCommon from "../locales/es/common.json";
import frCommon from "../locales/fr/common.json";
import itCommon from "../locales/it/common.json";

const root = path.join(__dirname, "..");
const LANGUAGES = ["es", "en", "fr", "it"] as const;
const GROUPS = ["attachments", "notes", "yearView"] as const;
const files: Record<string, Record<string, unknown>> = {
  es: esCommon,
  en: enCommon,
  fr: frCommon,
  it: itCommon,
};
// Un grupo de textos (claves planas) de un idioma
const locales: Record<string, Record<string, Record<string, string>>> = Object.fromEntries(
  Object.entries(files).map(([language, common]) => [
    language,
    Object.fromEntries(GROUPS.map((group) => [group, common[group] as Record<string, string>])),
  ])
);

// Todos los archivos de código de la app donde se pueden usar las claves
function sourceFiles(dir: string): string[] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative);
    return /\.(ts|tsx)$/.test(entry.name) ? [relative] : [];
  });
}
const sources = ["components", "hooks", "services", "app"]
  .flatMap(sourceFiles)
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"));

const usedKeys = (group: string) =>
  new Set(
    sources.flatMap((source) =>
      [...source.matchAll(new RegExp(`"${group}\\.(\\w+)"`, "g"))].map((match) => match[1])
    )
  );

const placeholders = (text: string) =>
  [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]).sort();

describe.each(GROUPS)("traducciones de «%s»", (group) => {
  it("el código usa alguna clave (si no, este test no vigila nada)", () => {
    expect(usedKeys(group).size).toBeGreaterThan(5);
  });

  it.each(LANGUAGES)("%s tiene todas las claves que usa el código", (language) => {
    const missing = [...usedKeys(group)].filter((key) => !locales[language][group]?.[key]?.trim());
    expect(missing).toEqual([]);
  });

  it.each(LANGUAGES)("%s tiene exactamente las mismas claves que es", (language) => {
    expect(Object.keys(locales[language][group]).sort()).toEqual(Object.keys(locales.es[group]).sort());
  });

  it("todas las traducciones llevan los mismos {{datos}} que el español", () => {
    const mismatches: string[] = [];
    for (const [key, spanish] of Object.entries(locales.es[group])) {
      for (const language of ["en", "fr", "it"]) {
        const translated = locales[language][group][key] ?? "";
        if (placeholders(translated).join() !== placeholders(spanish).join()) {
          mismatches.push(`${language}.${group}.${key}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("datos que el código pasa a las traducciones de adjuntos", () => {
  it("las claves con {{dato}} que necesita el código existen (max, count)", () => {
    expect(placeholders(locales.es.attachments.errorTooLarge)).toEqual(["max"]);
    expect(placeholders(locales.es.attachments.errorTooMany)).toEqual(["max"]);
    expect(placeholders(locales.es.attachments.counter)).toEqual(["count", "max"]);
  });
});
