import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function Book() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Obtener la fecha actual y los próximos 2 días
  const today = new Date();
  const days: Date[] = [];
  
  for (let i = 0; i < 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }

  const formatDate = (date: Date) => {
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    return {
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      monthName: monthNames[date.getMonth()],
      year: date.getFullYear()
    };
  };

  // Generar líneas para escritura (como en agenda real)
  const generateLines = () => {
    const lines = [];
    for (let i = 1; i <= 8; i++) {
      lines.push(i);
    }
    return lines;
  };

  // Crear estilos dinámicos basados en el tema
  const dynamicStyles = StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f4f0',
    },
    page: {
      ...styles.page,
      backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#ffffff',
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
      borderBottomColor: colorScheme === 'dark' ? '#404040' : '#e9ecef',
    },
  });

  return (
    <ThemedView style={dynamicStyles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Páginas de la agenda */}
        {days.map((day, dayIndex) => {
          const dateInfo = formatDate(day);
          return (
            <ThemedView key={day.toISOString()} style={dynamicStyles.page}>
              {/* Encabezado de la página como agenda real */}
              <ThemedView style={[styles.pageHeader, dynamicStyles.pageHeaderBorder]}>
                <ThemedText style={styles.dayName}>
                  {dateInfo.dayName}
                </ThemedText>
                <ThemedView style={styles.dateContainer}>
                  <ThemedText style={[styles.dayNumber, dynamicStyles.dayNumber]}>
                    {dateInfo.dayNumber}
                  </ThemedText>
                  <ThemedText style={styles.monthYear}>
                    {dateInfo.monthName} {dateInfo.year}
                  </ThemedText>
                </ThemedView>
              </ThemedView>

              {/* Líneas de escritura como en agenda real */}
              <ThemedView style={styles.linesContainer}>
                {generateLines().map((lineNumber) => (
                  <TouchableOpacity
                    key={`${dayIndex}-line-${lineNumber}`}
                    style={dynamicStyles.line}
                    onPress={() => {
                      console.log(`Agregar tarea en línea ${lineNumber} para ${dateInfo.dayName} ${dateInfo.dayNumber}`);
                    }}
                  >
                    <ThemedText style={styles.lineNumber}>{lineNumber}</ThemedText>
                    <ThemedView style={styles.writingLine}>
                      {/* Contenido de ejemplo */}
                      {dayIndex === 0 && lineNumber === 2 && (
                        <ThemedText style={styles.taskText}>
                          📅 Reunión con el equipo - 10:00 AM
                        </ThemedText>
                      )}
                      {dayIndex === 0 && lineNumber === 4 && (
                        <ThemedText style={styles.taskText}>
                          ✅ Revisar reportes mensuales
                        </ThemedText>
                      )}
                      {dayIndex === 1 && lineNumber === 3 && (
                        <ThemedText style={styles.taskText}>
                          🎯 Presentación cliente importante - 2:00 PM
                        </ThemedText>
                      )}
                      {dayIndex === 2 && lineNumber === 5 && (
                        <ThemedText style={styles.taskText}>
                          💪 Gimnasio - 4:00 PM
                        </ThemedText>
                      )}
                    </ThemedView>
                  </TouchableOpacity>
                ))}
              </ThemedView>

              {/* Separador de página */}
              {dayIndex < days.length - 1 && (
                <ThemedView style={styles.pageSeparator} />
              )}
            </ThemedView>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: '#000',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  dateContainer: {
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  monthYear: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  linesContainer: {
    flex: 1,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 40,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  lineNumber: {
    fontSize: 12,
    width: 25,
    textAlign: 'right',
    marginRight: 15,
    marginTop: 2,
    opacity: 0.6,
  },
  writingLine: {
    flex: 1,
    minHeight: 24,
    justifyContent: 'center',
  },
  taskText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  pageSeparator: {
    height: 20,
    backgroundColor: 'transparent',
  },
});
