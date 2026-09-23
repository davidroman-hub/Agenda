import { ThemedView } from "@/components/themed-view";
import React from "react";
import { StyleSheet, View } from "react-native";
import { styles } from "../bookStyles";
import BookPage from "./BookPage";

// Página sin nada que ver: mismas medidas que una real pero invisible
const blankPage = StyleSheet.create({
  style: {
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
});

interface BookSpreadProps {
  readonly days: Date[];
  readonly columns: number;
  readonly colorScheme: string;
  readonly colors: any;
  readonly dynamicStyles: any;
  // Copia solo para dibujar (la hoja que gira): ver BookPage
  readonly inert?: boolean;
  tAgenda: (key: string, options?: any) => string;
  tCommon: (key: string, options?: any) => string;
}

// Las páginas de una hoja del libro: con varias columnas, los días en filas lado a lado
// (como una agenda abierta, con el hueco del lomo en medio); en las demás, uno tras otro.
export default function BookSpread({
  days,
  columns,
  colorScheme,
  colors,
  dynamicStyles,
  inert,
  tAgenda,
  tCommon,
}: BookSpreadProps) {
  const pageProps = {
    columns,
    colorScheme,
    colors,
    dynamicStyles,
    inert,
    tAgenda,
    tCommon,
  };

  if (columns > 1) {
    return (
      <>
        {Array.from({ length: Math.ceil(days.length / columns) }, (_, rowIndex) => {
          // Las páginas de la fila; el lomo cae en medio (tras la mitad de las columnas)
          const half = columns / 2;

          return (
            <ThemedView key={`row-${rowIndex}`} style={styles.expandedContainer}>
              {Array.from({ length: columns }, (_, col) => {
                const dayIndex = rowIndex * columns + col;
                const day = days[dayIndex];

                return (
                  <React.Fragment key={col}>
                    {/* Hueco del lomo: los aros se dibujan encima (BookSpine) */}
                    {col === half && <ThemedView style={styles.spineGap} />}
                    {day ? (
                      <BookPage
                        {...pageProps}
                        day={day}
                        dayIndex={dayIndex}
                        isLeftPage={col < half}
                      />
                    ) : (
                      // Si la última fila no se llena, los huecos quedan en blanco para que las
                      // páginas no ocupen más ancho ni las cruce el lomo. Llevan el mismo padding
                      // y borde que una página real para repartir el ancho a partes iguales
                      <View
                        style={[
                          dynamicStyles.page,
                          col < half ? styles.leftPage : styles.rightPage,
                          blankPage.style,
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </ThemedView>
          );
        })}
      </>
    );
  }

  return (
    <>
      {days.map((day, dayIndex) => (
        <React.Fragment key={day.toISOString()}>
          <BookPage {...pageProps} day={day} dayIndex={dayIndex} />
          {/* Separador de página */}
          {dayIndex < days.length - 1 && <ThemedView style={styles.pageSeparator} />}
        </React.Fragment>
      ))}
    </>
  );
}
