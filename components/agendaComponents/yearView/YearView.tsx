import { ThemedText } from "@/components/themed-text";
import { getCalendarLocale } from "@/components/calendar/calendarLocales";
import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { isLandscapeLockAvailable } from "@/services/screen-orientation";
import {
  openDayInBook,
  openEntryInBook,
  openSeriesInBook,
  toggleYearEntry,
} from "@/services/year-task-actions";
import useAgendaSectionStore from "@/stores/agenda-section-store";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import useTaskTypesStore from "@/stores/task-types-store";
import useThemeStore from "@/stores/theme-store";
import { getCurrentLocalDateString } from "@/utils/date-utils";
import { matchesTypeFilter, resolveFilter } from "@/utils/task-types";
import {
  buildListRows,
  buildYearIndex,
  formatDayLabel,
  getFirstDayOfWeek,
  getMonthMarks,
  getMonthMetrics,
  getStackedCalendarHeight,
  getYearLayout,
  monthRowIndex,
  parseDateKey,
  scopeDays,
  scopeMonth,
  scopeSeries,
  scopeStats,
  shiftYear,
  weekdayInitials,
  YearListRow,
  YearScope,
} from "@/utils/year-view";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import BookSpine from "../bookFragments/BookSpine";
import { getBookBackground, SPINE_WIDTH } from "../bookStyles";
import MiniMonth from "./MiniMonth";
import YearTasksList from "./YearTasksList";

const PAGE_PADDING = 8;
const MONTH_GAP = 8;
const HEADER_HEIGHT = 46;
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

// La vista de año: a un lado el calendario con los doce meses y al otro las tareas de lo que se elija
// (el año entero, un mes o un día). En el móvil van una encima de otra; en pantallas anchas, como las
// dos páginas de un libro abierto, con el lomo de aros en medio.
export default function YearView() {
  const { tCommon, currentLanguage } = useI18n();
  const { colorScheme } = useThemeStore();
  const { width } = useWindowDimensions();
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({}, "tint");

  const layout = getYearLayout(width);
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

  const rows = useMemo<YearListRow[]>(
    () => buildListRows(scopeDays(index, scope), scopeSeries(index, scope)),
    [index, scope]
  );
  const stats = useMemo(() => scopeStats(scopeDays(index, scope)), [index, scope]);

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
        <ThemedText style={styles.scopeTitle} numberOfLines={1}>
          {scopeTitle}
        </ThemedText>
        <ThemedText style={styles.summary}>
          {tCommon("yearView.summary", { total: stats.total, done: stats.completed })}
        </ThemedText>

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
        emptyText={tCommon("yearView.empty")}
        onToggle={toggleYearEntry}
        onOpen={openEntryInBook}
        onOpenSeries={openSeriesInBook}
        onScrollOffset={(offsetY) => {
          scrollY.value = offsetY;
        }}
        listRef={listRef}
        tCommon={tCommon}
      />
    </View>
  );

  const paperStyle = [styles.page, { backgroundColor: pageColor }];

  return (
    <View
      style={[styles.root, { backgroundColor: getBookBackground(colorScheme) }]}
      onLayout={(event: LayoutChangeEvent) => setRootHeight(event.nativeEvent.layout.height)}
    >
      {header}

      {layout.orientation === "sideBySide" ? (
        <View
          style={styles.spread}
          onLayout={(event: LayoutChangeEvent) => setSpreadHeight(event.nativeEvent.layout.height)}
        >
          <View style={[paperStyle, styles.leftPage]}>{calendarPage}</View>
          <View style={[paperStyle, styles.rightPage]}>{tasksPage}</View>
          {spreadHeight > 0 && <BookSpine height={spreadHeight} colorScheme={colorScheme} scrollY={scrollY} />}
        </View>
      ) : (
        <View style={styles.stacked}>
          <View style={[paperStyle, { height: getStackedCalendarHeight(rootHeight - HEADER_HEIGHT) }]}>
            {calendarPage}
          </View>
          <View style={[paperStyle, styles.stackedTasks]}>{tasksPage}</View>
        </View>
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
  leftPage: {
    flex: 1,
    marginRight: SPINE_WIDTH / 2,
  },
  rightPage: {
    flex: 1,
    marginLeft: SPINE_WIDTH / 2,
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
  scopeTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  summary: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
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
