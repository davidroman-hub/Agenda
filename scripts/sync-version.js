#!/usr/bin/env node
/**
 * La versión de la app se define una sola vez, en app.json (expo.version).
 * Este script la copia a los sitios que se mantienen a mano:
 *   - package.json y package-lock.json
 *   - android/app/build.gradle (versionName)
 *
 * Uso: npm run version:sync
 * Si algo se desincroniza, __tests__/native-config.test.ts falla y avisa.
 *
 * versionCode no se toca: eas.json usa appVersionSource "remote", así que
 * EAS lo gestiona (y lo incrementa) por su cuenta.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) =>
  fs.writeFileSync(path.join(root, file), content);

const version = JSON.parse(read("app.json")).expo.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`app.json: expo.version "${version}" no tiene formato X.Y.Z`);
  process.exit(1);
}

const changed = [];

function updateJson(file, update) {
  const original = read(file);
  const data = JSON.parse(original);
  update(data);
  const updated =
    JSON.stringify(data, null, 2) + (original.endsWith("\n") ? "\n" : "");
  if (updated !== original) {
    write(file, updated);
    changed.push(file);
  }
}

updateJson("package.json", (pkg) => {
  pkg.version = version;
});

updateJson("package-lock.json", (lock) => {
  lock.version = version;
  if (lock.packages?.[""]) lock.packages[""].version = version;
});

const gradleFile = "android/app/build.gradle";
const gradle = read(gradleFile);
const updatedGradle = gradle.replace(
  /versionName\s+"[^"]*"/,
  `versionName "${version}"`
);
if (updatedGradle !== gradle) {
  write(gradleFile, updatedGradle);
  changed.push(gradleFile);
}

console.log(
  changed.length
    ? `Versión ${version} aplicada en: ${changed.join(", ")}`
    : `Todo estaba ya en la versión ${version}`
);
