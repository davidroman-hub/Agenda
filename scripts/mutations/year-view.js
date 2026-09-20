// Vista de año: lógica pura, acciones, estado, interfaz y conmutador Libro/Año
const { m } = require("./_helpers");

const Y = "utils/year-view.ts";
const YT = "__tests__/year-view.test.ts";
const A = "services/year-task-actions.ts";
const AT = "__tests__/year-task-actions.test.ts";
const SECTION = "stores/agenda-section-store.ts";
const V = "components/agendaComponents/yearView/YearView.tsx";
const MINI = "components/agendaComponents/yearView/MiniMonth.tsx";
const LIST = "components/agendaComponents/yearView/YearTasksList.tsx";
const UT = "__tests__/year-view-ui.test.tsx";
const TABS = "components/agendaComponents/typeTabs/TypeTabs.tsx";
const NOTES_UI = "__tests__/notes-ui.test.tsx";
const BOOK = "components/agendaComponents/book.tsx";
const BOOK_T = "__tests__/book-sections.test.tsx";
const DAY = "utils/day-tasks.ts";
const DAY_T = "__tests__/day-tasks.test.ts";
const LOCALES = "components/calendar/calendarLocales.ts";
const LOCALES_T = "__tests__/calendar-locales.test.ts";

module.exports = [
  // --- lógica pura (utils/year-view.ts)
  m(Y, "new Date(Date.UTC(year, month, 0)).getUTCDate()", "new Date(Date.UTC(year, month - 1, 0)).getUTCDate()", YT, "los días de cada mes están desplazados"),
  m(Y, "const offset = (weekdayOfFirst - firstDay + 7) % 7;", "const offset = (weekdayOfFirst - firstDay) % 7;", YT, "la rejilla del mes tiene un desfase negativo"),
  m(Y, "return day >= 1 && day <= total ? toDateKey(year, month, day) : null;", "return day >= 1 && day < total ? toDateKey(year, month, day) : null;", YT, "la rejilla pierde el último día del mes"),
  m(Y, "Array.from({ length: 6 }, (_, week) =>", "Array.from({ length: 5 }, (_, week) =>", YT, "la rejilla del mes tiene 5 filas y no 6"),
  m(Y, "for (let day = 1; day <= daysInMonth(year, month); day++)", "for (let day = 1; day < daysInMonth(year, month); day++)", YT, "el año pierde el último día de cada mes"),
  m(Y, `      if (!include(task)) continue;
      entries.push({ dateKey, task, line: null });`, "      entries.push({ dateKey, task, line: null });", YT, "el filtro por tipo no se aplica a las tareas repetidas"),
  m(Y, "      if (task && include(task)) entries.push({ dateKey, task, line });", "      if (task) entries.push({ dateKey, task, line });", YT, "el filtro por tipo no se aplica a las tareas propias"),
  m(Y, "        known.occurrences++;", "", YT, "no se cuentan las ocurrencias de una serie"),
  m(Y, "    const own = day.entries.filter((entry) => entry.line !== null);", "    const own = day.entries;", YT, "el año entero lista todas las ocurrencias repetidas"),
  m(Y, "own.length === day.entries.length ? day : summarizeDay(dateKey, own)", "day", YT, "los totales de un día no se recalculan sin las ocurrencias"),
  m(Y, "if (dateKey.slice(5, 7) === pad2(scope.month)) result.push(day);", "result.push(day);", YT, "un mes lista todo el año"),
  m(Y, 'return scope.kind === "year" ? index.series : [];', "return index.series;", YT, "las series salen aparte también en un mes o un día"),
  m(Y, 'return day.completed === day.total ? "done" : "pending";', 'return day.completed > 0 ? "done" : "pending";', YT, "un día a medias cuenta como hecho"),
  m(Y, "if (!(width >= 600)) return", "if (!(width > 600)) return", YT, "límite de pantalla ancha desplazado"),
  m(Y, "monthColumns: width >= 900 ? 3 : 2", "monthColumns: width >= 900 ? 2 : 3", YT, "columnas de meses invertidas"),
  m(Y, "return `${names.dayNamesShort[weekday]} ${parts.day} ${names.monthNamesShort[parts.month - 1]}`;", "return `${names.dayNamesShort[weekday]} ${parts.day}`;", YT, "la etiqueta de un día pierde el mes"),
  m(Y, "${names.monthNamesShort[parts.month - 1]}", "${names.monthNamesShort[parts.month]}", YT, "el mes de la etiqueta está desplazado"),
  m(Y, "${names.dayNamesShort[weekday]} ", "${names.dayNamesShort[(weekday + 1) % 7]} ", YT, "el día de la semana de la etiqueta está desplazado"),
  m(Y, '(dayNamesShort[(index + firstDay) % 7] ?? "")', '(dayNamesShort[index] ?? "")', YT, "las iniciales de los días no giran con el primer día de la semana"),
  m(Y, 'return language === "en" ? 0 : 1;', "return 1;", YT, "en inglés la semana empieza en lunes"),
  m(Y, "const cellHeight = Math.round(Math.min(30, Math.max(18, cellWidth * 1.1)));", "const cellHeight = 18;", YT, "las celdas no crecen en una tablet"),
  m(Y, "monthHeight: titleHeight + weekdaysHeight + cellHeight * 6 + MONTH_MARGIN,", "monthHeight: titleHeight + weekdaysHeight + cellHeight * 5 + MONTH_MARGIN,", YT, "el alto de un mes cuenta 5 filas"),
  m(Y, "const width = monthWidth > 0 ? monthWidth : 105;", "const width = monthWidth;", YT, "un ancho raro no tiene valor por defecto"),
  m(Y, `  if (series.length > 0) {
    rows.push({ kind: "seriesTitle", key: "series-title" });`, `  if (true) {
    rows.push({ kind: "seriesTitle", key: "series-title" });`, YT, "el título de series sale aunque no haya series"),
  m(Y, "key: `task:${day.dateKey}:${entry.task.id}`", "key: `task:${entry.task.id}`", YT, "claves de fila repetidas si un id está en dos días"),

  // --- reutilización del cálculo de un día (utils/day-tasks.ts)
  m(DAY, "const activePatterns = patterns.filter((pattern) => pattern.isActive);", "const activePatterns = patterns;", DAY_T, "los patrones inactivos generan ocurrencias"),

  // --- nombres de meses y días (components/calendar/calendarLocales.ts)
  m(LOCALES, "return calendarLocales[language as keyof typeof calendarLocales] ?? enCalendarLocales;", "return calendarLocales[language as keyof typeof calendarLocales] ?? esCalendarLocales;", LOCALES_T, "un idioma desconocido cae en español y no en inglés"),

  // --- acciones de la lista (services/year-task-actions.ts) y estado (stores/agenda-section-store.ts)
  m(A, "entry.task.repeatingTaskId ?? entry.task.id, entry.dateKey);", "entry.task.id, entry.dateKey);", AT, "marcar una repetida usa el id virtual"),
  m(A, `    .getState()
    .requestTarget(entry.dateKey, entry.task.repeatingTaskId ?? entry.task.id);`, `    .getState()
    .requestTarget(entry.dateKey, entry.task.id);`, AT, "abrir una repetida en el libro usa el id virtual (no la encuentra)"),
  m(A, 'requestTarget(dateKey, "")', 'requestTarget(dateKey, "x")', AT, "abrir un día en el libro abre una tarea que no existe"),
  m(SECTION, 'showBook: () => set({ section: "agenda", agendaView: "book" }),', 'showBook: () => set({ agendaView: "book" }),', AT, "showBook no saca de las notas"),
  m(SECTION, 'showAgenda: () => set({ section: "agenda" }),', 'showAgenda: () => set({ section: "agenda", agendaView: "book" }),', AT, "volver de las notas olvida la vista del año"),
  m(SECTION, "setYearFocus: (focus) => set({ yearFocus: focus }),", "setYearFocus: () => undefined,", AT, "el store no guarda dónde se estaba en el año"),

  // --- interfaz de la vista de año (year-view-ui.test.tsx)
  m(V, "onToggle={toggleYearEntry}", "onToggle={() => undefined}", UT, "la casilla de la lista no marca la tarea"),
  m(V, "onOpen={openEntryInBook}", "onOpen={() => undefined}", UT, "pulsar una tarea no abre el libro"),
  m(V, "onOpenSeries={openSeriesInBook}", "onOpenSeries={() => undefined}", UT, "pulsar una serie no abre el libro"),
  m(V, `    setYear((current) => shiftYear(current, delta));
    setScope({ kind: "year" });`, "    setYear((current) => shiftYear(current, delta));", UT, "cambiar de año conserva el día elegido"),
  m(V, `    setYear(currentYear);
    setScope({ kind: "day", dateKey: today });`, '    setScope({ kind: "day", dateKey: today });', UT, "«Hoy» no vuelve al año actual"),
  m(V, "include: (task) => matchesTypeFilter(task, typeFilter, knownTypeIds),", "include: () => true,", UT, "el filtro por tipo no se aplica en la vista de año"),
  m(V, "today={todayParts && todayParts.year === year && todayParts.month === month ? today : null}", "today={today}", UT, "«hoy» se pasa a los doce meses (se redibujan todos)"),
  m(V, 'selectedDay={selectedDay && selectedDay.startsWith(`${year}-${String(month).padStart(2, "0")}-`) ? selectedDay : null}', "selectedDay={selectedDay}", UT, "el día elegido se pasa a los doce meses"),
  m(V, 'const handleSelectMonth = useCallback((month: number) => setScope({ kind: "month", month }), []);', 'const handleSelectMonth = useCallback((month: number) => setScope({ kind: "year" }), []);', UT, "pulsar el nombre de un mes no lo elige"),
  m(V, '          {scope.kind !== "year" && (', "          {false && (", UT, "no hay botón «Ver todo el año»"),
  m(V, "onPress={() => openDayInBook(scope.dateKey)}", "onPress={() => undefined}", UT, "«Abrir en el libro» no hace nada"),
  m(V, '{layout.orientation === "sideBySide" ? (', "{false ? (", UT, "nunca se dibuja en dos páginas"),
  m(V, "{spreadHeight > 0 && <BookSpine", "{false && <BookSpine", UT, "las dos páginas no llevan el lomo de aros"),
  m(V, "const monthSlot = calendarWidth > 0 ? (calendarWidth - PAGE_PADDING * 2) / layout.monthColumns : 0;", "const monthSlot = 0;", UT, "los meses no se dibujan"),
  m(V, "    useAgendaSectionStore.getState().setYearFocus({ year, scope });", "", UT, "no se recuerda dónde se estaba al ir al libro y volver"),
  m(V, "useState(savedFocus?.year ?? currentYear)", "useState(currentYear)", UT, "el año no se recupera al volver"),
  m(V, 'useState<YearScope>(savedFocus?.scope ?? { kind: "year" })', 'useState<YearScope>({ kind: "year" })', UT, "el día o mes elegido no se recupera al volver"),
  m(V, "onPress={() => setLandscape(!landscape)}", "onPress={() => setLandscape(true)}", UT, "el botón de horizontal no alterna"),
  m(V, "      {canRotate && (", "      {true && (", UT, "el botón de horizontal sale aunque no se pueda girar"),
  m(V, 'accessibilityLabel={tCommon(landscape ? "yearView.portraitLabel" : "yearView.landscapeLabel")}', 'accessibilityLabel={tCommon("yearView.landscapeLabel")}', UT, "el botón no cambia a «Vertical»"),
  m(MINI, "onPress={() => onSelectDay(dateKey)}", "onPress={() => undefined}", UT, "pulsar un día no lo elige"),
  m(MINI, "onPress={() => onSelectMonth(month)}", "onPress={() => undefined}", UT, "pulsar el título de un mes no lo elige"),
  m(LIST, "initialNumToRender={24}", "initialNumToRender={10}", UT, "la lista solo pinta 10 filas al principio"),

  // --- conmutador Libro/Año y contenido del libro
  m(TABS, 'onPress={view === "book" ? showBook : showYear}', 'onPress={view === "book" ? showYear : showBook}', NOTES_UI, "los botones Libro y Año están cruzados"),
  m(TABS, "const selected = inAgenda && agendaView === view;", "const selected = agendaView === view;", NOTES_UI, "Libro o Año aparece marcado dentro de las notas"),
  m(BOOK, '        {content === "year" && <YearView />}', "", BOOK_T, "la vista de año nunca se enseña"),
];
