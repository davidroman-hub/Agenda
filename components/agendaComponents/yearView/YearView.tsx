import { ThemedText } from "@/components/themed-text";
import { getCalendarLocale } from "@/components/calendar/calendarLocales";
import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { isLandscapeLockAvailable } from "@/services/screen-orientation";
import { openDayInBook, toggleYearEntry } from "@/services/year-task-actions";
import useAgendaSectionStore from "@/stores/agenda-section-store";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import useTaskTypesStore from "@/stores/task-types-store";
import useYearSplitStore from "@/stores/year-split-store";
import useThemeStore from "@/stores/theme-store";
import { getCurrentLocalDateString } from "@/utils/date-utils";
import { matchesTypeFilter, resolveFilter } from "@/utils/task-types";
import {
  buildListRows,
  buildYearIndex,
  clampCalendarShare,
  filterDaysByStatus,
  getDefaultCalendarShare,
  formatDayLabel,
  getFirstDayOfWeek,
  getMonthMarks,
  getMonthMetrics,
  getSideSplit,
  getStackedCalendarBounds,
  getStackedCalendarHeight,
  getYearLayout,
  isCompactSpread,
  monthRowIndex,
  parseDateKey,
  scopeDays,
  scopeMonth,
  scopeSeries,
  scopeStats,
  shiftYear,
  SIDE_HANDLE_WIDTH,
  weekdayInitials,
  YearEntry,
  YearListRow,
  YearScope,
  YearSeries,
  YearStatusFilter,
} from "@/utils/year-view";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  LayoutChangeEvent,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import BookSpine from "../bookFragments/BookSpine";
import DayTaskEditModal, { resolveDayEditTarget } from "../bookFragments/DayTaskEditModal";
import {
  COMPACT_RING_WIDTH,
  COMPACT_SPINE_WIDTH,
  getBookBackground,
  RING_PITCH,
  RING_WIDTH,
  SPINE_WIDTH,
} from "../bookStyles";
import MiniMonth from "./MiniMonth";
import YearTasksList from "./YearTasksList";

const PAGE_PADDING = 8;
const MONTH_GAP = 8;
const HEADER_HEIGHT = 46;
const SPLIT_HANDLE_WIDTH = 28;
const COMPACT_SPINE_MARGIN = 2; // aire del lomo compacto con cada página
const COMPACT_SPINE_GAP = COMPACT_SPINE_WIDTH + COMPACT_SPINE_MARGIN * 2; // lomo compacto y sus márgenes; los aros grandes ya llevan SPINE_WIDTH
// Las argollas van más separadas que en el libro, para que no tapen el asa de estirar ni se amontonen
const COMPACT_RING_PITCH = 32;
const RING_PITCH_WIDE = Math.round(RING_PITCH * 1.4);
const SPREAD_PADDING = 8;
const DOUBLE_TAP_MS = 300;
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

// La vista de año: a un lado el calendario con los doce meses y al otro las tareas de lo que se elija
// (el año entero, un mes o un día). En el móvil van una encima de otra; en pantallas anchas, como las
// dos páginas de un libro abierto, con el lomo de aros en medio.
export default function YearView() {
  const { tCommon, currentLanguage } = useI18n();
  const { colorScheme } = useThemeStore();
  const { width, height: windowHeight } = useWindowDimensions();
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({}, "tint");
  const addBackground = useThemeColor({}, "accent");
  const addForeground = useThemeColor({}, "onAccent");

  const baseLayout = getYearLayout(width);
  const compact = isCompactSpread(width, windowHeight);
  const layout = compact ? { ...baseLayout, monthColumns: 1 } : baseLayout;
  const locale = getCalendarLocale(currentLanguage);
  const firstDay = getFirstDayOfWeek(currentLanguage);
  const initials = useMemo(() => weekdayInitials(locale.dayNamesShort, firstDay), [locale, firstDay]);

  const today = getCurrentLocalDateString();
  const todayParts = parseDateKey(today);
  const currentYear = todayParts?.year ?? new Date().getFullYear();

  // Se empieza donde se estaba la última vez (al volver del libro), o en el año actual
  const [savedFocus] = useState(() => useAgendaSectionStore.getState().yearFocus);
  const [year, setYear] = useState(savedFocus?.year ?? currentYear);
  const [scope, setScope] = useState<YearScope>(savedFocus?.scope ?? { kind: "year" });

  useEffect(() => {
    useAgendaSectionStore.getState().setYearFocus({ year, scope });
  }, [year, scope]);

  // El botón de horizontal solo sale donde se puede girar la pantalla (y con un binario que lleva el módulo)
  const canRotate = useMemo(() => isLandscapeLockAvailable(), []);
  const landscape = useAgendaSectionStore((state) => state.landscapeYear);
  const setLandscape = useAgendaSectionStore((state) => state.setLandscapeYear);

  // Medidas del contenedor, para repartir el espacio
  const [rootHeight, setRootHeight] = useState(0);
  const [spreadHeight, setSpreadHeight] = useState(0);
  const [calendarWidth, setCalendarWidth] = useState(0);
  const [spreadWidth, setSpreadWidth] = useState(0);

  // Cuánto ancho se lleva el calendario: el que elija el usuario arrastrando el lomo, o el de por defecto
  const savedShare = useYearSplitStore((state) => state.calendarShare);
  const setSavedShare = useYearSplitStore((state) => state.setCalendarShare);
  const savedStackedShare = useYearSplitStore((state) => state.stackedShare);
  const setSavedStackedShare = useYearSplitStore((state) => state.setStackedShare);
  const [dragStackedHeight, setDragStackedHeight] = useState<number | null>(null);
  const [dragShare, setDragShare] = useState<number | null>(null);
  const calendarShare = clampCalendarShare(dragShare ?? savedShare ?? getDefaultCalendarShare(compact));

  // Los mismos datos (y el mismo filtro por tipo) que el libro y el calendario
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  const patterns = useRepeatingTasksStore((state) => state.repeatingPatterns);
  const completions = useRepeatingTasksStore((state) => state.repeatingTaskCompletions);
  const types = useTaskTypesStore((state) => state.types);
  const activeFilter = useTaskTypesStore((state) => state.activeFilter);

  const knownTypeIds = useMemo(() => new Set(types.map((type) => type.id)), [types]);
  const typeColorById = useMemo(() => new Map(types.map((type) => [type.id, type.color])), [types]);
  const typeFilter = resolveFilter(activeFilter, knownTypeIds);

  const index = useMemo(
    () =>
      buildYearIndex({
        year,
        tasksByDate,
        patterns,
        completions,
        include: (task) => matchesTypeFilter(task, typeFilter, knownTypeIds),
      }),
    [year, tasksByDate, patterns, completions, typeFilter, knownTypeIds]
  );

  const monthMarks = useMemo(() => MONTHS.map((month) => getMonthMarks(index, month)), [index]);

  // Filtro por estado, con las tres palabras del resumen: "Tareas" enseña todas y "Hechas" o "Faltantes"
  // filtran; volver a tocar el filtro puesto también lo quita
  const [statusFilter, setStatusFilter] = useState<YearStatusFilter>("all");
  const selectStatus = (status: YearStatusFilter) =>
    setStatusFilter((current) => (current === status ? "all" : status));

  const scopedDays = useMemo(() => scopeDays(index, scope), [index, scope]);
  // Las series que se repiten no tienen estado propio, así que con un filtro activo no se muestran
  const rows = useMemo<YearListRow[]>(
    () =>
      buildListRows(
        filterDaysByStatus(scopedDays, statusFilter),
        statusFilter === "all" ? scopeSeries(index, scope) : []
      ),
    [scopedDays, statusFilter, index, scope]
  );
  const stats = useMemo(() => scopeStats(scopedDays), [scopedDays]);

  // Medidas de cada mes según el ancho que tiene la página del calendario
  const monthSlot = calendarWidth > 0 ? (calendarWidth - PAGE_PADDING * 2) / layout.monthColumns : 0;
  const metrics = useMemo(() => getMonthMetrics(monthSlot - MONTH_GAP), [monthSlot]);

  // El lomo de aros se mueve con la lista de tareas, como con las páginas del libro
  const scrollY = useSharedValue(0);
  const listRef = useRef<FlatList<YearListRow>>(null);
  const calendarRef = useRef<ScrollView>(null);
  const didScrollToMonth = useRef(false);

  // Al cambiar de ámbito o de año la lista vuelve arriba
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    scrollY.value = 0;
  }, [scope, year, scrollY]);

  // Al abrir el año actual, el calendario se sitúa en el mes de hoy. Se intenta al montar (cuando el
  // contenido ya tiene tamaño) y al volver al año actual desde otro, donde el tamaño no cambia
  const todayMonth = todayParts?.month;
  const scrollCalendarToCurrentMonth = useCallback(() => {
    if (didScrollToMonth.current || year !== currentYear || !todayMonth || monthSlot <= 0) return;
    didScrollToMonth.current = true;
    const y = monthRowIndex(todayMonth, layout.monthColumns) * metrics.monthHeight;
    calendarRef.current?.scrollTo({ y, animated: false });
  }, [year, currentYear, todayMonth, monthSlot, layout.monthColumns, metrics.monthHeight]);

  useEffect(() => {
    didScrollToMonth.current = false;
    scrollCalendarToCurrentMonth();
  }, [scrollCalendarToCurrentMonth]);

  // La tarea se edita aquí mismo, sin pasar por el libro: montarlo (y a veces girar la pantalla) con el
  // modal abriéndose a la vez era lo que hacía que tardara tanto en abrirse y cerrarse
  const [editing, setEditing] = useState<{ dateKey: string; line: number; text: string } | null>(null);
  const openEditor = useCallback((dateKey: string, taskId: string) => {
    const target = resolveDayEditTarget(dateKey, taskId);
    if (target) setEditing({ dateKey, line: target.line, text: target.text });
  }, []);
  const handleOpenEntry = useCallback(
    (entry: YearEntry) => openEditor(entry.dateKey, entry.task.repeatingTaskId ?? entry.task.id),
    [openEditor]
  );
  const handleOpenSeries = useCallback(
    (series: YearSeries) => openEditor(series.firstDateKey, series.originalId),
    [openEditor]
  );
  // Tarea nueva en un día: en su primera línea libre; si están todas ocupadas, se abre una línea extra
  const addTaskToDay = useCallback((dateKey: string) => {
    let target = resolveDayEditTarget(dateKey, null);
    if (!target) {
      const tasks = useAgendaTasksStore.getState();
      tasks.setAdditionalLinesForDate(dateKey, tasks.getAdditionalLinesForDate(dateKey) + 1);
      target = resolveDayEditTarget(dateKey, null);
    }
    if (target) setEditing({ dateKey, line: target.line, text: "" });
  }, []);
  const closeEditor = useCallback(() => setEditing(null), []);

  const changeYear = (delta: number) => {
    setYear((current) => shiftYear(current, delta));
    setScope({ kind: "year" });
  };

  const goToToday = () => {
    setYear(currentYear);
    setScope({ kind: "day", dateKey: today });
  };

  const handleSelectDay = useCallback((dateKey: string) => setScope({ kind: "day", dateKey }), []);
  const handleSelectMonth = useCallback((month: number) => setScope({ kind: "month", month }), []);

  const highlightedMonth = scopeMonth(scope);
  const selectedDay = scope.kind === "day" ? scope.dateKey : null;

  const scopeTitle = (() => {
    if (scope.kind === "month") {
      return tCommon("yearView.titleMonth", { month: locale.monthNames[scope.month - 1], year });
    }
    if (scope.kind === "day") {
      return tCommon("yearView.titleDay", { date: formatDayLabel(scope.dateKey, locale) });
    }
    return tCommon("yearView.titleYear", { year });
  })();

  const pageColor = colorScheme === "dark" ? "#2c2c2c" : "#ffffff";

  const header = (
    <View style={[styles.header, { height: HEADER_HEIGHT }]}>
      <TouchableOpacity
        onPress={() => changeYear(-1)}
        accessibilityRole="button"
        accessibilityLabel={tCommon("yearView.prevYear")}
        hitSlop={10}
      >
        <ThemedText style={styles.arrow}>‹</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setScope({ kind: "year" })}
        accessibilityRole="button"
        accessibilityLabel={tCommon("yearView.titleYear", { year })}
      >
        <ThemedText style={styles.year}>{year}</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => changeYear(1)}
        accessibilityRole="button"
        accessibilityLabel={tCommon("yearView.nextYear")}
        hitSlop={10}
      >
        <ThemedText style={styles.arrow}>›</ThemedText>
      </TouchableOpacity>

      <View style={styles.spacer} />

      {canRotate && (
        <TouchableOpacity
          onPress={() => setLandscape(!landscape)}
          accessibilityRole="button"
          accessibilityState={{ selected: landscape }}
          accessibilityLabel={tCommon(landscape ? "yearView.portraitLabel" : "yearView.landscapeLabel")}
          style={[
            styles.todayButton,
            { borderColor: accent },
            landscape && { backgroundColor: `${accent}22` },
          ]}
        >
          <ThemedText style={[styles.todayText, { color: accent }]}>
            {landscape ? "↕" : "↔"} {tCommon(landscape ? "yearView.portrait" : "yearView.landscape")}
          </ThemedText>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={goToToday}
        accessibilityRole="button"
        style={[styles.todayButton, { borderColor: accent }]}
      >
        <ThemedText style={[styles.todayText, { color: accent }]}>{tCommon("yearView.today")}</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const calendarPage = (
    <ScrollView
      ref={calendarRef}
      accessibilityLabel={tCommon("yearView.calendarLabel")}
      showsVerticalScrollIndicator={false}
      onLayout={(event: LayoutChangeEvent) => setCalendarWidth(event.nativeEvent.layout.width)}
      onContentSizeChange={scrollCalendarToCurrentMonth}
      contentContainerStyle={styles.months}
    >
      {monthSlot > 0 &&
        MONTHS.map((month) => (
          <View key={month} style={{ width: monthSlot, alignItems: "center" }}>
            <MiniMonth
              year={year}
              month={month}
              firstDay={firstDay}
              monthName={locale.monthNames[month - 1]}
              initials={initials}
              metrics={metrics}
              marks={monthMarks[month - 1]}
              today={todayParts && todayParts.year === year && todayParts.month === month ? today : null}
              selectedDay={selectedDay && selectedDay.startsWith(`${year}-${String(month).padStart(2, "0")}-`) ? selectedDay : null}
              highlighted={highlightedMonth === month}
              textColor={textColor}
              accent={accent}
              onSelectMonth={handleSelectMonth}
              onSelectDay={handleSelectDay}
            />
          </View>
        ))}
    </ScrollView>
  );

  const tasksPage = (
    <View style={styles.tasksPage}>
      <View style={styles.tasksHeader}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.scopeTitle, styles.titleText]} numberOfLines={1}>
            {scopeTitle}
          </ThemedText>
          {scope.kind === "day" && scope.dateKey >= today && (
            <TouchableOpacity
              onPress={() => addTaskToDay(scope.dateKey)}
              accessibilityRole="button"
              accessibilityLabel={tCommon("yearView.addTask")}
              hitSlop={8}
              style={[styles.addButton, { backgroundColor: addBackground }]}
            >
              <ThemedText style={[styles.addButtonText, { color: addForeground }]}>+</ThemedText>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.summaryRow}>
          {(
            [
              { status: "all", label: tCommon("yearView.summaryTotal", { total: stats.total }) },
              { status: "done", label: tCommon("yearView.summaryDone", { done: stats.completed }) },
              { status: "pending", label: tCommon("yearView.summaryPending", { pending: stats.total - stats.completed }) },
            ] as const
          ).map(({ status, label }, position) => (
            <React.Fragment key={status}>
              {position > 0 && <ThemedText style={styles.summary}>·</ThemedText>}
              <TouchableOpacity
                onPress={() => selectStatus(status)}
                accessibilityRole="button"
                accessibilityState={{ selected: statusFilter === status }}
                hitSlop={6}
              >
                <ThemedText
                  style={[styles.summary, styles.summaryLink, statusFilter === status && { color: accent, opacity: 1 }]}
                >
                  {label}
                </ThemedText>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.tasksActions}>
          {scope.kind !== "year" && (
            <TouchableOpacity
              onPress={() => setScope({ kind: "year" })}
              accessibilityRole="button"
              style={[styles.chip, { borderColor: accent }]}
            >
              <ThemedText style={[styles.chipText, { color: accent }]}>{tCommon("yearView.showYear")}</ThemedText>
            </TouchableOpacity>
          )}
          {scope.kind === "day" && (
            <TouchableOpacity
              onPress={() => openDayInBook(scope.dateKey)}
              accessibilityRole="button"
              style={[styles.chip, { borderColor: accent }]}
            >
              <ThemedText style={[styles.chipText, { color: accent }]}>{tCommon("yearView.openInBook")}</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <YearTasksList
        rows={rows}
        names={locale}
        typeColorById={typeColorById}
        accent={accent}
        // Con un filtro activo, "no hay tareas" sería mentira: las hay, pero son de la otra clase
        emptyText={tCommon(statusFilter === "all" ? "yearView.empty" : "yearView.emptyFiltered")}
        onToggle={toggleYearEntry}
        onOpen={handleOpenEntry}
        onOpenSeries={handleOpenSeries}
        // En un día el "+" ya está en el título; en un mes o en el año, uno por cada fecha de la lista.
        // Solo de hoy en adelante
        onAddToDay={scope.kind === "day" ? undefined : addTaskToDay}
        addFromDate={today}
        onScrollOffset={(offsetY) => {
          scrollY.value = offsetY;
        }}
        listRef={listRef}
        tCommon={tCommon}
      />
    </View>
  );

  // El reparto en horizontal sale del ancho del calendario, que se pone explícito: con una fracción de
  // `flex` las páginas no se repartían como se calculaba y el asa se quedaba lejos del lomo. El asa va
  // pegada a las argollas y el ancho repartible (el que usa el arrastre) es el de las dos páginas
  const split = getSideSplit({
    spreadWidth,
    padding: SPREAD_PADDING,
    share: calendarShare,
    seamGap: compact ? COMPACT_SPINE_GAP : SPINE_WIDTH,
    ringWidth: compact ? COMPACT_RING_WIDTH : RING_WIDTH,
  });
  // Lo que queda entre la página del calendario y el lomo, y lo que el lomo ocupa en el flujo
  const marginBeforeSpine = compact ? COMPACT_SPINE_MARGIN : SPINE_WIDTH / 2;
  const spineInFlow = compact ? COMPACT_SPINE_WIDTH : 0;
  const spanRef = useRef(split.span);
  spanRef.current = split.span;
  const shareRef = useRef(calendarShare);
  shareRef.current = calendarShare;
  const defaultShareRef = useRef(getDefaultCalendarShare(compact));
  defaultShareRef.current = getDefaultCalendarShare(compact);
  const lastTap = useRef(0);

  // Arrastrar el lomo cambia el reparto; se guarda al soltar. Dos toques seguidos lo devuelven al de por defecto
  const splitResponder = useMemo(() => {
    let startShare = 0.5;
    let latest: number | null = null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startShare = shareRef.current;
        latest = null;
      },
      onPanResponderMove: (_event, gesture) => {
        latest = clampCalendarShare(startShare + gesture.dx / spanRef.current);
        setDragShare(latest);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (latest !== null) {
          setSavedShare(latest);
        } else if (Math.abs(gesture.dx) < 4) {
          const now = Date.now();
          if (now - lastTap.current < DOUBLE_TAP_MS) {
            setSavedShare(null);
            lastTap.current = 0;
          } else {
            lastTap.current = now;
          }
        }
        setDragShare(null);
      },
      onPanResponderTerminate: () => setDragShare(null),
    });
  }, [setSavedShare]);

  // En vertical el calendario va encima: se ajusta su alto, entre un mes entero y lo que deje sitio a la lista
  const stackedTotal = Math.max(0, rootHeight - HEADER_HEIGHT);
  const stackedBounds = getStackedCalendarBounds(stackedTotal, metrics.monthHeight);
  const stackedDefault = getStackedCalendarHeight(stackedTotal);
  const stackedHeight = Math.min(
    stackedBounds.max,
    Math.max(
      stackedBounds.min,
      dragStackedHeight ?? (savedStackedShare != null && stackedTotal > 0 ? savedStackedShare * stackedTotal : stackedDefault)
    )
  );
  const stackedRef = useRef({ height: stackedHeight, total: stackedTotal, min: stackedBounds.min, max: stackedBounds.max });
  stackedRef.current = { height: stackedHeight, total: stackedTotal, min: stackedBounds.min, max: stackedBounds.max };

  const stackedResponder = useMemo(() => {
    let startHeight = 0;
    let latest: number | null = null;
    let lastStackedTap = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startHeight = stackedRef.current.height;
        latest = null;
      },
      onPanResponderMove: (_event, gesture) => {
        const { min, max } = stackedRef.current;
        latest = Math.min(max, Math.max(min, startHeight + gesture.dy));
        setDragStackedHeight(latest);
      },
      onPanResponderRelease: (_event, gesture) => {
        const { total } = stackedRef.current;
        if (latest !== null && total > 0) {
          setSavedStackedShare(latest / total);
        } else if (Math.abs(gesture.dy) < 4) {
          const now = Date.now();
          if (now - lastStackedTap < DOUBLE_TAP_MS) {
            setSavedStackedShare(null);
            lastStackedTap = 0;
          } else {
            lastStackedTap = now;
          }
        }
        setDragStackedHeight(null);
      },
      onPanResponderTerminate: () => setDragStackedHeight(null),
    });
  }, [setSavedStackedShare]);

  const paperStyle = [styles.page, { backgroundColor: pageColor }];

  return (
    <View
      style={[styles.root, { backgroundColor: getBookBackground(colorScheme) }]}
      onLayout={(event: LayoutChangeEvent) => setRootHeight(event.nativeEvent.layout.height)}
    >
      {header}

      {layout.orientation === "sideBySide" ? (
        <View
          testID="year-spread"
          style={styles.spread}
          onLayout={(event: LayoutChangeEvent) => {
            setSpreadHeight(event.nativeEvent.layout.height);
            setSpreadWidth(event.nativeEvent.layout.width);
          }}
        >
          {/* Sin medir todavía el contenedor, un reparto provisional; después, anchos explícitos */}
          <View
            testID="year-calendar-page"
            style={[
              paperStyle,
              { marginRight: marginBeforeSpine },
              spreadWidth > 0 ? { width: split.calendarWidth } : { flex: calendarShare },
            ]}
          >
            {calendarPage}
          </View>
          {compact && spreadHeight > 0 && (
            <BookSpine
              compact
              ringPitch={COMPACT_RING_PITCH}
              height={spreadHeight}
              colorScheme={colorScheme}
              scrollY={scrollY}
            />
          )}
          <View
            style={[
              paperStyle,
              { marginLeft: split.gap - marginBeforeSpine - spineInFlow },
              spreadWidth > 0 ? styles.fill : { flex: 1 - calendarShare },
            ]}
          >
            {tasksPage}
          </View>
          {!compact && spreadHeight > 0 && (
            <View pointerEvents="none" style={[styles.spineAnchor, { left: split.spineCenter }]}>
              <BookSpine
                ringPitch={RING_PITCH_WIDE}
                height={spreadHeight}
                colorScheme={colorScheme}
                scrollY={scrollY}
              />
            </View>
          )}
          {spreadWidth > 0 && (
            <View
              {...splitResponder.panHandlers}
              testID="year-split-handle"
              accessibilityRole="adjustable"
              accessibilityLabel={tCommon("yearView.resizeLabel")}
              style={[styles.splitHandle, { left: split.handleLeft }]}
            >
              <View style={styles.splitGrip} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.stacked}>
          <View style={[paperStyle, { height: stackedHeight }]}>{calendarPage}</View>
          <View style={[paperStyle, styles.stackedTasks]}>{tasksPage}</View>
          {stackedTotal > 0 && (
            <View
              {...stackedResponder.panHandlers}
              accessibilityRole="adjustable"
              accessibilityLabel={tCommon("yearView.resizeLabel")}
              style={[styles.stackedHandle, { top: stackedHeight + 4 - SPLIT_HANDLE_WIDTH / 2 }]}
            >
              <View style={styles.stackedGrip} />
            </View>
          )}
        </View>
      )}

      {editing && (
        <DayTaskEditModal
          tCommon={tCommon}
          dateKey={editing.dateKey}
          visible
          editingLine={editing.line}
          initialText={editing.text}
          onClose={closeEditor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
  },
  arrow: {
    fontSize: 26,
    lineHeight: 30,
  },
  year: {
    fontSize: 20,
    fontWeight: "700",
  },
  spacer: {
    flex: 1,
  },
  todayButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  todayText: {
    fontSize: 13,
    fontWeight: "600",
  },
  page: {
    borderRadius: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  // Dos páginas de un libro abierto: cada una llega hasta el lomo de aros del centro
  spread: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  // La página que se queda con lo que deja el calendario
  fill: {
    flex: 1,
  },
  // El punto de anclaje del lomo grande: un ancla sin ancho, para que su "50%" caiga justo en la costura
  spineAnchor: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 0,
  },
  // El asa de estirar en horizontal: una franja de todo el alto, pegada a las argollas, para agarrarla
  // desde cualquier punto del lomo
  splitHandle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SIDE_HANDLE_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  stackedHandle: {
    position: "absolute",
    left: 0,
    right: 0,
    height: SPLIT_HANDLE_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  stackedGrip: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.55)",
  },
  splitGrip: {
    width: 5,
    height: 48,
    borderRadius: 2.5,
    backgroundColor: "rgba(128,128,128,0.8)",
  },
  stacked: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
  },
  stackedTasks: {
    flex: 1,
  },
  months: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 6,
    paddingBottom: 12,
  },
  tasksPage: {
    flex: 1,
  },
  tasksHeader: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleText: {
    flex: 1,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "600",
  },
  scopeTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  summary: {
    fontSize: 12,
    opacity: 0.6,
  },
  summaryLink: {
    textDecorationLine: "underline",
  },
  tasksActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
