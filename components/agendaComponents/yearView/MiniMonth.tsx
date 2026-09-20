import { DayMark, getMonthGrid, MonthMetrics } from "@/utils/year-view";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Los mismos colores que las marcas del calendario de la app: azul pendiente, verde hecho
const PENDING_COLOR = "#007AFF";
const DONE_COLOR = "#22C55E";

interface MiniMonthProps {
  readonly year: number;
  readonly month: number;
  readonly firstDay: 0 | 1;
  readonly monthName: string;
  readonly initials: readonly string[];
  readonly metrics: MonthMetrics;
  readonly marks: Readonly<Record<string, DayMark>>;
  // Solo se pasan al mes al que corresponden, para que cambiarlos no redibuje los otros once
  readonly today: string | null;
  readonly selectedDay: string | null;
  // El mes elegido (o el que contiene el día elegido)
  readonly highlighted: boolean;
  readonly textColor: string;
  readonly accent: string;
  readonly onSelectMonth: (month: number) => void;
  readonly onSelectDay: (dateKey: string) => void;
}

// Un mes en pequeño: el nombre (se puede pulsar para ver el mes) y sus días con una marca si tienen tareas
function MiniMonth({
  year,
  month,
  firstDay,
  monthName,
  initials,
  metrics,
  marks,
  today,
  selectedDay,
  highlighted,
  textColor,
  accent,
  onSelectMonth,
  onSelectDay,
}: MiniMonthProps) {
  const grid = useMemo(() => getMonthGrid(year, month, firstDay), [year, month, firstDay]);
  const { cellWidth, cellHeight, circleSize, fontSize } = metrics;

  return (
    <View style={{ width: cellWidth * 7 }}>
      <TouchableOpacity
        onPress={() => onSelectMonth(month)}
        accessibilityRole="button"
        accessibilityLabel={`${monthName} ${year}`}
        accessibilityState={{ selected: highlighted }}
        style={[
          styles.title,
          { height: metrics.titleHeight },
          highlighted && { backgroundColor: `${accent}22` },
        ]}
      >
        <Text style={[styles.titleText, { color: highlighted ? accent : textColor }]} numberOfLines={1}>
          {monthName}
        </Text>
      </TouchableOpacity>

      <View style={[styles.row, { height: metrics.weekdaysHeight }]}>
        {initials.map((initial, index) => (
          <Text key={index} style={[styles.weekday, { width: cellWidth, color: textColor }]}>
            {initial}
          </Text>
        ))}
      </View>

      {grid.map((week, weekIndex) => (
        <View key={weekIndex} style={[styles.row, { height: cellHeight }]}>
          {week.map((dateKey, dayIndex) => {
            if (dateKey === null) {
              return <View key={dayIndex} style={{ width: cellWidth, height: cellHeight }} />;
            }

            const mark = marks[dateKey] ?? "none";
            const isToday = dateKey === today;
            const isSelected = dateKey === selectedDay;
            const day = Number(dateKey.slice(8));

            return (
              <TouchableOpacity
                key={dayIndex}
                onPress={() => onSelectDay(dateKey)}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${monthName} ${year}`}
                accessibilityState={{ selected: isSelected }}
                style={[styles.cell, { width: cellWidth, height: cellHeight }]}
              >
                <View
                  style={[
                    styles.circle,
                    { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
                    isToday && { backgroundColor: accent },
                    isSelected && { borderColor: isToday ? textColor : accent, borderWidth: 1.5 },
                  ]}
                >
                  <Text
                    style={{
                      fontSize,
                      color: isToday ? "#ffffff" : textColor,
                      fontWeight: isToday || isSelected ? "700" : "400",
                    }}
                  >
                    {day}
                  </Text>
                </View>
                {mark !== "none" && (
                  <View
                    style={[styles.dot, { backgroundColor: mark === "done" ? DONE_COLOR : PENDING_COLOR }]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default React.memo(MiniMonth);

const styles = StyleSheet.create({
  title: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  titleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
  },
  weekday: {
    fontSize: 9,
    textAlign: "center",
    opacity: 0.55,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  // La marca de "este día tiene tareas", pegada al borde de abajo de la celda
  dot: {
    position: "absolute",
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
