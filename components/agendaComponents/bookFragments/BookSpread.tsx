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
  readonly viewMode: string;
  readonly colorScheme: string;
  readonly colors: any;
  readonly dynamicStyles: any;
  // Copia solo para dibujar (la hoja que gira): ver BookPage
  readonly inert?: boolean;
  tAgenda: (key: string, options?: any) => string;
  tCommon: (key: string, options?: any) => string;
}

// Las páginas de una hoja del libro: en vista expandida, los días de dos en dos lado a lado
// (como una agenda abierta, con el hueco del lomo en medio); en las demás, uno tras otro.
export default function BookSpread({
  days,
  viewMode,
  colorScheme,
  colors,
  dynamicStyles,
  inert,
  tAgenda,
  tCommon,
}: BookSpreadProps) {
  const pageProps = {
    viewMode,
    colorScheme,
    colors,
    dynamicStyles,
    inert,
    tAgenda,
    tCommon,
  };

  if (viewMode === "expanded") {
    return (
      <>
        {Array.from({ length: Math.ceil(days.length / 2) }, (_, pairIndex) => {
          const leftDay = days[pairIndex * 2];
          const rightDay = days[pairIndex * 2 + 1];

          return (
            <ThemedView key={`pair-${pairIndex}`} style={styles.expandedContainer}>
              {leftDay && (
                <BookPage
                  {...pageProps}
                  day={leftDay}
                  dayIndex={pairIndex * 2}
                  isLeftPage={true}
                />
              )}

              {/* Hueco del lomo: los aros se dibujan encima (BookSpine) */}
              <ThemedView style={styles.spineGap} />

              {rightDay ? (
                <BookPage
                  {...pageProps}
                  day={rightDay}
                  dayIndex={pairIndex * 2 + 1}
                  isLeftPage={false}
                />
              ) : (
                // Con un número impar de días la última página queda sola: la derecha se deja
                // en blanco para que no ocupe todo el ancho ni la cruce el lomo. Lleva el mismo
                // padding y borde que una página real para repartir el ancho a partes iguales
                <View
                  style={[dynamicStyles.page, styles.rightPage, blankPage.style]}
                />
              )}
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
