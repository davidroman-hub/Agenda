import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useBookSettingsStore from "@/stores/boook-settings";
import React from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import BookActions from "./bookSettings";
import { createDynamicStyles, styles } from "./bookStyles";

export default function Book() {
  const { daysToShow, viewMode } = useBookSettingsStore();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // Obtener la fecha actual y los próximos días
  const today = new Date();
  const days: Date[] = [];

  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }

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

  // Crear estilos dinámicos basados en el tema
  const dynamicStyles = createDynamicStyles(colorScheme ?? "light", colors);

  // Función para renderizar una página individual
  const renderPage = (day: Date, dayIndex: number, isLeftPage = false) => {
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
        key={day.toISOString()} 
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
  };

  return (
    <ThemedView style={dynamicStyles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Páginas de la agenda */}
        {viewMode === 'expanded' ? (
          // Vista expandida: mostrar días en pares lado a lado (como agenda real)
          <>
            {Array.from({ length: Math.ceil(days.length / 2) }, (_, pairIndex) => {
              const leftDay = days[pairIndex * 2];
              const rightDay = days[pairIndex * 2 + 1];
              
              return (
                <ThemedView key={`pair-${pairIndex}`} style={styles.expandedContainer}>
                  {/* Página izquierda */}
                  {leftDay && renderPage(leftDay, pairIndex * 2, true)}
                  
                  {/* Línea central (como el lomo de la agenda) */}
                  <ThemedView style={styles.centerBinding} />
                  
                  {/* Página derecha */}
                  {rightDay && renderPage(rightDay, pairIndex * 2 + 1, false)}
                </ThemedView>
              );
            })}
          </>
        ) : (
          // Vista normal: mostrar días uno tras otro
          days.map((day, dayIndex) => {
            const pageContent = renderPage(day, dayIndex);
            return (
              <React.Fragment key={day.toISOString()}>
                {pageContent}
                {/* Separador de página */}
                {dayIndex < days.length - 1 && (
                  <ThemedView style={styles.pageSeparator} />
                )}
              </React.Fragment>
            );
          })
        )}
      </ScrollView>
      <BookActions />
    </ThemedView>
  );
}
