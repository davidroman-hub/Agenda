// Cabecera de versión dentro del changelog de la app, p. ej. "🚀 **Version 1.9.0 - Título**".
// Cubre Version / Versión / Versione. No se ancla al inicio de la línea porque
// las cabeceras llevan un emoji delante (y en alguna está corrupto).
const VERSION_HEADER = /\*\*(?:Version|Versión|Versione)\s+(\d+\.\d+\.\d+)\b/;

/**
 * Devuelve el bloque del changelog que corresponde a una versión (desde su
 * cabecera hasta la cabecera de la siguiente), o null si esa versión no tiene entrada.
 */
export function getChangelogForVersion(
  changelog: string,
  version: string
): string | null {
  const lines = changelog.split("\n");

  const start = lines.findIndex(
    (line) => VERSION_HEADER.exec(line)?.[1] === version
  );
  if (start === -1) return null;

  const nextHeader = lines.findIndex(
    (line, index) => index > start && VERSION_HEADER.test(line)
  );
  const end = nextHeader === -1 ? lines.length : nextHeader;

  return lines.slice(start, end).join("\n").trim();
}
