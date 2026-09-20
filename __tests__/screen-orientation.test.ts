/**
 * Forzar la pantalla en horizontal y devolverla a como estaba. El módulo nativo se simula con un
 * pequeño estado (el bloqueo actual), para comprobar el resultado final y no solo las llamadas.
 */
// Los valores de OrientationLock de expo-screen-orientation
const LOCK = { DEFAULT: 0, ALL: 1, PORTRAIT_UP: 3, LANDSCAPE: 5, OTHER: 8, UNKNOWN: 9 } as const;

interface FakeModule {
  OrientationLock: typeof LOCK;
  getOrientationLockAsync: jest.Mock;
  lockAsync: jest.Mock;
  unlockAsync: jest.Mock;
  supportsOrientationLockAsync: jest.Mock;
  state: { lock: number };
}

type Service = typeof import("../services/screen-orientation");

let warn: jest.SpyInstance;

// Carga el servicio con un módulo nativo nuevo (y su estado limpio) en cada prueba. Se reinicia el
// registro de módulos: el servicio carga el módulo nativo al usarlo, no al importarse, y esa carga
// tiene que ver el módulo simulado. Por lo mismo, la plataforma se fija en la copia de react-native
// que ve el servicio.
function load(
  options: { initialLock?: number; moduleMissing?: boolean; os?: string; isPad?: boolean } = {}
): { service: Service; fake: FakeModule } {
  const state = { lock: options.initialLock ?? LOCK.PORTRAIT_UP };
  const fake: FakeModule = {
    OrientationLock: LOCK,
    state,
    getOrientationLockAsync: jest.fn(async () => state.lock),
    lockAsync: jest.fn(async (lock: number) => {
      state.lock = lock;
    }),
    unlockAsync: jest.fn(async () => {
      state.lock = LOCK.DEFAULT;
    }),
    supportsOrientationLockAsync: jest.fn(async (lock: number) => lock !== LOCK.OTHER && lock !== LOCK.UNKNOWN),
  };

  jest.resetModules();
  if (options.moduleMissing) {
    jest.doMock("expo-screen-orientation", () => {
      throw new Error("Cannot find native module 'ExpoScreenOrientation'");
    });
  } else {
    jest.doMock("expo-screen-orientation", () => fake);
  }

  const { Platform: seenPlatform } = require("react-native");
  seenPlatform.OS = options.os ?? "android";
  // isPad es un getter sin setter en react-native: hay que redefinirlo
  Object.defineProperty(seenPlatform, "isPad", { value: options.isPad ?? false, configurable: true });

  return { service: require("../services/screen-orientation"), fake };
}

beforeEach(() => {
  warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
  jest.dontMock("expo-screen-orientation");
});

describe("canForceLandscape", () => {
  it.each([
    [{ os: "android" }, true],
    [{ os: "ios", isPad: true }, true],
    [{ os: "ios", isPad: false }, false], // el plist del iPhone solo admite vertical
    [{ os: "ios" }, false],
    [{ os: "web" }, false],
    [{ os: "windows" }, false],
  ])("%j → %s", (platform, expected) => {
    expect(load().service.canForceLandscape(platform)).toBe(expected);
  });
});

describe("isLandscapeLockAvailable", () => {
  it("en Android con el módulo, sí", () => {
    expect(load().service.isLandscapeLockAvailable()).toBe(true);
  });

  it("en iPad con el módulo, sí; en iPhone, no", () => {
    expect(load({ os: "ios", isPad: true }).service.isLandscapeLockAvailable()).toBe(true);
    expect(load({ os: "ios", isPad: false }).service.isLandscapeLockAvailable()).toBe(false);
  });

  it("si la compilación no lleva el módulo nativo, no (y no lanza)", () => {
    const { service } = load({ moduleMissing: true });
    expect(() => service.isLandscapeLockAvailable()).not.toThrow();
    expect(service.isLandscapeLockAvailable()).toBe(false);
  });

  it("en la web no", () => {
    expect(load({ os: "web" }).service.isLandscapeLockAvailable()).toBe(false);
  });
});

describe("forceLandscape / restoreOrientation", () => {
  it("fuerza el horizontal y lo devuelve a como estaba (el vertical del manifest)", async () => {
    const { service, fake } = load({ initialLock: LOCK.PORTRAIT_UP });

    await expect(service.forceLandscape()).resolves.toBe(true);
    expect(fake.state.lock).toBe(LOCK.LANDSCAPE);

    await service.restoreOrientation();
    expect(fake.state.lock).toBe(LOCK.PORTRAIT_UP);
  });

  it("restaura lo que había, no un vertical supuesto (giro libre, por ejemplo)", async () => {
    const { service, fake } = load({ initialLock: LOCK.DEFAULT });
    await service.forceLandscape();
    await service.restoreOrientation();
    expect(fake.state.lock).toBe(LOCK.DEFAULT);
    expect(fake.lockAsync).toHaveBeenLastCalledWith(LOCK.DEFAULT);
  });

  it("si lo anterior no se puede volver a poner (OTHER, UNKNOWN), desbloquea", async () => {
    for (const initialLock of [LOCK.OTHER, LOCK.UNKNOWN]) {
      const { service, fake } = load({ initialLock });
      await service.forceLandscape();
      await service.restoreOrientation();
      expect(fake.unlockAsync).toHaveBeenCalledTimes(1);
      expect(fake.state.lock).toBe(LOCK.DEFAULT);
    }
  });

  it("restaurar sin haber forzado no toca nada", async () => {
    const { service, fake } = load();
    await service.restoreOrientation();
    expect(fake.lockAsync).not.toHaveBeenCalled();
    expect(fake.unlockAsync).not.toHaveBeenCalled();
    expect(fake.getOrientationLockAsync).not.toHaveBeenCalled();
  });

  it("forzar dos veces recuerda lo de ANTES de forzar, no el horizontal", async () => {
    const { service, fake } = load({ initialLock: LOCK.PORTRAIT_UP });
    await service.forceLandscape();
    await service.forceLandscape();
    expect(fake.getOrientationLockAsync).toHaveBeenCalledTimes(1);

    await service.restoreOrientation();
    expect(fake.state.lock).toBe(LOCK.PORTRAIT_UP);
  });

  it("restaurar dos veces solo restaura una", async () => {
    const { service, fake } = load();
    await service.forceLandscape();
    await service.restoreOrientation();
    fake.lockAsync.mockClear();

    await service.restoreOrientation();
    expect(fake.lockAsync).not.toHaveBeenCalled();
  });

  it("se puede forzar otra vez después de restaurar", async () => {
    const { service, fake } = load({ initialLock: LOCK.PORTRAIT_UP });
    await service.forceLandscape();
    await service.restoreOrientation();
    await service.forceLandscape();
    expect(fake.state.lock).toBe(LOCK.LANDSCAPE);
    await service.restoreOrientation();
    expect(fake.state.lock).toBe(LOCK.PORTRAIT_UP);
  });
});

describe("las peticiones seguidas no se pisan", () => {
  it("forzar y restaurar sin esperar acaba restaurado", async () => {
    const { service, fake } = load({ initialLock: LOCK.PORTRAIT_UP });
    const forced = service.forceLandscape();
    const restored = service.restoreOrientation();
    await Promise.all([forced, restored]);
    expect(fake.state.lock).toBe(LOCK.PORTRAIT_UP);
  });

  it("restaurar y forzar sin esperar acaba forzado", async () => {
    const { service, fake } = load({ initialLock: LOCK.PORTRAIT_UP });
    const restored = service.restoreOrientation();
    const forced = service.forceLandscape();
    await Promise.all([restored, forced]);
    expect(fake.state.lock).toBe(LOCK.LANDSCAPE);
  });

  it("una ráfaga de forzar/restaurar termina en lo último que se pidió", async () => {
    const { service, fake } = load({ initialLock: LOCK.PORTRAIT_UP });
    await Promise.all([
      service.forceLandscape(),
      service.restoreOrientation(),
      service.forceLandscape(),
      service.restoreOrientation(),
      service.forceLandscape(),
    ]);
    expect(fake.state.lock).toBe(LOCK.LANDSCAPE);

    await service.restoreOrientation();
    expect(fake.state.lock).toBe(LOCK.PORTRAIT_UP);
  });

  it("una operación que se sale de madre (lanza de verdad) no deja la cola atascada", async () => {
    const { service, fake } = load({ initialLock: LOCK.PORTRAIT_UP });
    // Si hasta el aviso de error falla, la operación termina rechazada
    warn.mockImplementationOnce(() => {
      throw new Error("el aviso también falla");
    });
    fake.lockAsync.mockRejectedValueOnce(new Error("no deja"));
    await expect(service.forceLandscape()).rejects.toThrow("el aviso también falla");

    await expect(service.forceLandscape()).resolves.toBe(true);
    await service.restoreOrientation();
    expect(fake.state.lock).toBe(LOCK.PORTRAIT_UP);
  });

  it("una operación que falla no bloquea las siguientes", async () => {
    const { service, fake } = load({ initialLock: LOCK.PORTRAIT_UP });
    fake.lockAsync.mockRejectedValueOnce(new Error("no deja"));
    await expect(service.forceLandscape()).resolves.toBe(false);

    await expect(service.forceLandscape()).resolves.toBe(true);
    expect(fake.state.lock).toBe(LOCK.LANDSCAPE);
  });
});

describe("cuando el sistema no deja o falta el módulo", () => {
  it("si no se puede bloquear, devuelve false, no lanza, y restaurar sigue siendo seguro", async () => {
    const { service, fake } = load({ initialLock: LOCK.PORTRAIT_UP });
    fake.lockAsync.mockRejectedValueOnce(new Error("no deja"));

    await expect(service.forceLandscape()).resolves.toBe(false);
    await expect(service.restoreOrientation()).resolves.toBeUndefined();
    expect(fake.state.lock).toBe(LOCK.PORTRAIT_UP);
  });

  it("si no se puede leer el bloqueo actual, no fuerza nada", async () => {
    const { service, fake } = load();
    fake.getOrientationLockAsync.mockRejectedValueOnce(new Error("no se lee"));

    await expect(service.forceLandscape()).resolves.toBe(false);
    expect(fake.lockAsync).not.toHaveBeenCalled();
    await service.restoreOrientation();
    expect(fake.lockAsync).not.toHaveBeenCalled();
  });

  it("si falla al restaurar, no lanza", async () => {
    const { service, fake } = load();
    await service.forceLandscape();
    fake.lockAsync.mockRejectedValueOnce(new Error("no deja"));
    await expect(service.restoreOrientation()).resolves.toBeUndefined();
  });

  it("sin el módulo nativo, todo devuelve false o no hace nada, sin lanzar", async () => {
    const { service } = load({ moduleMissing: true });
    await expect(service.forceLandscape()).resolves.toBe(false);
    await expect(service.restoreOrientation()).resolves.toBeUndefined();
  });
});
