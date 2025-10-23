import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useBookSettingsStore from "@/stores/boook-settings";
import React from "react";
import {
    BookPagesContent,
    calculateDays,
    NavigationControls,
    PageFoldEffect,
    useBookPageLogic
} from "./bookFragments";
import BookActions from "./bookSettings";
import { createDynamicStyles } from "./bookStyles";

export default function Book() {
  const { daysToShow, viewMode } = useBookSettingsStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // Usar el hook personalizado para toda la lógica de páginas
  const {
    currentPageIndex,
    isFlipping,
    showPageTransition,
    transitionProgress,
    goToNextPage,
    goToPrevPage,
    panResponder,
    getTranslateX,
  } = useBookPageLogic();

  // Obtener las fechas según la página actual
  const days = calculateDays(currentPageIndex, daysToShow);

  // Crear estilos dinámicos basados en el tema
  const dynamicStyles = createDynamicStyles(colorScheme ?? "light", colors);

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
      <PageFoldEffect 
        showPageTransition={showPageTransition}
        transitionProgress={transitionProgress}
        dynamicStyles={dynamicStyles}
        days={days}
        viewMode={viewMode}
        colorScheme={colorScheme ?? "light"}
        colors={colors}
      />
      
      {/* Contenido principal de páginas */}
      <BookPagesContent 
        days={days}
        viewMode={viewMode}
        colorScheme={colorScheme ?? "light"}
        colors={colors}
        dynamicStyles={dynamicStyles}
      />
      
      {/* Controles de navegación */}
      <NavigationControls 
        currentPageIndex={currentPageIndex}
        daysToShow={daysToShow}
        viewMode={viewMode}
        dynamicStyles={dynamicStyles}
        goToPrevPage={goToPrevPage}
        goToNextPage={goToNextPage}
      />
      
      <BookActions />
    </ThemedView>
  );
}
