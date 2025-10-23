import { ThemedView } from "@/components/themed-view";
import React from "react";
import { ScrollView } from "react-native";
import { styles } from "../bookStyles";
import BookPage from "./BookPage";

interface BookPagesContentProps {
  readonly days: Date[];
  readonly viewMode: string;
  readonly colorScheme: string;
  readonly colors: any;
  readonly dynamicStyles: any;
}

export default function BookPagesContent({ 
  days, 
  viewMode, 
  colorScheme, 
  colors, 
  dynamicStyles 
}: BookPagesContentProps) {
  
  return (
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
        // Vista normal: mostrar días uno tras otro
        days.map((day, dayIndex) => {
          return (
            <React.Fragment key={day.toISOString()}>
              <BookPage
                day={day}
                dayIndex={dayIndex}
                viewMode={viewMode}
                colorScheme={colorScheme}
                colors={colors}
                dynamicStyles={dynamicStyles}
              />
              {/* Separador de página */}
              {dayIndex < days.length - 1 && (
                <ThemedView style={styles.pageSeparator} />
              )}
            </React.Fragment>
          );
        })
      )}
    </ScrollView>
  );
}
