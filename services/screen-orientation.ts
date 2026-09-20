import { Platform } from "react-native";

/**
 * Forzar la pantalla en horizontal (para la vista de año) y devolverla a como estaba.
 *
 * - Antes de forzar se guarda el bloqueo que había (en Android, el vertical que fija el manifest) y
 *   se restaura ese mismo, no un "vertical" supuesto: así también respeta tablets o cualquier otro caso.
 * - Las operaciones se hacen de una en una y en el orden en que se piden: forzar y restaurar seguidos
 *   no se pisan.
 * - El módulo nativo se carga al usarlo: con un binario que aún no lo lleva (una compilación
 *   anterior) el botón simplemente no aparece, y nada falla.
 * - Nada de aquí lanza: si el sistema no deja girar, se devuelve false.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const loadScreenOrientation = (): typeof import("expo-screen-orientation") =>
  require("expo-screen-orientation");
/* eslint-enable @typescript-eslint/no-require-imports */

function getModule(): typeof import("expo-screen-orientation") | null {
  try {
    return loadScreenOrientation();
  } catch {
    return null;
  }
}

/**
 * ¿Puede esta plataforma forzar horizontal? En Android sí (el bloqueo en marcha pasa por encima del
 * vertical del manifest). En iPhone no: su Info.plist solo admite vertical, y para permitirlo haría
 * falta cambiar el proyecto de iOS. En iPad el plist ya admite las cuatro orientaciones.
 */
export function canForceLandscape(platform: { os: string; isPad?: boolean }): boolean {
  if (platform.os === "android") return true;
  return platform.os === "ios" && platform.isPad === true;
}

/** ¿Se puede ofrecer el botón de horizontal en este dispositivo y con esta compilación? */
export function isLandscapeLockAvailable(): boolean {
  const supported = canForceLandscape({
    os: Platform.OS,
    isPad: Platform.OS === "ios" ? Platform.isPad : false,
  });
  return supported && getModule() !== null;
}

// Una cola: cada operación empieza cuando ha terminado la anterior, y una que falle no bloquea las siguientes
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

// El bloqueo que había antes de forzar; null si no hemos forzado nada (o ya se restauró)
let previousLock: number | null = null;

/** Pone la pantalla en horizontal (las dos direcciones). Devuelve false si no se ha podido. */
export function forceLandscape(): Promise<boolean> {
  return enqueue(async () => {
    const orientation = getModule();
    if (!orientation) return false;

    try {
      // Solo la primera vez: si ya estaba forzada, lo que hay que recordar es lo de antes de forzar
      previousLock ??= await orientation.getOrientationLockAsync();
      await orientation.lockAsync(orientation.OrientationLock.LANDSCAPE);
      return true;
    } catch (error) {
      console.warn("No se pudo forzar la pantalla en horizontal:", error);
      return false;
    }
  });
}

/** Devuelve la pantalla a como estaba antes de forzarla. No hace nada si no se había forzado. */
export function restoreOrientation(): Promise<void> {
  return enqueue(async () => {
    if (previousLock === null) return;
    const lock = previousLock;
    previousLock = null;

    const orientation = getModule();
    if (!orientation) return;

    try {
      // Algunos valores (OTHER, UNKNOWN) se pueden leer pero no volver a poner: se desbloquea
      if (await orientation.supportsOrientationLockAsync(lock)) await orientation.lockAsync(lock);
      else await orientation.unlockAsync();
    } catch (error) {
      console.warn("No se pudo devolver la pantalla a como estaba:", error);
    }
  });
}
