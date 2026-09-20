import { Dimensions, StyleSheet } from "react-native";

// Obtener dimensiones de la pantalla
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Determinar tipos de pantalla
const isSmallScreen = screenWidth < 500 || screenHeight < 900; // Phones normales
const isLargeScreen = screenWidth > 800; // Tablets, Fold abierto, etc.

// Función para obtener el tamaño de fuente basado en pantalla y modo
const getFontSize = (
  smallSize: number,
  normalSize: number,
  largeSize: number,
  isExpandedMode?: boolean
) => {
  if (isLargeScreen) return largeSize;
  if (isSmallScreen && isExpandedMode) return smallSize;
  return normalSize;
};

// Lomo del libro (vista expandida): una franja continua entre las dos páginas con los aros
// de la anilla. Se dibuja una sola vez por encima de todo (ver BookSpine), así que las filas
// solo dejan el hueco: el ancho del lomo menos lo que ya separan el gap y los márgenes.
const ROW_GAP = isSmallScreen ? 1 : 2;
const PAGE_MARGIN = 1;
export const SPINE_WIDTH = isSmallScreen ? 14 : 22;
export const RING_WIDTH = SPINE_WIDTH + (isSmallScreen ? 8 : 12);
export const RING_HEIGHT = isSmallScreen ? 8 : 11;
export const RING_PITCH = isSmallScreen ? 30 : 42; // distancia entre aros
export const SCROLL_PADDING = isSmallScreen ? 2 : 20;

// Estilos base para el componente Book
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  button: {
    padding: 10,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: SCROLL_PADDING,
  },
  page: {
    marginVertical: isSmallScreen ? 2 : 10,
    padding: isSmallScreen ? 6 : 20,
    borderRadius: isSmallScreen ? 6 : 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: isSmallScreen ? 1 : 2,
    },
    shadowOpacity: isSmallScreen ? 0.05 : 0.1,
    shadowRadius: isSmallScreen ? 2 : 4,
    elevation: isSmallScreen ? 2 : 3,
    // Simular el borde de las agendas
    borderLeftWidth: isSmallScreen ? 3 : 4,
  },
  pageHeader: {
    borderBottomWidth: isSmallScreen ? 1 : 2,
    paddingBottom: isSmallScreen ? 3 : 15,
    marginBottom: isSmallScreen ? 6 : 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent", /// <=== atras header pagina
  },
  dayName: {
    fontSize: isLargeScreen ? 28 : 24, // Vista normal: más grande
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  dateContainer: {
    alignItems: "center",
    backgroundColor: "transparent", //<=== atras nummero fecha
  },
  dayNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "transparent",
  },
  externalLinkButton: {
    position: "absolute",
    right: -20,
    top: "50%",
    
    transform: [{ translateY: -6 }],
    padding: 4,
    marginBottom: 2,
    
    borderRadius: 6,
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
  },
  dayNumber: {
    fontSize: isLargeScreen ? 36 : 32, // Vista normal: más grande
    fontWeight: "bold",
    lineHeight: isLargeScreen ? 36 : 32,
  },
  monthYear: {
    fontSize: isLargeScreen ? 14 : 12, // Vista normal: más grande
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  linesContainer: {
    flex: 1,
    backgroundColor: "transparent", //<=== atras lineas escritura
  },
  line: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: isLargeScreen ? 45 : 40, // Vista normal: más alto
    borderBottomWidth: 1,
    paddingVertical: isLargeScreen ? 10 : 8,
    backgroundColor: "transparent", // Fondo transparente para todas las líneas
  },
  lineNumber: {
    fontSize: isLargeScreen ? 14 : 12, // Vista normal: más grande
    width: isLargeScreen ? 30 : 25,
    textAlign: "right",
    marginRight: isLargeScreen ? 18 : 15,
    marginTop: 2,
    opacity: 0.6,
  },
  writingLine: {
    backgroundColor: "transparent", ///<=== atras lineas escritura
    flex: 1,
    minHeight: isLargeScreen ? 28 : 24, // Vista normal: más alto
    justifyContent: "center",
  },
  taskText: {
    fontSize: isLargeScreen ? 18 : 16, // Vista normal: más grande
    fontStyle: "italic",
    lineHeight: isLargeScreen ? 24 : 22,
    backgroundColor: "transparent",
  },
  pageSeparator: {
    height: 20,
    backgroundColor: "transparent",
  },
  // Estilos para vista expandida (como agenda real abierta)
  expandedContainer: {
    flexDirection: "row",
    marginVertical: isSmallScreen ? 2 : 10,
    gap: ROW_GAP,
    paddingHorizontal: isSmallScreen ? 1 : 0,
  },
  leftPage: {
    flex: 1,
    marginRight: PAGE_MARGIN,
  },
  rightPage: {
    flex: 1,
    marginLeft: PAGE_MARGIN,
  },
  // Hueco del lomo dentro de cada fila; los aros los dibuja BookSpine por encima
  spineGap: {
    width: SPINE_WIDTH - 2 * (ROW_GAP + PAGE_MARGIN),
  },
  // Estilos específicos para elementos en modo expandido
  expandedPageHeader: {
    paddingBottom: getFontSize(3, 10, 12, true),
    marginBottom: getFontSize(6, 15, 18, true),
  },
  expandedDayName: {
    fontSize: getFontSize(12, 18, 22, true), // Pequeño para phones, grande para tablets
  },
  expandedDayNumber: {
    fontSize: getFontSize(16, 24, 28, true), // Pequeño para phones, grande para tablets
  },
  expandedMonthYear: {
    fontSize: getFontSize(7, 10, 12, true), // Pequeño para phones, grande para tablets
  },
  expandedLine: {
    minHeight: getFontSize(20, 32, 36, true),
    paddingVertical: getFontSize(2, 6, 8, true),
  },
  expandedLineNumber: {
    fontSize: getFontSize(7, 10, 12, true),
    width: getFontSize(14, 20, 24, true),
    marginRight: getFontSize(5, 10, 12, true),
  },
  expandedTaskText: {
    fontSize: getFontSize(9, 13, 16, true), // Pequeño para phones, grande para tablets
    lineHeight: getFontSize(12, 18, 20, true),
  },
  // Estilos para controles de navegación
  navigationControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  navButtonDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.6,
  },
  navButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.7,
  },
  pageIndicatorContainer: {
    alignItems: "center",
  },
  modeIndicator: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  transitionPage: {
    minHeight: 300,
    width: "90%",
  },
});

// Fondo del libro (detrás de las páginas); también lo usa la hoja que gira para tapar lo de debajo
export const getBookBackground = (colorScheme: "light" | "dark") =>
  colorScheme === "dark" ? "#1a1a1a" : "#f5f4f0";

// Función para crear estilos dinámicos basados en el tema y configuraciones de fuente
export const createDynamicStyles = (
  colorScheme: "light" | "dark",
  colors: any,
  fontMultiplier: number = 1
) => {
  return StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: getBookBackground(colorScheme),
    },
    page: {
      ...styles.page,
      backgroundColor: colorScheme === "dark" ? "#2c2c2c" : "#ffffff",
      borderLeftColor: colors.tint,
    },
    pageHeaderBorder: {
      borderBottomColor: colors.tint,
    },
    dayNumber: {
      color: colors.tint,
    },
    line: {
      ...styles.line,
      borderBottomColor: colorScheme === "dark" ? "#404040" : "#e9ecef",
      backgroundColor: "transparent", // Asegurar fondo transparente
    },
    lineWithTask: {
      ...styles.line,
      borderBottomColor: colorScheme === "dark" ? "#404040" : "#e9ecef",
      backgroundColor:
        colorScheme === "dark"
          ? "rgba(100,100,100,0.1)"
          : "rgba(200,200,200,0.1)", // Fondo gris muy claro para líneas con tareas
    },
    navigationControls: {
      ...styles.navigationControls,
      borderTopColor: colorScheme === "dark" ? "#404040" : "#e0e0e0",
    },
    // Estilos de texto de tareas con multiplicador de fuente personalizable
    taskText: {
      ...styles.taskText,
      fontSize: (isLargeScreen ? 18 : 16) * fontMultiplier,
      lineHeight: (isLargeScreen ? 24 : 22) * fontMultiplier,
    },
    expandedTaskText: {
      ...styles.expandedTaskText,
      fontSize: getFontSize(9, 13, 16, true) * fontMultiplier,
      lineHeight: getFontSize(12, 18, 20, true) * fontMultiplier,
    },
  });
};
