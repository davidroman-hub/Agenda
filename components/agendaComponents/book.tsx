import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useWidgetSync } from '@/hooks/use-widget-sync';
import useBookSettingsStore from "@/stores/boook-settings";
import useFontSettingsStore, { FONT_SIZES } from "@/stores/font-settings-store";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  BookPagesContent,
  calculateDays,
  NavigationControls,
  PageFoldEffect,
  useBookPageLogic,
} from "./bookFragments";
import BookActions from "./bookSettings";
import { createDynamicStyles } from "./bookStyles";

export default function Book() {
  const { daysToShow, viewMode } = useBookSettingsStore();
  const { taskFontSize } = useFontSettingsStore(); // Suscribirse al valor directamente para trigger re-render
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  
  // Hook para sincronización del widget
  const { forceSyncWidget } = useWidgetSync();

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

  // Crear estilos dinámicos basados en el tema y configuración de fuente
  const fontMultiplier = FONT_SIZES[taskFontSize].multiplier;
  const dynamicStyles = createDynamicStyles(colorScheme ?? "light", colors, fontMultiplier);

  return (
    <View style={styles.container}>
      <ThemedView
        style={[
          dynamicStyles.container,
          {
            opacity: isFlipping ? 0.7 : 1,
            transform: [{ translateX: getTranslateX() }],
          },
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
        
        {/* Botón temporal de debug para sincronización del widget */}
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={() => {
            forceSyncWidget();
          }}
        >
          <Text style={styles.debugButtonText}>Sync Widget</Text>
        </TouchableOpacity>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  notificationButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 9999,
    borderWidth: 2,
    borderColor: "#fff",
  },
  notificationIcon: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ff4444",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
  },
  debugButton: {
    position: "absolute",
    bottom: 160,
    right: 20,
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 9999,
  },
  debugButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
