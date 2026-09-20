#!/usr/bin/env node
/**
 * Pruebas de mutación, a mano y sin librerías.
 *
 * Que los tests pasen no dice si sirven: un test que nunca falla no protege nada. Aquí se rompe el
 * código a propósito (una "mutación": cambiar un `>` por `>=`, quitar una comprobación, invertir una
 * condición…) y se comprueba que algún test falla. Si ninguno falla, el mutante "sobrevive": hay un
 * hueco en los tests (o el cambio no altera el comportamiento; en ese caso se documenta con
 * `equivalent`).
 *
 * El catálogo está en scripts/mutations/*.js. Cada entrada dice qué archivo tocar, qué trozo cambiar
 * (o una función `transform`), qué tests deben notarlo y una etiqueta con lo que se rompe.
 *
 * Uso:
 *   npm run mutation                 todas las mutaciones (tarda: cada una lanza Jest)
 *   npm run mutation -- notes        solo las de los catálogos/etiquetas que contengan "notes"
 *   npm run mutation -- --check      solo comprueba que cada mutación se puede aplicar (rápido)
 *   npm run mutation -- --list       lista lo que hay
 *
 * Garantías:
 *   - Antes de mutar se comprueba que los tests pasan sin mutar (si no, todo "se detectaría").
 *   - Un mutante que rompe la compilación no cuenta como detectado: se marca como inválido.
 *   - El archivo se restaura siempre, incluso con Ctrl+C; si el proceso muere a lo bruto, la
 *     siguiente ejecución lo recupera.
 *   - Sale con código 1 si algún mutante sobrevive o alguna entrada no es válida.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const CATALOG_DIR = path.join(__dirname, "mutations");
const JEST_BIN = require.resolve("jest/bin/jest");
const RECOVERY_FILE = path.join(os.tmpdir(), "justanagenda-mutation-recovery.json");
const RUN_TIMEOUT_MS = 180_000;

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const filters = args.filter((arg) => !arg.startsWith("--")).map((arg) => arg.toLowerCase());

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

function loadCatalog() {
  const entries = [];
  for (const fileName of fs.readdirSync(CATALOG_DIR).filter((name) => name.endsWith(".js") && !name.startsWith("_")).sort()) {
    const group = fileName.replace(/\.js$/, "");
    for (const entry of require(path.join(CATALOG_DIR, fileName))) {
      entries.push({ ...entry, group, tests: [].concat(entry.tests) });
    }
  }
  return entries.filter(
    (entry) =>
      filters.length === 0 ||
      filters.some((filter) => entry.group.toLowerCase().includes(filter) || entry.label.toLowerCase().includes(filter))
  );
}

// ---------------------------------------------------------------------------
// Aplicar una mutación y restaurar
// ---------------------------------------------------------------------------

function absolute(file) {
  return path.join(ROOT, file);
}

/** El código con la mutación puesta, o un mensaje de por qué no se puede aplicar */
function mutate(source, entry) {
  if (entry.transform) {
    const mutated = entry.transform(source);
    return mutated === source ? { error: "la transformación no cambia nada" } : { mutated };
  }
  const occurrences = source.split(entry.from).length - 1;
  if (occurrences === 0) return { error: "el trozo a cambiar ya no está en el archivo" };
  if (occurrences > 1) return { error: `el trozo aparece ${occurrences} veces (debe ser único)` };
  return { mutated: source.replace(entry.from, () => entry.to) };
}

let pendingRestore = null;

function restore() {
  if (!pendingRestore) return;
  fs.writeFileSync(pendingRestore.path, pendingRestore.content);
  fs.rmSync(RECOVERY_FILE, { force: true });
  pendingRestore = null;
}

function recoverFromCrash() {
  if (!fs.existsSync(RECOVERY_FILE)) return;
  try {
    const saved = JSON.parse(fs.readFileSync(RECOVERY_FILE, "utf8"));
    fs.writeFileSync(saved.path, saved.content);
    console.warn(`⚠ Una ejecución anterior se interrumpió: se ha restaurado ${path.relative(ROOT, saved.path)}`);
  } finally {
    fs.rmSync(RECOVERY_FILE, { force: true });
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    restore();
    process.exit(130);
  });
}
process.on("exit", restore);

// ---------------------------------------------------------------------------
// Jest
// ---------------------------------------------------------------------------

function runJest(tests) {
  const result = spawnSync(process.execPath, [JEST_BIN, "--ci", "--silent", ...tests], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: RUN_TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, TZ: "UTC" },
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    passed: result.status === 0,
    timedOut: result.error?.code === "ETIMEDOUT",
    // Jest no pudo ni cargar los tests: el mutante rompió la sintaxis o una importación
    brokeBuild: /Test suite failed to run|SyntaxError|Cannot find module/.test(output) && !/Tests:\s+\d+ failed/.test(output),
  };
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

function main() {
  recoverFromCrash();
  const catalog = loadCatalog();

  if (flags.has("--list")) {
    for (const entry of catalog) {
      console.log(`${entry.group.padEnd(14)} ${entry.equivalent ? "≈" : " "} ${entry.label}`);
      console.log(`${" ".repeat(17)}${entry.file}  →  ${entry.tests.join(", ")}`);
    }
    console.log(`\n${catalog.length} mutaciones`);
    return 0;
  }

  if (catalog.length === 0) {
    console.error("No hay mutaciones que coincidan con el filtro.");
    return 1;
  }

  const results = { killed: 0, survived: [], invalid: [], equivalent: 0, unexpected: [] };

  // 1) Que se puedan aplicar
  const applicable = [];
  for (const entry of catalog) {
    const source = fs.readFileSync(absolute(entry.file), "utf8");
    const { error } = mutate(source, entry);
    if (error) {
      results.invalid.push(`${entry.group}: ${entry.label} → ${error}`);
      console.log(`⚠️  no aplicable: [${entry.group}] ${entry.label} (${error})`);
    } else {
      applicable.push(entry);
    }
  }

  if (flags.has("--check")) {
    console.log(`\n${applicable.length} aplicables, ${results.invalid.length} inválidas`);
    return results.invalid.length > 0 ? 1 : 0;
  }

  // 2) Que los tests pasen sin mutar (una vez por cada conjunto de tests)
  const baselines = new Set();
  for (const entry of applicable) {
    const key = entry.tests.join(" ");
    if (baselines.has(key)) continue;
    baselines.add(key);
    process.stdout.write(`Comprobando que pasan sin mutar: ${key} … `);
    const baseline = runJest(entry.tests);
    if (!baseline.passed) {
      console.log("FALLAN");
      console.error("\nLos tests ya fallan sin mutar nada: arréglalos antes de evaluar las mutaciones.");
      return 1;
    }
    console.log("ok");
  }
  console.log("");

  // 3) Mutar de una en una
  for (const entry of applicable) {
    const filePath = absolute(entry.file);
    const original = fs.readFileSync(filePath, "utf8");
    const { mutated } = mutate(original, entry);

    pendingRestore = { path: filePath, content: original };
    fs.writeFileSync(RECOVERY_FILE, JSON.stringify(pendingRestore));
    fs.writeFileSync(filePath, mutated);

    let outcome;
    try {
      outcome = runJest(entry.tests);
    } finally {
      restore();
    }

    if (outcome.brokeBuild && !outcome.passed) {
      results.invalid.push(`${entry.group}: ${entry.label} → la mutación rompe la compilación, no prueba nada`);
      console.log(`⚠️  rompe la compilación: [${entry.group}] ${entry.label}`);
    } else if (outcome.passed) {
      if (entry.equivalent) {
        results.equivalent++;
        console.log(`≈  equivalente (${entry.equivalent}): [${entry.group}] ${entry.label}`);
      } else {
        results.survived.push(`${entry.group}: ${entry.label}`);
        console.log(`❌ SOBREVIVE: [${entry.group}] ${entry.label}`);
      }
    } else if (entry.equivalent) {
      results.unexpected.push(`${entry.group}: ${entry.label}`);
      console.log(`⚠️  se marcó como equivalente pero un test la detecta: [${entry.group}] ${entry.label}`);
    } else {
      results.killed++;
      console.log(`✅ detectado${outcome.timedOut ? " (por tiempo)" : ""}: [${entry.group}] ${entry.label}`);
    }
  }

  // 4) Resumen
  console.log(
    `\n${results.killed} detectadas · ${results.survived.length} sobreviven · ${results.equivalent} equivalentes · ` +
      `${results.invalid.length} inválidas · ${results.unexpected.length} equivalentes que ya no lo son`
  );
  for (const line of [...results.survived, ...results.invalid, ...results.unexpected]) console.error(`  ✖ ${line}`);

  return results.survived.length + results.invalid.length + results.unexpected.length > 0 ? 1 : 0;
}

process.exit(main());
