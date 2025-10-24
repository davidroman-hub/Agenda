import { Dimensions, StyleSheet } from "react-native";

// Obtener dimensiones de la pantalla
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Determinar tipos de pantalla
const isSmallScreen = screenWidth < 500 || screenHeight < 900; // Phones normales
const isLargeScreen = screenWidth > 800; // Tablets, Fold abierto, etc.

// Función para obtener el tamaño de fuente basado en pantalla y modo
const getFontSize = (smallSize: number, normalSize: number, largeSize: number, isExpandedMode?: boolean) => {
  if (isLargeScreen) return largeSize;
  if (isSmallScreen && isExpandedMode) return smallSize;
  return normalSize;
};

// Estilos base para el componente Book
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 2 : 20,
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
    gap: isSmallScreen ? 1 : 2,
    paddingHorizontal: isSmallScreen ? 1 : 0,
  },
  leftPage: {
    flex: 1,
    marginRight: 1,
  },
  rightPage: {
    flex: 1,
    marginLeft: 1,
  },
  centerBinding: {
    width: isSmallScreen ? 8 : 20,
    borderRadius: isSmallScreen ? 2 : 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: isSmallScreen ? 1 : 2,
    },
    shadowOpacity: isSmallScreen ? 0.1 : 0.3,
    shadowRadius: isSmallScreen ? 1 : 3,
    elevation: isSmallScreen ? 1 : 5,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 3 : 10,
  },
  // Elementos individuales del resorte
  spiralRing: {
    width: isSmallScreen ? 4 : 12,
    height: isSmallScreen ? 3 : 8,
    borderWidth: isSmallScreen ? 0.5 : 2,
    borderColor: isSmallScreen ? "#E0E0E0" : "#C0C0C0", // Color más sutil para pantallas pequeñas
    borderRadius: isSmallScreen ? 2 : 6,
    backgroundColor: isSmallScreen ? "#F8F8F8" : "#F0F0F0", // Fondo más sutil
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: isSmallScreen ? 0.5 : 1,
    },
    shadowOpacity: isSmallScreen ? 0.1 : 0.3,
    shadowRadius: isSmallScreen ? 0.5 : 1,
    elevation: isSmallScreen ? 0.5 : 2,
    marginVertical: isSmallScreen ? 0.5 : 1,
  },
  // Variante alternativa para crear efecto de profundidad
  spiralRingAlt: {
    width: isSmallScreen ? 3 : 10,
    height: isSmallScreen ? 2 : 6,
    borderWidth: isSmallScreen ? 0.3 : 1.5,
    borderColor: isSmallScreen ? "#D0D0D0" : "#A8A8A8", // Color más sutil
    borderRadius: isSmallScreen ? 1.5 : 5,
    backgroundColor: isSmallScreen ? "#F5F5F5" : "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: {
      width: isSmallScreen ? 0.5 : 1,
      height: isSmallScreen ? 0.5 : 1,
    },
    shadowOpacity: isSmallScreen ? 0.05 : 0.2,
    shadowRadius: isSmallScreen ? 0.5 : 1,
    elevation: isSmallScreen ? 0.3 : 1,
    marginVertical: isSmallScreen ? 0.5 : 1,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  pageIndicatorContainer: {
    alignItems: 'center',
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

// Función para crear estilos dinámicos basados en el tema y configuraciones de fuente
export const createDynamicStyles = (
  colorScheme: "light" | "dark",
  colors: any,
  fontMultiplier: number = 1
) => {
  return StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f4f0",
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
      backgroundColor: colorScheme === "dark" ? "rgba(100,100,100,0.1)" : "rgba(200,200,200,0.1)", // Fondo gris muy claro para líneas con tareas
    },
    centerBinding: {
      ...styles.centerBinding,
      backgroundColor: colorScheme === "dark" ? "#000000" : "#ffffff",
    },
    navigationControls: {
      ...styles.navigationControls,
      borderTopColor: colorScheme === "dark" ? "#404040" : "#e0e0e0",
    },
    pageTransition: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
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
