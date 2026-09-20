#!/usr/bin/env node
/**
 * Ejecuta Jest una vez por cada zona horaria de la lista.
 *
 * Los bugs de fechas (toISOString en vez de hora local, new Date("YYYY-MM-DD")
 * leído como UTC…) solo aparecen en algunas zonas, y una zona no se puede
 * cambiar dentro de un mismo proceso de Jest. Por eso se lanza un proceso por zona:
 *   - America/Mexico_City: UTC-6, donde la fecha UTC "se adelanta" por la tarde-noche
 *   - Europe/Rome:         UTC+1/+2 con horario de verano (Italia y Francia)
 *   - UTC:                 la referencia
 *
 * Uso: npm test [-- <argumentos de jest>]
 */
const { spawnSync } = require("node:child_process");

const TIME_ZONES = ["America/Mexico_City", "Europe/Rome", "UTC"];
const jestBin = require.resolve("jest/bin/jest");

const failedZones = [];

for (const timeZone of TIME_ZONES) {
  console.log(`\n▶ Zona horaria: ${timeZone}`);
  const result = spawnSync(
    process.execPath,
    [jestBin, "--ci", ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, TZ: timeZone } }
  );
  if (result.status !== 0) failedZones.push(timeZone);
}

if (failedZones.length > 0) {
  console.error(`\n✖ Fallaron los tests en: ${failedZones.join(", ")}`);
  process.exit(1);
}

console.log(`\n✔ Tests correctos en ${TIME_ZONES.length} zonas horarias`);
