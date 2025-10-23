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
  const [isFlipping, setIsFlipping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showPageTransition, setShowPageTransition] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);

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

  // Funciones para navegación de páginas con efecto de doblez realista
  const goToNextPage = () => {
    setShowPageTransition(true);
    setTransitionProgress(0);
    
    // Efecto más rápido y suave
    const duration = 250;
    const steps = 10;
    
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        setTransitionProgress((i / steps) * 100);
        if (i === Math.floor(steps / 2)) {
          // Cambiar contenido en la mitad de la animación
          setCurrentPageIndex(prev => prev + 1);
        }
        if (i === steps) {
          // Terminar efecto
          setShowPageTransition(false);
          setTransitionProgress(0);
        }
      }, (duration / steps) * i);
    }
  };

  const goToPrevPage = () => {
    if (currentPageIndex === 0) return;
    
    setShowPageTransition(true);
    setTransitionProgress(0);
    
    // Efecto más rápido y suave para página anterior
    const duration = 250;
    const steps = 10;
    
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        setTransitionProgress((i / steps) * 100);
        if (i === Math.floor(steps / 2)) {
          // Cambiar contenido en la mitad de la animación
          setCurrentPageIndex(prev => Math.max(0, prev - 1));
        }
        if (i === steps) {
          // Terminar efecto
          setShowPageTransition(false);
          setTransitionProgress(0);
        }
      }, (duration / steps) * i);
    }
  };

  // Gesture handler para swipe que no interfiere con scroll vertical
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false, // No capturar inmediatamente
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const { dx, dy } = gestureState;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      // Solo activar si el movimiento horizontal es claramente mayor que el vertical
      // Y si el movimiento horizontal es significativo
      return absDx > 25 && absDx > absDy * 2; // Horizontal debe ser al menos 2x mayor que vertical
    },
    onPanResponderGrant: () => {
      setIsFlipping(true);
    },
    onPanResponderMove: (_, gestureState) => {
      const { dx } = gestureState;
      // Solo mostrar dirección si estamos seguros que es horizontal
      if (Math.abs(dx) > 30) {
        setSwipeDirection(dx > 0 ? 'right' : 'left');
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      setIsFlipping(false);
      setSwipeDirection(null);
      
      const { dx, vx } = gestureState;
      const threshold = 40; // Un poco más alto para ser más específico
      
      if (dx > threshold || vx > 0.8) {
        // Swipe derecha - página anterior
        goToPrevPage();
      } else if (dx < -threshold || vx < -0.8) {
        // Swipe izquierda - página siguiente
        goToNextPage();
      }
    },
    onPanResponderTerminate: () => {
      // Reset estados si el gesto es interrumpido
      setIsFlipping(false);
      setSwipeDirection(null);
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

  // Calcular offset para el efecto visual más pronunciado
  const getTranslateX = () => {
    if (swipeDirection === 'right') return 8;
    if (swipeDirection === 'left') return -8;
    return 0;
  };

  // Efecto de página doblándose - más realista
  const renderPageFoldEffect = () => {
    if (!showPageTransition) return null;
    
    // Calcular el progreso de la animación (0 a 1)
    const progress = transitionProgress / 100;
    
    // Crear efecto de doblez más suave y realista
    const scaleX = 1 - (progress * 0.3); // Reducción más sutil
    const rotateY = progress * 15; // Rotación más suave
    const translateX = progress * 50; // Movimiento más moderado
    const opacity = 1 - (progress * 0.8); // Desvanecimiento gradual
    
    return (
      <ThemedView 
        style={[
          dynamicStyles.pageTransition,
          {
            transform: [
              { translateX },
              { scaleX },
              { rotateY: `${rotateY}deg` }
            ],
            opacity: opacity,
            zIndex: 1000,
            shadowColor: "#000",
            shadowOffset: {
              width: progress * 10,
              height: progress * 5,
            },
            shadowOpacity: progress * 0.3,
            shadowRadius: progress * 8,
            elevation: progress * 10,
          }
        ]}
      >
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {/* Renderizar el contenido de la página actual que se está doblando */}
          {viewMode === 'expanded' ? (
            <>
              {Array.from({ length: Math.ceil(days.length / 2) }, (_, pairIndex) => {
                const leftDay = days[pairIndex * 2];
                const rightDay = days[pairIndex * 2 + 1];
                
                return (
                  <ThemedView key={`fold-pair-${pairIndex}`} style={styles.expandedContainer}>
                    {leftDay && renderPage(leftDay, pairIndex * 2, true)}
                    <ThemedView style={dynamicStyles.centerBinding}>
                      {Array.from({ length: 12 }, (_, index) => (
                        <ThemedView
                          key={`fold-spiral-${index}`}
                          style={index % 2 === 0 ? styles.spiralRing : styles.spiralRingAlt}
                        />
                      ))}
                    </ThemedView>
                    {rightDay && renderPage(rightDay, pairIndex * 2 + 1, false)}
                  </ThemedView>
                );
              })}
            </>
          ) : (
            days.map((day, dayIndex) => (
              <React.Fragment key={`fold-${day.toISOString()}`}>
                {renderPage(day, dayIndex)}
                {dayIndex < days.length - 1 && (
                  <ThemedView style={styles.pageSeparator} />
                )}
              </React.Fragment>
            ))
          )}
        </ScrollView>
      </ThemedView>
    );
  };

  return (
    <ThemedView 
      style={[
        dynamicStyles.container,
        {
          opacity: isFlipping ? 0.7 : 1,
          transform: [{ translateX: getTranslateX() }]
        }
      ]}
      {...panResponder.panHandlers}
    >
      {/* Efecto de página doblándose */}
      {renderPageFoldEffect()}
      
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
