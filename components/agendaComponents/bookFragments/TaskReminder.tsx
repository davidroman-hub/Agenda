import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  formatDateLocalized,
  formatTimeLocalized,
} from "@/utils/locale-config";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

interface TaskReminderProps {
  readonly reminderDate?: Date | null;
  readonly onReminderChange: (date: Date | null) => void;
  readonly isEnabled?: boolean;
  readonly onToggleEnabled: (enabled: boolean) => void;
  readonly taskDate: string;
}

export default function TaskReminder({
  reminderDate,
  onReminderChange,
  isEnabled = false,
  onToggleEnabled,
  taskDate,
}: TaskReminderProps) {
  // Inicializar tempDate con la fecha local para evitar problemas de timezone
  const getInitialDate = () => {
    if (reminderDate) return reminderDate;
    const now = new Date();
    // Crear una nueva fecha en zona horaria local
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
    );
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(getInitialDate());
  const [taskDateLocal, setTaskDateLocal] = useState<Date | null>(null);

  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Inicio del día actual

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {

      // Crear una nueva fecha manteniendo la zona horaria local del usuario
      const localDate = new Date(selectedDate);

      // Si tenemos una fecha temporal existente, preservar la hora
      const newDate = new Date(tempDate);
      newDate.setFullYear(localDate.getFullYear());
      newDate.setMonth(localDate.getMonth());
      newDate.setDate(localDate.getDate());

      // Asegurar que estamos trabajando con la fecha local del usuario
      const localizedDate = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        newDate.getHours(),
        newDate.getMinutes()
      );

      setTempDate(localizedDate);

      if (Platform.OS === "android") {
        // En Android, mostrar time picker después del date picker
        setShowTimePicker(true);
      } else {
        // En iOS, el picker maneja fecha y hora juntos
        onReminderChange(localizedDate);
      }
    }
  };

  const addHoursSameTime = (date: Date) => {
    // Crear una nueva fecha para evitar mutaciones
    const newDate = new Date(date);
    // Establecer la hora al final del día (23:59:59.999) en la zona horaria local
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  };

  const setZeroHrs = (date: Date) => {
    // Crear una nueva fecha para evitar mutaciones
    const newDate = new Date(date);
    // Establecer la hora a 00:00:00.000 en la zona horaria local
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Crear una nueva fecha preservando la fecha seleccionada pero con nueva hora
      const newDate = new Date(tempDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);

      // Asegurar que mantenemos la zona horaria local
      const localizedDate = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        newDate.getHours(),
        newDate.getMinutes()
      );

      setTempDate(localizedDate);
      onReminderChange(localizedDate);
    }
  };

  const openDateTimePicker = () => {
    try {
      // Convertir taskDate a fecha local sin problemas de timezone
      let maxDate: Date;
      
      if (taskDate.includes('T')) {
        // Si es un ISO string, parsearlo correctamente en timezone local
        const dateParts = taskDate.split('T')[0].split('-');
        maxDate = new Date(
          Number.parseInt(dateParts[0]), // year
          Number.parseInt(dateParts[1]) - 1, // month (0-indexed)
          Number.parseInt(dateParts[2]) // day
        );
      } else {
        // Si es una fecha simple YYYY-MM-DD
        const dateParts = taskDate.split('-');
        maxDate = new Date(
          Number.parseInt(dateParts[0]), // year
          Number.parseInt(dateParts[1]) - 1, // month (0-indexed)
          Number.parseInt(dateParts[2]) // day
        );
      }
      
      // Establecer al final del día en timezone local
      maxDate.setHours(23, 59, 59, 999);
      setTaskDateLocal(maxDate);


      setShowDatePicker(true);
    } catch (error) {
    
      // Fallback
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 7); // 7 días desde hoy
      setTaskDateLocal(fallback);
      setShowDatePicker(true);
    }
  };

  const currentReminderDate = reminderDate || tempDate;

  return (
    <ThemedView style={styles.container}>
      {/* Header con toggle */}
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Recordatorio
        </ThemedText>
        <Switch
          value={isEnabled}
          onValueChange={onToggleEnabled}
          trackColor={{ false: "#767577", true: tintColor + "50" }}
          thumbColor={isEnabled ? tintColor : "#f4f3f4"}
        />
      </View>

      {isEnabled && (
        <View style={styles.pickerContainer}>
          {/* Botón para establecer recordatorio */}
          <TouchableOpacity
            style={[
              styles.setReminderButton,
              { backgroundColor: backgroundColor, borderColor: tintColor },
            ]}
            onPress={openDateTimePicker}
          >
            <ThemedText style={[styles.setReminderText, { color: tintColor }]}>
              {reminderDate
                ? "Cambiar recordatorio"
                : "Establecer recordatorio"}
            </ThemedText>
          </TouchableOpacity>

          {/* Mostrar fecha y hora seleccionada */}
          {reminderDate && (
            <View style={styles.selectedDateTime}>
              <View style={styles.dateTimeRow}>
                <ThemedText style={[styles.dateLabel, { color: textColor }]}>
                  📅 {formatDateLocalized(currentReminderDate)}
                </ThemedText>
                <ThemedText style={[styles.timeLabel, { color: textColor }]}>
                  🕐 {formatTimeLocalized(currentReminderDate)}
                </ThemedText>
              </View>

              {/* Botón para quitar recordatorio */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onReminderChange(null)}
              >
                <ThemedText style={[styles.removeText, { color: "#ff4444" }]}>
                  Quitar recordatorio
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Date Picker - iOS muestra fecha y hora juntos */}
          {showDatePicker && Platform.OS === "ios" && (
            <DateTimePicker
              value={tempDate}
              mode="datetime"
              display="compact"
              onChange={handleDateChange}
          

              minimumDate={setZeroHrs(today)}
              maximumDate={addHoursSameTime(
                setZeroHrs(taskDateLocal || new Date())
              )}
              style={styles.iosDatePicker}
            />
          )}

          {/* Date Picker - Android separado */}
          {showDatePicker && Platform.OS === "android" && (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={setZeroHrs(taskDateLocal as any)}
              maximumDate={setZeroHrs(taskDateLocal || new Date())}
            />
          )}

          {/* Time Picker - Solo para Android */}
          {showTimePicker && Platform.OS === "android" && (
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  pickerContainer: {
    marginTop: 8,
  },
  setReminderButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  setReminderText: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectedDateTime: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  removeButton: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  iosDatePicker: {
    alignSelf: "center",
    marginTop: 8,
  },
});
