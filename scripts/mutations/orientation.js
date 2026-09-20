// Pantalla forzada en horizontal para la vista de año: servicio, hook, botón y barra de abajo
const { m } = require("./_helpers");

const S = "services/screen-orientation.ts";
const ST = "__tests__/screen-orientation.test.ts";
const H = "hooks/use-forced-orientation.ts";
const BOOK = "components/agendaComponents/book.tsx";
const BOOK_T = "__tests__/book-sections.test.tsx";
const RULES = "utils/agenda-strip.ts";
const RULES_T = "__tests__/landscape.test.ts";
const LAYOUT = "app/(tabs)/_layout.tsx";
const LAYOUT_T = "__tests__/tabs-layout.test.tsx";

module.exports = [
  // --- servicio (services/screen-orientation.ts)
  m(S, "previousLock ??= await orientation.getOrientationLockAsync();", "previousLock = await orientation.getOrientationLockAsync();", ST, "al forzar dos veces se recuerda el horizontal como lo de antes"),
  m(S, "  const run = queue.then(task);", "  const run = task();", ST, "sin cola: forzar y restaurar seguidos se pisan"),
  m(S, "if (await orientation.supportsOrientationLockAsync(lock)) await orientation.lockAsync(lock);", "if (lock >= 0) await orientation.lockAsync(lock);", ST, "se intenta restaurar un bloqueo que no se puede poner (OTHER, UNKNOWN)"),
  m(S, "orientation.lockAsync(orientation.OrientationLock.LANDSCAPE)", "orientation.lockAsync(orientation.OrientationLock.PORTRAIT_UP)", ST, "no se fuerza el horizontal"),
  m(S, `    const lock = previousLock;
    previousLock = null;`, "    const lock = previousLock;", ST, "se restaura más de una vez"),
  m(S, `    if (previousLock === null) return;
    const lock = previousLock;`, "    const lock = previousLock ?? 3;", ST, "se restaura aunque no se hubiera forzado"),
  m(S, 'return platform.os === "ios" && platform.isPad === true;', 'return platform.os === "ios";', ST, "el iPhone puede forzar horizontal (su Info.plist no lo admite)"),
  m(S, "  return supported && getModule() !== null;", "  return supported;", ST, "el botón sale sin el módulo nativo"),
  m(S, "  queue = run.catch(() => undefined);", "  queue = run;", ST, "una operación que falla deja la cola atascada"),
  m(S, `    const orientation = getModule();
    if (!orientation) return false;`, "    const orientation = getModule()!;", ST, "sin el módulo nativo, forzar lanza un error", {
    equivalent: "el try/catch de dentro convierte ese error en false, igual que el original",
  }),

  // --- hook (hooks/use-forced-orientation.ts)
  m(H, `      void restoreOrientation();
      return;`, "      return;", BOOK_T, "no se devuelve la pantalla al salir del año horizontal"),
  m(H, "if (!ok && !cancelled) useAgendaSectionStore", "if (!ok) useAgendaSectionStore", BOOK_T, "se apaga lo pedido aunque ya se hubiera salido del año"),
  m(H, "if (!ok && !cancelled) useAgendaSectionStore.getState().setLandscapeYear(false);", "", BOOK_T, "el botón dice «Vertical» aunque el sistema no dejara girar"),
  m(H, "    void forceLandscape().then((ok) => {", "    void Promise.resolve(true).then((ok) => {", BOOK_T, "nunca se fuerza la pantalla"),
  m(H, `  useEffect(
    () => () => {
      void restoreOrientation();
    },
    []
  );`, "", BOOK_T, "al desmontar el libro la pantalla puede quedar tumbada"),
  m(H, "const forced = useAgendaSectionStore(isLandscapeForced);", "const forced = useAgendaSectionStore((state) => state.landscapeYear);", BOOK_T, "se fuerza también en el libro y en las notas"),
  m(BOOK, "  useForcedOrientation();", "", BOOK_T, "el libro no usa el hook de orientación"),

  // --- reglas (utils/agenda-strip.ts) y barra de abajo (app/(tabs)/_layout.tsx)
  m(RULES, '  return state.section === "agenda" && state.agendaView === "year" && state.landscapeYear;', '  return state.agendaView === "year" && state.landscapeYear;', RULES_T, "la pantalla se fuerza también dentro de las notas"),
  m(RULES, '  return state.section === "agenda" && state.agendaView === "year" && state.landscapeYear;', '  return state.section === "agenda" && state.landscapeYear;', RULES_T, "la pantalla se fuerza también en el libro"),
  m(RULES, '  return !options.isLoggedIn || options.forcedLandscape ? { display: "none" } : undefined;', '  return !options.isLoggedIn ? { display: "none" } : undefined;', RULES_T, "la barra de abajo nunca se oculta en horizontal"),
  m(LAYOUT, "tabBarStyle: getTabBarStyle({ isLoggedIn, forcedLandscape }),", "tabBarStyle: getTabBarStyle({ isLoggedIn, forcedLandscape: false }),", LAYOUT_T, "el layout no oculta la barra de abajo en horizontal"),
  m(LAYOUT, "const forcedLandscape = useAgendaSectionStore(isLandscapeForced);", "const forcedLandscape = useAgendaSectionStore((state) => state.landscapeYear);", LAYOUT_T, "la barra se oculta con solo pedir horizontal"),
];
