import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useBookSettingsStore from "@/stores/boook-settings";
import React, { useState } from "react";
import { PanResponder, ScrollView, TouchableOpacity } from "react-native";
import BookActions from "./bookSettings";
import { createDynamicStyles, styles } from "./bookStyles";

export default function Book() {
  const { daysToShow, viewMode } = useBookSettingsStore();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // Obtener las fechas según la página actual
  const today = new Date();
  const days: Date[] = [];

  // Calcular el offset basado en la página actual y el modo de vista
  const startOffset = currentPageIndex * daysToShow;

  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + startOffset + i);
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

  // Funciones para navegación de páginas
  const goToNextPage = () => {
    setCurrentPageIndex(prev => prev + 1);
  };

  const goToPrevPage = () => {
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
  };

  // Gesture handler para swipe
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        // Swipe derecha - página anterior
        goToPrevPage();
      } else if (gestureState.dx < -50) {
        // Swipe izquierda - página siguiente
        goToNextPage();
      }
    },
  });

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
    <ThemedView style={dynamicStyles.container} {...panResponder.panHandlers}>
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
                  
                  {/* Línea central (como el resorte de cuaderno) */}
                  <ThemedView style={dynamicStyles.centerBinding}>
                    {/* Generar anillos del resorte con variación */}
                    {Array.from({ length: 12 }, (_, index) => (
                      <ThemedView
                        key={`spiral-${index}`}
                        style={index % 2 === 0 ? styles.spiralRing : styles.spiralRingAlt}
                      />
                    ))}
                  </ThemedView>
                  
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
      
      {/* Controles de navegación */}
      <ThemedView style={dynamicStyles.navigationControls}>
        <TouchableOpacity 
          style={[styles.navButton, currentPageIndex === 0 && styles.navButtonDisabled]}
          onPress={goToPrevPage}
          disabled={currentPageIndex === 0}
        >
          <ThemedText style={styles.navButtonText}>← Anterior</ThemedText>
        </TouchableOpacity>
        
        <ThemedView style={styles.pageIndicatorContainer}>
          <ThemedText style={styles.pageIndicator}>
            Página {currentPageIndex + 1}
          </ThemedText>
          <ThemedText style={styles.modeIndicator}>
            {(() => {
              if (viewMode === 'expanded') return '6 días';
              if (viewMode === 'single') return '1 día';
              return `${daysToShow} días`;
            })()}
          </ThemedText>
        </ThemedView>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={goToNextPage}
        >
          <ThemedText style={styles.navButtonText}>Siguiente →</ThemedText>
        </TouchableOpacity>
      </ThemedView>
      
      <BookActions />
    </ThemedView>
  );
}
