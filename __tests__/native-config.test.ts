/**
 * android/ está versionado y se mantiene a mano, así que no se regenera desde app.json.
 * Estos tests avisan cuando ambos se desincronizan (versiones, identificador, permisos)
 * y cuando algo contradice lo que dice la política de privacidad.
 */
import fs from "node:fs";
import path from "node:path";
import { changeLogLocales } from "../components/settings/changeLogLocales";
import { getChangelogForVersion } from "../utils/changelog-utils";

const root = path.join(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const app = JSON.parse(read("app.json")).expo;
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const gradle = read("android/app/build.gradle");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const changelog = read("changelog.md");

const androidPermission = (name: string) =>
  name.includes(".") ? name : `android.permission.${name}`;

// Lee los <uses-permission> del manifest, separando los activos de los bloqueados (tools:node="remove")
const manifestPermissions = () => {
  const active = new Set<string>();
  const removed = new Set<string>();
  for (const [, attributes] of manifest.matchAll(/<uses-permission\s+([^>]*?)\/?>/g)) {
    const name = /android:name="([^"]+)"/.exec(attributes)?.[1];
    if (!name) continue;
    (/tools:node="remove"/.test(attributes) ? removed : active).add(name);
  }
  return { active, removed };
};

describe("versión", () => {
  const version: string = app.version;

  it("app.json es la fuente y tiene formato X.Y.Z", () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("package.json y package-lock.json coinciden con app.json", () => {
    expect(pkg.version).toBe(version);
    expect(lock.version).toBe(version);
    expect(lock.packages[""].version).toBe(version);
  });

  it("build.gradle (versionName) coincide con app.json", () => {
    expect(/versionName\s+"([^"]*)"/.exec(gradle)?.[1]).toBe(version);
  });

  it("el changelog tiene la versión actual como última publicada", () => {
    // Un bloque "Sin publicar" no cuenta: solo las cabeceras **vX.Y.Z**
    expect(/^\*\*v(\d+\.\d+\.\d+)\*\*/m.exec(changelog)?.[1]).toBe(version);
  });

  it("el changelog de dentro de la app tiene entrada para la versión actual en todos los idiomas", () => {
    // Es lo que enseña el aviso "nueva versión instalada" > "Ver cambios"
    const missing = Object.entries(changeLogLocales)
      .filter(([, { changes }]) => getChangelogForVersion(changes, version) === null)
      .map(([language]) => language);
    expect(missing).toEqual([]);
  });

  // Si falla alguno de los anteriores: `npm run version:sync`, y añade la entrada al
  // changelog.md y a components/settings/changeLogLocales.ts (en los 4 idiomas)
});

describe("identificador de la app", () => {
  it("el package de app.json coincide con applicationId y namespace de Gradle", () => {
    expect(/applicationId\s+'([^']+)'/.exec(gradle)?.[1]).toBe(app.android.package);
    expect(/namespace\s+'([^']+)'/.exec(gradle)?.[1]).toBe(app.android.package);
  });
});

describe("permisos de Android", () => {
  // Cada permiso nuevo levanta preguntas en la revisión de Play Store y en la Data safety.
  // Si añades uno a propósito: ponlo aquí, en app.json (android.permissions) y en el manifest,
  // y actualiza app-store-assets/privacy-policy.html y .md.
  const ALLOWED = [
    "INTERNET", // reporte de bugs opcional y enlaces
    "POST_NOTIFICATIONS", // recordatorios
    "RECEIVE_BOOT_COMPLETED", // reprogramar recordatorios tras reiniciar
    "SCHEDULE_EXACT_ALARM", // recordatorios a la hora exacta
    "VIBRATE", // aviso de recordatorios
    "WAKE_LOCK", // notificaciones
  ].map(androidPermission);

  it("el manifest solo declara los permisos de la lista permitida", () => {
    const unexpected = [...manifestPermissions().active].filter(
      (permission) => !ALLOWED.includes(permission)
    );
    expect(unexpected).toEqual([]);
  });

  it("todo lo que pide app.json (android.permissions) está en el manifest", () => {
    const { active } = manifestPermissions();
    const missing = (app.android.permissions ?? [])
      .map(androidPermission)
      .filter((permission: string) => !active.has(permission));
    expect(missing).toEqual([]);
  });

  it("todo lo bloqueado en app.json (blockedPermissions) se elimina en el manifest", () => {
    const { active, removed } = manifestPermissions();
    const blocked: string[] = (app.android.blockedPermissions ?? []).map(androidPermission);

    expect(blocked.filter((permission) => !removed.has(permission))).toEqual([]);
    expect(blocked.filter((permission) => active.has(permission))).toEqual([]);
  });

  it("los permisos sensibles que la app no usa siguen bloqueados", () => {
    const { removed } = manifestPermissions();
    for (const permission of [
      "SYSTEM_ALERT_WINDOW",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "READ_CALENDAR",
      "WRITE_CALENDAR",
      "ACCESS_NOTIFICATION_POLICY",
    ]) {
      expect(removed).toContain(androidPermission(permission));
    }
  });
});

describe("política de privacidad", () => {
  // La política afirma que la app no tiene analítica ni reportes de fallos automáticos.
  // Si añades un SDK así, actualiza la política (privacy-policy.html/.md) y la Data safety
  // de Play Console, y después ajusta esta lista.
  const TRACKING_SDKS = /sentry|crashlytics|firebase|analytics|amplitude|mixpanel|segment|bugsnag|datadog|posthog|appsflyer|adjust|clarity|instabug/i;

  it("no hay dependencias de analítica ni de reporte de fallos", () => {
    const dependencies = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(dependencies.filter((name) => TRACKING_SDKS.test(name))).toEqual([]);
  });

  it("la versión HTML (la que se publica) y la de Markdown llevan la misma fecha de vigencia", () => {
    const html = read("app-store-assets/privacy-policy.html");
    const markdown = read("app-store-assets/privacy-policy.md");
    const htmlDate = /<strong>Effective Date:<\/strong>\s*([^<]+)</.exec(html)?.[1].trim();
    const markdownDate = /\*\*Effective Date:\*\*\s*(.+)/.exec(markdown)?.[1].trim();

    expect(htmlDate).toBeTruthy();
    expect(markdownDate).toBe(htmlDate);
  });
});
