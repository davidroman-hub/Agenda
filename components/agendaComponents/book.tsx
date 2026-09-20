import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  useDateMigration,
  useForceDateMigration,
} from "@/hooks/use-date-migration";
import { useI18n } from "@/hooks/use-i18n";
import { useRepeatedTaskNotifications } from "@/hooks/use-repeated-task-notifications";
import { useWidgetSync } from "@/hooks/use-widget-sync";
import useBookNavigationStore from "@/stores/book-navigation-store";
import useBookSettingsStore from "@/stores/boook-settings";
import useFontSettingsStore, { FONT_SIZES } from "@/stores/font-settings-store";
import { getPageIndexForDate } from "@/utils/book-navigation";
import { getCurrentLocalDateString } from "@/utils/date-utils";
import {
  debugCurrentDateIssues,
  testDateUtils,
  testMidnightTransition,
} from "@/utils/date-testing";
import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
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
  
  // Estado para el scroll del book
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const handleScrollChange = (progress: number, atBottom: boolean) => {
    setScrollProgress(progress);
    setIsAtBottom(atBottom);
  };

  // Activar el sistema de notificaciones automáticas para tareas repetidas
  useRepeatedTaskNotifications();

  // Activar sincronización de widget (sin funciones agresivas)
  useWidgetSync();

  // CRÍTICO: Ejecutar migración de fechas automáticamente al cargar
  useDateMigration();

  // Funciones de debugging disponibles globalmente para testing
  const { forceMigration } = useForceDateMigration();

  // Exponer funciones de debugging al objeto global (solo en desarrollo)
  React.useEffect(() => {
    if (__DEV__) {
      // @ts-expect-error - Debugging functions
      globalThis.debugDateUtils = {
        testDateUtils,
        testMidnightTransition,
        debugCurrentDateIssues,
        forceMigration,
      };
    }
  }, [forceMigration]);

  // Usar el hook personalizado para toda la lógica de páginas
  const {
    currentPageIndex,
    isFlipping,
    showPageTransition,
    transitionProgress,
    goToNextPage,
    goToPrevPage,
    goToPage,
    goToToday,
    panResponder,
    getTranslateX,
  } = useBookPageLogic();

  // Petición de mostrar un día concreto (p. ej. al tocar una notificación): se lleva el libro a la
  // página de ese día; la propia página del día abre la tarea. Se atiende una sola vez por petición
  const bookTarget = useBookNavigationStore((state) => state.target);
  const handledTargetRef = useRef<number | null>(null);
  React.useEffect(() => {
    if (!bookTarget || handledTargetRef.current === bookTarget.requestedAt) return;
    handledTargetRef.current = bookTarget.requestedAt;
    goToPage(
      getPageIndexForDate(getCurrentLocalDateString(), bookTarget.date, daysToShow)
    );
  });

  const { tCommon, tAgenda } = useI18n();

  // Obtener las fechas según la página actual
  const days = calculateDays(currentPageIndex, daysToShow);

  // Crear estilos dinámicos basados en el tema y configuración de fuente
  const fontMultiplier = FONT_SIZES[taskFontSize].multiplier;
  const dynamicStyles = createDynamicStyles(
    colorScheme ?? "light",
    colors,
    fontMultiplier
  );

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
          tCommon={tCommon}
          showPageTransition={showPageTransition}
          transitionProgress={transitionProgress}
          dynamicStyles={dynamicStyles}
          days={days}
          viewMode={viewMode}
          tAgenda={tAgenda}
          colorScheme={colorScheme ?? "light"}
          colors={colors}
        />

        {/* Contenido principal de páginas */}
        <BookPagesContent
          tCommon={tCommon}
          days={days}
          tAgenda={tAgenda}
          viewMode={viewMode}
          colorScheme={colorScheme ?? "light"}
          colors={colors}
          dynamicStyles={dynamicStyles}
          onScrollChange={handleScrollChange}
        />

        {/* Controles de navegación */}
        <NavigationControls
          tCommon={tCommon}
          currentPageIndex={currentPageIndex}
          daysToShow={daysToShow}
          viewMode={viewMode}
          dynamicStyles={dynamicStyles}
          goToPrevPage={goToPrevPage}
          goToNextPage={goToNextPage}
          goToToday={goToToday}
        />
        <BookActions 
          scrollProgress={scrollProgress}
          isAtBottom={isAtBottom}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
});
