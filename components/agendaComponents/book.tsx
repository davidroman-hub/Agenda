import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  useDateMigration,
  useForceDateMigration,
} from "@/hooks/use-date-migration";
import { useForcedOrientation } from "@/hooks/use-forced-orientation";
import { useI18n } from "@/hooks/use-i18n";
import { useRepeatedTaskNotifications } from "@/hooks/use-repeated-task-notifications";
import { useWidgetSync } from "@/hooks/use-widget-sync";
import useAgendaSectionStore from "@/stores/agenda-section-store";
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
import { useSharedValue } from "react-native-reanimated";
import {
  BookPagesContent,
  BookSpread,
  calculateDays,
  NavigationControls,
  PageTurn,
  useBookPageLogic,
} from "./bookFragments";
import BookActions from "./bookSettings";
import { createDynamicStyles, getBookBackground } from "./bookStyles";
import NotesBoard from "./notes/NotesBoard";
import TypeTabs from "./typeTabs/TypeTabs";
import YearView from "./yearView/YearView";

export default function Book() {
  const { daysToShow, columns } = useBookSettingsStore();
  const { taskFontSize } = useFontSettingsStore(); // Suscribirse al valor directamente para trigger re-render
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  
  // Estado para el scroll del book
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Scroll vertical del libro: en un ref para que la hoja que gira se dibuje igual de desplazada,
  // y en un valor compartido para que los aros del lomo se muevan con las páginas
  const scrollOffsetRef = useRef(0);
  const scrollY = useSharedValue(0);

  const handleScrollChange = (
    progress: number,
    atBottom: boolean,
    offsetY: number
  ) => {
    scrollOffsetRef.current = offsetY;
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
    turn,
    endTurn,
    goToNextPage,
    goToPrevPage,
    goToPage,
    goToToday,
    panResponder,
    getTranslateX,
  } = useBookPageLogic({ getScrollOffset: () => scrollOffsetRef.current });

  // Petición de mostrar un día concreto (p. ej. al tocar una notificación): se lleva el libro a la
  // página de ese día; la propia página del día abre la tarea. Se atiende una sola vez por petición
  const bookTarget = useBookNavigationStore((state) => state.target);
  const handledTargetRef = useRef<number | null>(null);
  React.useEffect(() => {
    if (!bookTarget || handledTargetRef.current === bookTarget.requestedAt) return;
    handledTargetRef.current = bookTarget.requestedAt;
    // Si se estaba en las notas o en la vista de año, la página del día no está a la vista para abrir la tarea
    useAgendaSectionStore.getState().showBook();
    goToPage(
      getPageIndexForDate(getCurrentLocalDateString(), bookTarget.date, daysToShow)
    );
  });

  const { tCommon, tAgenda } = useI18n();

  // El año puede verse forzado en horizontal; al salir de él la pantalla vuelve a como estaba
  useForcedOrientation();

  // Qué se enseña: el libro, la vista de año o las notas (que no son tareas). El libro sigue montado en
  // todas para que sus hooks (recordatorios de repetidas, migración de fechas, widget) no se detengan
  const content = useAgendaSectionStore((state) => (state.section === "notes" ? "notes" : state.agendaView));
  const showingBook = content === "book";

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
        {...(showingBook ? panResponder.panHandlers : {})}
      >
        {/* Pestañas de tipos de tarea (filtran el libro y el año); las notas no son tareas y no las llevan */}
        {content !== "notes" && <TypeTabs />}

        {content === "notes" && <NotesBoard />}
        {content === "year" && <YearView />}
        {showingBook && (
          <>
            {/* Contenido principal de páginas, con el giro de hoja y el lomo con aros al cambiar de página */}
            <PageTurn
              turn={turn}
              onTurnEnd={endTurn}
              twoPages={columns > 1}
              backgroundColor={getBookBackground(colorScheme ?? "light")}
              colorScheme={colorScheme ?? "light"}
              scrollY={scrollY}
              renderSpread={(pageIndex) => (
                <BookSpread
                  inert
                  tCommon={tCommon}
                  days={calculateDays(pageIndex, daysToShow)}
                  tAgenda={tAgenda}
                  columns={columns}
                  colorScheme={colorScheme ?? "light"}
                  colors={colors}
                  dynamicStyles={dynamicStyles}
                />
              )}
            >
              <BookPagesContent
                tCommon={tCommon}
                days={days}
                tAgenda={tAgenda}
                columns={columns}
                colorScheme={colorScheme ?? "light"}
                colors={colors}
                dynamicStyles={dynamicStyles}
                scrollY={scrollY}
                onScrollChange={handleScrollChange}
              />
            </PageTurn>

            {/* Controles de navegación */}
            <NavigationControls
              tCommon={tCommon}
              currentPageIndex={currentPageIndex}
              daysToShow={daysToShow}
              columns={columns}
              dynamicStyles={dynamicStyles}
              goToPrevPage={goToPrevPage}
              goToNextPage={goToNextPage}
              goToToday={goToToday}
            />
            <BookActions 
              scrollProgress={scrollProgress}
              isAtBottom={isAtBottom}
            />
          </>
        )}
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
