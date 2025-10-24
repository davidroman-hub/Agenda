import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

interface TaskReminderProps {
  reminderDate?: Date | null;
  onReminderChange: (date: Date | null) => void;
  isEnabled?: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  taskDate: string;
}

export default function TaskReminder({
  reminderDate,
  onReminderChange,
  isEnabled = false,
  onToggleEnabled,
  taskDate,
}: TaskReminderProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(reminderDate || new Date());

const tintColor = useThemeColor({}, 'tint');
const textColor = useThemeColor({}, 'text');
const backgroundColor = useThemeColor({}, 'background');
const taskDateTransform = new Date(taskDate);


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(tempDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setTempDate(newDate);
      
      if (Platform.OS === 'android') {
        // En Android, mostrar time picker después del date picker
        setShowTimePicker(true);
      } else {
        // En iOS, el picker maneja fecha y hora juntos
        onReminderChange(newDate);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(tempDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setTempDate(newDate);
      onReminderChange(newDate);
    }
  };

  const openDateTimePicker = () => {
    if (Platform.OS === 'ios') {
      setShowDatePicker(true);
    } else {
      // En Android, mostrar primero el date picker
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
          trackColor={{ false: '#767577', true: tintColor + '50' }}
          thumbColor={isEnabled ? tintColor : '#f4f3f4'}
        />
      </View>

      {isEnabled && (
        <View style={styles.pickerContainer}>
          {/* Botón para establecer recordatorio */}
          <TouchableOpacity
            style={[
              styles.setReminderButton,
              { backgroundColor: backgroundColor, borderColor: tintColor }
            ]}
            onPress={openDateTimePicker}
          >
            <ThemedText style={[styles.setReminderText, { color: tintColor }]}>
              {reminderDate ? 'Cambiar recordatorio' : 'Establecer recordatorio'}
            </ThemedText>
          </TouchableOpacity>

          {/* Mostrar fecha y hora seleccionada */}
          {reminderDate && (
            <View style={styles.selectedDateTime}>
              <View style={styles.dateTimeRow}>
                <ThemedText style={[styles.dateLabel, { color: textColor }]}>
                  📅 {formatDate(currentReminderDate)}
                </ThemedText>
                <ThemedText style={[styles.timeLabel, { color: textColor }]}>
                  🕐 {formatTime(currentReminderDate)}
                </ThemedText>
              </View>
              
              {/* Botón para quitar recordatorio */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onReminderChange(null)}
              >
                <ThemedText style={[styles.removeText, { color: '#ff4444' }]}>
                  Quitar recordatorio
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Date Picker - iOS muestra fecha y hora juntos */}
          {showDatePicker && (
            <DateTimePicker
              value={tempDate}
              mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
              display={Platform.OS === 'ios' ? 'compact' : 'default'}
              onChange={handleDateChange}
              onTouchCancel={() => console.log('Date picker cancelled')}
              minimumDate={new Date()}
              maximumDate={taskDateTransform}
              locale="es-ES"
              style={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
            />
          )}

          {/* Time Picker - Solo para Android */}
          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="default"
              onChange={handleTimeChange}
              locale="es-ES"
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  pickerContainer: {
    marginTop: 8,
  },
  setReminderButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  setReminderText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDateTime: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  iosDatePicker: {
    alignSelf: 'center',
    marginTop: 8,
  },
});
