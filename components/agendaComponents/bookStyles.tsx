import { StyleSheet } from "react-native";

// Estilos base para el componente Book
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  page: {
    marginVertical: 10,
    padding: 20,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Simular el borde de las agendas
    borderLeftWidth: 4,
  },
  pageHeader: {
    borderBottomWidth: 2,
    paddingBottom: 15,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent", /// <=== atras header pagina
  },
  dayName: {
    fontSize: 24,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  dateContainer: {
    alignItems: "center",
    backgroundColor: "transparent", //<=== atras nummero fecha
  },
  dayNumber: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 32,
  },
  monthYear: {
    fontSize: 12,
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
    minHeight: 40,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  lineNumber: {
    fontSize: 12,
    width: 25,
    textAlign: "right",
    marginRight: 15,
    marginTop: 2,
    opacity: 0.6,
  },
  writingLine: {
    backgroundColor: "transparent", ///<=== atras lineas escritura
    flex: 1,
    minHeight: 24,
    justifyContent: "center",
  },
  taskText: {
    fontSize: 16,
    fontStyle: "italic",
    lineHeight: 22,
  },
  pageSeparator: {
    height: 20,
    backgroundColor: "transparent",
  },
  // Estilos para vista expandida (como agenda real abierta)
  expandedContainer: {
    flexDirection: "row",
    marginVertical: 10,
    gap: 2,
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
    width: 20,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 10,
  },
  // Elementos individuales del resorte
  spiralRing: {
    width: 12,
    height: 8,
    borderWidth: 2,
    borderColor: "#C0C0C0", // Color plateado metálico
    borderRadius: 6,
    backgroundColor: "#F0F0F0", // Fondo ligeramente gris para simular metal
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
    marginVertical: 1,
  },
  // Variante alternativa para crear efecto de profundidad
  spiralRingAlt: {
    width: 10,
    height: 6,
    borderWidth: 1.5,
    borderColor: "#A8A8A8", // Color más oscuro para contraste
    borderRadius: 5,
    backgroundColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
    marginVertical: 1,
  },
  // Estilos específicos para elementos en modo expandido
  expandedPageHeader: {
    paddingBottom: 10,
    marginBottom: 15,
  },
  expandedDayName: {
    fontSize: 18,
  },
  expandedDayNumber: {
    fontSize: 24,
  },
  expandedMonthYear: {
    fontSize: 10,
  },
  expandedLine: {
    minHeight: 32,
    paddingVertical: 6,
  },
  expandedLineNumber: {
    fontSize: 10,
    width: 20,
    marginRight: 10,
  },
  expandedTaskText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

// Función para crear estilos dinámicos basados en el tema
export const createDynamicStyles = (
  colorScheme: "light" | "dark",
  colors: any
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
    },
    centerBinding: {
      ...styles.centerBinding,
      backgroundColor: colorScheme === "dark" ? "#000000" : "#ffffff",
    },
  });
};
