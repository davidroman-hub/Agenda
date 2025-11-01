import { useThemeColor } from "@/hooks/use-theme-color";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity } from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/FontAwesome";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";

interface SimpleCalendarModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onDateSelect: (date: Date) => void;
  readonly currentDate: Date;
}

export default function SimpleCalendarModal({
  visible,
  onClose,
  onDateSelect,
  currentDate,
}: SimpleCalendarModalProps) {
  // SOLUCIÓN TEMPORAL: Forzar siempre la fecha de hoy para evitar el bug de fechas múltiples
  const todayString = React.useMemo(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }, []);
  
  // Usar directamente todayString sin useMemo adicional para evitar bucles
  const [selectedDate, setSelectedDate] = useState<string>(todayString);

  // Obtener tareas para marcar días en el calendario (solo tareas normales)
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  
  // Colores del tema
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  console.log("🔥 SimpleCalendarModal render #" + Date.now());
  console.log("🔥 visible:", visible, "currentDate:", currentDate.toISOString().split("T")[0]);

  // Marcar días que tienen tareas (solo tareas normales)
  const markedDates = React.useMemo(() => {
    const marked: any = {};
    
    for (const [date, dayTasks] of Object.entries(tasksByDate)) {
      const taskCount = Object.values(dayTasks).filter(task => task !== null).length;
      
      if (taskCount > 0) {
        marked[date] = {
          marked: true,
          dotColor: tintColor,
        };
      }
    }

    // Marcar día seleccionado
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: tintColor,
    };

    return marked;
  }, [tasksByDate, selectedDate, tintColor]);

  // Obtener tareas del día seleccionado (solo tareas normales)
  const selectedDayTasks = React.useMemo(() => {
    const dayTasks = tasksByDate[selectedDate] || {};
    return Object.values(dayTasks).filter(task => task !== null);
  }, [tasksByDate, selectedDate]);

  const handleDayPress = (day: any) => {
    console.log("📅 Día presionado:", day.dateString);
    setSelectedDate(day.dateString);
  };

  const handleGoToDate = () => {
    console.log("🚀 Ir a fecha:", selectedDate);
    const date = new Date(selectedDate);
    onDateSelect(date);
  };

  // Eliminar useEffect problemático - manejar directamente en el render
  // Si el modal está visible y selectedDate no es hoy, resetearlo
  if (visible && selectedDate !== todayString) {
    console.log("🔄 Reseteando a fecha de hoy:", todayString);
    setSelectedDate(todayString);
  }

  return (
    <Modal visible={visible} animationType="slide">
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>📅 Calendario Simple</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="times" size={20} color={textColor} />
          </TouchableOpacity>
        </ThemedView>

        <Calendar
          key={`simple-calendar-${todayString}`}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          current={todayString}
          theme={{
            backgroundColor: backgroundColor,
            calendarBackground: backgroundColor,
            textSectionTitleColor: textColor,
            dayTextColor: textColor,
            todayTextColor: tintColor,
            selectedDayBackgroundColor: tintColor,
            selectedDayTextColor: "#ffffff",
            monthTextColor: textColor,
            indicatorColor: tintColor,
            arrowColor: tintColor,
          }}
        />

        <ThemedView style={styles.taskPreview}>
          <ThemedText style={styles.previewTitle}>
            {new Date(selectedDate).toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </ThemedText>
          
          {selectedDayTasks.length > 0 ? (
            <>
              <ThemedText style={styles.taskCount}>
                {selectedDayTasks.length} tarea{selectedDayTasks.length === 1 ? "" : "s"}
              </ThemedText>
              {selectedDayTasks.slice(0, 3).map((task, index) => (
                <ThemedText key={task.id || `task-${index}`} style={styles.taskItem}>
                  • {task.text.length > 30 ? `${task.text.slice(0, 30)}...` : task.text}
                </ThemedText>
              ))}
            </>
          ) : (
            <ThemedText style={styles.noTasks}>No hay tareas este día</ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: tintColor }]}
            onPress={handleGoToDate}
          >
            <ThemedText style={styles.buttonText}>Ir a esta fecha</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  taskPreview: {
    padding: 20,
    minHeight: 150,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "capitalize",
  },
  taskCount: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 10,
  },
  taskItem: {
    fontSize: 14,
    marginBottom: 5,
    paddingLeft: 10,
  },
  noTasks: {
    fontSize: 14,
    fontStyle: "italic",
    opacity: 0.5,
    textAlign: "center",
    marginTop: 20,
  },
  buttons: {
    padding: 20,
    paddingBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
