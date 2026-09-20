/**
 * android/ está versionado y se mantiene a mano, así que no se regenera desde app.json.
 * Estos tests avisan cuando ambos se desincronizan (versiones, identificador, permisos)
 * y cuando algo contradice lo que dice la política de privacidad.
 */
import fs from "node:fs";
import path from "node:path";
import { changeLogLocales } from "../components/settings/changeLogLocales";
import { BUG_REPORT_EMAIL } from "../config/bug-report";
import { ATTACHMENTS_DIR_NAME } from "../utils/attachments";
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
  // y actualiza app-store-assets/privacy-policy-multilang.html (los 4 idiomas).
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

describe("copia de seguridad de Android", () => {
  // La copia automática en la nube tiene un tope (~25 MB) y, si se pasa, falla entera: las tareas también.
  // Por eso los archivos adjuntos van fuera de ella. android/ se mantiene a mano: si se regenera con
  // `expo prebuild`, hay que volver a poner estas reglas (android/app/src/main/res/xml/).
  const rules = (name: string) => read(`android/app/src/main/res/xml/${name}.xml`);
  const referencedRule = (attribute: string) =>
    new RegExp(`android:${attribute}="@xml/([\\w]+)"`).exec(manifest)?.[1];
  const excludesAttachments = (xml: string) =>
    new RegExp(`<exclude\\s+domain="file"\\s+path="${ATTACHMENTS_DIR_NAME}/"\\s*/>`).test(xml);

  it("Android 11 o anterior: el manifest apunta a unas reglas que excluyen los adjuntos", () => {
    const rule = referencedRule("fullBackupContent");
    expect(rule).toBeDefined();
    expect(excludesAttachments(rules(rule as string))).toBe(true);
  });

  it("Android 12 o posterior: la copia en la nube excluye los adjuntos", () => {
    const rule = referencedRule("dataExtractionRules");
    expect(rule).toBeDefined();
    const cloudBackup = /<cloud-backup[^>]*>([\s\S]*?)<\/cloud-backup>/.exec(rules(rule as string))?.[1] ?? "";
    expect(excludesAttachments(cloudBackup)).toBe(true);
  });
});

describe("política de privacidad", () => {
  // La política afirma que la app no tiene analítica ni reportes de fallos automáticos.
  // Si añades un SDK así, actualiza la política (privacy-policy-multilang.html) y la Data safety
  // de Play Console, y después ajusta esta lista.
  const TRACKING_SDKS = /sentry|crashlytics|firebase|analytics|amplitude|mixpanel|segment|bugsnag|datadog|posthog|appsflyer|adjust|clarity|instabug/i;

  it("no hay dependencias de analítica ni de reporte de fallos", () => {
    const dependencies = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(dependencies.filter((name) => TRACKING_SDKS.test(name))).toEqual([]);
  });
});

describe("política de privacidad multilingüe (la que se publica)", () => {
  const multilang = read("app-store-assets/privacy-policy-multilang.html");
  const LANGUAGES = ["es", "en", "fr", "it"];
  const article = (language: string) =>
    new RegExp(`<article data-l="${language}"[\\s\\S]*?</article>`).exec(multilang)?.[0] ?? "";

  // Forma del artículo: nº de tarjetas y de filas, listas, tiles y chips de cada una
  const shapeOf = (html: string) => {
    const cards = html.match(/<section class="card"[\s\S]*?<\/section>/g) ?? [];
    return {
      cards: cards.length,
      rows: cards.map((card) => (card.match(/<dt>/g) ?? []).length),
      items: cards.map((card) => (card.match(/<li>/g) ?? []).length),
      tiles: (html.match(/<div class="tile">/g) ?? []).length,
    };
  };

  it("tiene los cuatro idiomas y todos con la misma estructura", () => {
    const english = shapeOf(article("en"));
    expect(english.cards).toBeGreaterThan(0);

    for (const language of LANGUAGES) {
      expect(article(language)).not.toBe("");
      expect([language, shapeOf(article(language))]).toEqual([language, english]);
    }
  });

  it("los cuatro idiomas llevan la misma fecha de vigencia", () => {
    // Cada idioma la escribe a su manera ("20 de septiembre de 2026" / "September 20, 2026"),
    // así que se compara el día y el año; si cambias la fecha, cámbiala en los cuatro.
    const dayAndYear = (language: string) => {
      const meta = /<p class="meta">([^<]*)</.exec(article(language))?.[1] ?? "";
      return [/\b(\d{1,2})\b/.exec(meta)?.[1], /\b(20\d{2})\b/.exec(meta)?.[1]];
    };
    const english = dayAndYear("en");
    expect(english.every(Boolean)).toBe(true);

    for (const language of LANGUAGES) {
      expect([language, dayAndYear(language)]).toEqual([language, english]);
    }
  });

  it("si la app permite adjuntar archivos, la política lo dice en los cuatro idiomas", () => {
    const canAttach = Boolean({ ...pkg.dependencies }["expo-document-picker"]);
    // Una raíz por idioma: adjunt(os) / attach(ments) / joint(es) / allega(ti)
    const STEMS: Record<string, RegExp> = { es: /adjunt/i, en: /attach/i, fr: /joint/i, it: /allega/i };

    for (const language of LANGUAGES) {
      expect([language, STEMS[language].test(article(language))]).toEqual([language, canAttach]);
    }
  });

  it("si la app tiene notas, la política las presenta (tarjeta 📝) en los cuatro idiomas", () => {
    const hasNotes = fs.existsSync(path.join(root, "stores/notes-store.ts"));
    for (const language of LANGUAGES) {
      expect([language, article(language).includes("📝")]).toEqual([language, hasNotes]);
    }
  });

  it("si la app tiene copia de seguridad, la política la presenta (tarjeta 💾) en los cuatro idiomas", () => {
    const hasBackup = fs.existsSync(path.join(root, "services/backup-service.ts"));
    for (const language of LANGUAGES) {
      expect([language, article(language).includes("💾")]).toEqual([language, hasBackup]);
    }
  });

  it("si la app cifra las copias de seguridad, la política no afirma que no añade cifrado propio", () => {
    const encrypts = Boolean({ ...pkg.dependencies }["@noble/ciphers"]);
    const OLD_CLAIM: Record<string, RegExp> = {
      es: /No añadimos un cifrado propio/,
      en: /We don[’']t add our own encryption/,
      fr: /Nous n[’']ajoutons pas de chiffrement propre/,
      it: /Non aggiungiamo una cifratura nostra/,
    };
    if (!encrypts) return;

    for (const language of LANGUAGES) {
      expect([language, OLD_CLAIM[language].test(article(language))]).toEqual([language, false]);
    }
  });

  it("el correo de contacto es al que la app envía los reportes de bug", () => {
    for (const language of LANGUAGES) {
      expect([language, article(language).includes(`mailto:${BUG_REPORT_EMAIL}`)]).toEqual([language, true]);
    }
  });

  it("nombra al servicio que recibe los reportes de bug", () => {
    // La URL del formulario se lee del propio archivo de configuración, sea cual sea el nombre de la
    // constante. Si cambias de proveedor: añádelo aquí, actualiza la política (los 4 idiomas) y la Data safety de Play Console.
    const PROVIDERS: Record<string, string> = { "formspree.io": "Formspree", "api.web3forms.com": "Web3Forms" };
    const endpoint = /export const \w*ENDPOINT[^=]*=\s*"(https?:\/\/[^"]+)"/.exec(read("config/bug-report.ts"))?.[1];
    expect(endpoint).toBeTruthy();

    const provider = PROVIDERS[new URL(endpoint as string).hostname];
    expect(provider).toBeDefined();

    for (const language of LANGUAGES) {
      const html = article(language);
      expect([language, html.includes(`<strong>${provider}</strong>`)]).toEqual([language, true]);
      // Y ningún otro proveedor conocido
      for (const other of Object.values(PROVIDERS).filter((name) => name !== provider)) {
        expect([language, other, html.includes(other)]).toEqual([language, other, false]);
      }
    }
  });

  it("habla del widget solo si la app tiene uno", () => {
    const appHasWidget = manifest.includes("android.appwidget.provider");

    for (const language of LANGUAGES) {
      expect([language, /widget/i.test(article(language))]).toEqual([language, appHasWidget]);
    }
  });
});

describe("widget de Android: lo que comparten JS y Kotlin", () => {
  const provider = read("android/app/src/main/java/com/davidroman/justanagenda/widget/AgendaWidgetProvider.kt");

  it("la clave con la que la app guarda los datos es la que lee el widget", () => {
    const kotlinKey = /const val DATA_KEY = "([^"]+)"/.exec(provider)?.[1];
    const jsKey = /WIDGET_KEY = "([^"]+)"/.exec(read("stores/widget-store.ts"))?.[1];

    expect(kotlinKey).toBeTruthy();
    expect(jsKey).toBe(kotlinKey);
  });

  it("el enlace de las tareas del widget llega a una ruta que existe y a un esquema que el manifest acepta", () => {
    const authority = /\.authority\("([^"]+)"\)/.exec(provider)?.[1];
    const scheme = /\.scheme\("([^"]+)"\)/.exec(provider)?.[1];

    expect(fs.existsSync(path.join(root, "app", `${authority}.tsx`))).toBe(true);
    expect(scheme).toBe(app.scheme);
    expect(manifest).toContain(`<data android:scheme="${scheme}"/>`);
  });

  it("el receiver escucha el arranque y los cambios de fecha, hora e idioma para repintarse", () => {
    const receiver = /<receiver[^>]*AgendaWidgetProvider[\s\S]*?<\/receiver>/.exec(manifest)?.[0] ?? "";

    for (const action of ["BOOT_COMPLETED", "DATE_CHANGED", "TIME_SET", "TIMEZONE_CHANGED", "LOCALE_CHANGED"]) {
      expect([action, receiver.includes(`android.intent.action.${action}`)]).toEqual([action, true]);
    }
    expect(manifestPermissions().active.has("android.permission.RECEIVE_BOOT_COMPLETED")).toBe(true);
  });
});
