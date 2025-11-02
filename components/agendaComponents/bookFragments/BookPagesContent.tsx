import { ThemedView } from "@/components/themed-view";
import React from "react";
import { Dimensions, ScrollView } from "react-native";
import { styles } from "../bookStyles";
import BookPage from "./BookPage";

// Obtener dimensiones de la pantalla
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isSmallScreen = screenWidth < 500 || screenHeight < 900;
const isLargeScreen = screenWidth > 800;

interface BookPagesContentProps {
  readonly days: Date[];
  readonly viewMode: string;
  readonly colorScheme: string;
  readonly colors: any;
  readonly dynamicStyles: any;
  tAgenda: (key: string, options?: any) => string;
  tCommon: (key: string, options?: any) => string;
}

export default function BookPagesContent({
  days,
  viewMode,
  colorScheme,
  colors,
  dynamicStyles,
  tAgenda,
  tCommon,
}: BookPagesContentProps) {
  // Número de anillos del resorte según el tamaño de pantalla
  let spiralRingsCount = 12; // default
  if (isSmallScreen) {
    spiralRingsCount = 8;
  } else if (isLargeScreen) {
    spiralRingsCount = 16;
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Páginas de la agenda */}
      {viewMode === "expanded" ? (
        // Vista expandida: mostrar días en pares lado a lado (como agenda real)
        <>
          {Array.from(
            { length: Math.ceil(days.length / 2) },
            (_, pairIndex) => {
              const leftDay = days[pairIndex * 2];
              const rightDay = days[pairIndex * 2 + 1];

              return (
                <ThemedView
                  key={`pair-${pairIndex}`}
                  style={styles.expandedContainer}
                >
                  {/* Página izquierda */}
                  {leftDay && (
                    <BookPage
                      tCommon={tCommon}
                      tAgenda={tAgenda}
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
                    {/* Generar anillos del resorte con variación - menos anillos en pantallas pequeñas, más en grandes */}
                    {Array.from(
                      {
                        length: spiralRingsCount,
                      },
                      (_, index) => (
                        <ThemedView
                          key={`spiral-${index}`}
                          style={
                            index % 2 === 0
                              ? styles.spiralRing
                              : styles.spiralRingAlt
                          }
                        />
                      )
                    )}
                  </ThemedView>

                  {/* Página derecha */}
                  {rightDay && (
                    <BookPage
                      tCommon={tCommon}
                      day={rightDay}
                      dayIndex={pairIndex * 2 + 1}
                      isLeftPage={false}
                      viewMode={viewMode}
                      colorScheme={colorScheme}
                      colors={colors}
                      dynamicStyles={dynamicStyles}
                      tAgenda={tAgenda}
                    />
                  )}
                </ThemedView>
              );
            }
          )}
        </>
      ) : (
        // Vista normal: mostrar días uno tras otro
        days.map((day, dayIndex) => {
          return (
            <React.Fragment key={day.toISOString()}>
              <BookPage
                tAgenda={tAgenda}
                tCommon={tCommon}
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
