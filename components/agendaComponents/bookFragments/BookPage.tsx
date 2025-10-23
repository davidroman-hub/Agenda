import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React from "react";
import { TouchableOpacity } from "react-native";
import { styles } from "../bookStyles";

interface BookPageProps {
  readonly day: Date;
  readonly dayIndex: number;
  readonly isLeftPage?: boolean;
  readonly viewMode: string;
  readonly colorScheme: string;
  readonly colors: any;
  readonly dynamicStyles: any;
}

export default function BookPage({ 
  day, 
  dayIndex, 
  isLeftPage = false, 
  viewMode, 
  colorScheme, 
  colors, 
  dynamicStyles 
}: BookPageProps) {
  
  const formatDate = (date: Date) => {
    const dayNames = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];

    const monthNames = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    return {
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      monthName: monthNames[date.getMonth()],
      year: date.getFullYear(),
    };
  };

  // Generar líneas para escritura (como en agenda real)
  const generateLines = () => {
    const lines = [];
    for (let i = 1; i <= 8; i++) {
      lines.push(i);
    }
    return lines;
  };

  const dateInfo = formatDate(day);
  
  // Determinar estilo de página según el modo de vista
  let pageStyle;
  if (viewMode === 'expanded') {
    if (isLeftPage) {
      pageStyle = [dynamicStyles.page, styles.leftPage];
    } else {
      pageStyle = [dynamicStyles.page, styles.rightPage];
    }
  } else {
    pageStyle = dynamicStyles.page;
  }
  
  return (
    <ThemedView 
      style={pageStyle}
    >
      {/* Encabezado de la página como agenda real */}
      <ThemedView
        style={[
          styles.pageHeader, 
          dynamicStyles.pageHeaderBorder,
          viewMode === 'expanded' ? styles.expandedPageHeader : null
        ]}
      >
        <ThemedText style={[
          styles.dayName,
          viewMode === 'expanded' ? styles.expandedDayName : null
        ]}>
          {dateInfo.dayName}
        </ThemedText>
        <ThemedView style={styles.dateContainer}>
          <ThemedText
            style={[
              styles.dayNumber, 
              dynamicStyles.dayNumber,
              viewMode === 'expanded' ? styles.expandedDayNumber : null
            ]}
          >
            {dateInfo.dayNumber}
          </ThemedText>
          <ThemedText style={[
            styles.monthYear,
            viewMode === 'expanded' ? styles.expandedMonthYear : null
          ]}>
            {dateInfo.monthName} {dateInfo.year}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Líneas de escritura como en agenda real */}
      <ThemedView style={styles.linesContainer}>
        {generateLines().map((lineNumber) => (
          <TouchableOpacity
            key={`${dayIndex}-line-${lineNumber}`}
            style={viewMode === 'expanded' ? 
              [dynamicStyles.line, styles.expandedLine] : 
              dynamicStyles.line
            }
            onPress={() => {
              console.log(
                `Agregar tarea en línea ${lineNumber} para ${dateInfo.dayName} ${dateInfo.dayNumber}`
              );
            }}
          >
            <ThemedText style={[
              styles.lineNumber,
              viewMode === 'expanded' ? styles.expandedLineNumber : null
            ]}>
              {lineNumber}
            </ThemedText>
            <ThemedView style={styles.writingLine}>
              {/* Contenido de ejemplo */}
              {dayIndex === 0 && lineNumber === 2 && (
                <ThemedText style={styles.taskText}>
                  📅 Reunión con el equipo - 10:00 AM
                </ThemedText>
              )}
              {dayIndex === 0 && lineNumber === 4 && (
                <ThemedText style={styles.taskText}>
                  ✅ Revisar reportes mensuales
                </ThemedText>
              )}
              {dayIndex === 1 && lineNumber === 3 && (
                <ThemedText style={styles.taskText}>
                  🎯 Presentación cliente importante - 2:00 PM
                </ThemedText>
              )}
              {dayIndex === 2 && lineNumber === 5 && (
                <ThemedText style={styles.taskText}>
                  💪 Gimnasio - 4:00 PM
                </ThemedText>
              )}
            </ThemedView>
          </TouchableOpacity>
        ))}
      </ThemedView>
    </ThemedView>
  );
}
