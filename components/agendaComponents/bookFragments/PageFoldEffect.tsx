import { ThemedView } from "@/components/themed-view";
import React from "react";
import { ScrollView } from "react-native";
import { styles } from "../bookStyles";
import BookPage from "./BookPage";

interface PageFoldEffectProps {
  readonly showPageTransition: boolean;
  readonly transitionProgress: number;
  readonly dynamicStyles: any;
  readonly days: Date[];
  readonly viewMode: string;
  readonly colorScheme: string;
  readonly colors: any;
}

export default function PageFoldEffect({ 
  showPageTransition, 
  transitionProgress, 
  dynamicStyles, 
  days, 
  viewMode,
  colorScheme,
  colors 
}: PageFoldEffectProps) {
  
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
                  {leftDay && (
                    <BookPage
                      day={leftDay}
                      dayIndex={pairIndex * 2}
                      isLeftPage={true}
                      viewMode={viewMode}
                      colorScheme={colorScheme}
                      colors={colors}
                      dynamicStyles={dynamicStyles}
                    />
                  )}
                  <ThemedView style={dynamicStyles.centerBinding}>
                    {Array.from({ length: 12 }, (_, index) => (
                      <ThemedView
                        key={`fold-spiral-${index}`}
                        style={index % 2 === 0 ? styles.spiralRing : styles.spiralRingAlt}
                      />
                    ))}
                  </ThemedView>
                  {rightDay && (
                    <BookPage
                      day={rightDay}
                      dayIndex={pairIndex * 2 + 1}
                      isLeftPage={false}
                      viewMode={viewMode}
                      colorScheme={colorScheme}
                      colors={colors}
                      dynamicStyles={dynamicStyles}
                    />
                  )}
                </ThemedView>
              );
            })}
          </>
        ) : (
          days.map((day, dayIndex) => (
            <React.Fragment key={`fold-${day.toISOString()}`}>
              <BookPage
                day={day}
                dayIndex={dayIndex}
                viewMode={viewMode}
                colorScheme={colorScheme}
                colors={colors}
                dynamicStyles={dynamicStyles}
              />
              {dayIndex < days.length - 1 && (
                <ThemedView style={styles.pageSeparator} />
              )}
            </React.Fragment>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}
