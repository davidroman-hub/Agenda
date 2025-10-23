import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '../../hooks/use-theme-color';
import { useWidget } from '../../hooks/use-widget';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

interface WidgetPreviewProps {
  readonly onUpdateWidget?: () => void;
}

export function WidgetPreview({ onUpdateWidget }: WidgetPreviewProps): React.JSX.Element {
  const { widgetData, isWidgetSupported, updateWidget, isUpdating } = useWidget();
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const handleUpdateWidget = async () => {
    const success = await updateWidget();
    if (success && onUpdateWidget) {
      onUpdateWidget();
    }
  };

  if (!isWidgetSupported) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText style={styles.title}>Widget no soportado</ThemedText>
        <ThemedText style={styles.subtitle}>
          Los widgets no están disponibles en esta plataforma
        </ThemedText>
      </ThemedView>
    );
  }

  if (!widgetData) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText style={styles.title}>Cargando widget...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardBackgroundColor }]}>
      {/* Widget Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Vista Previa del Widget</ThemedText>
        <TouchableOpacity
          onPress={handleUpdateWidget}
          disabled={isUpdating}
          style={[
            styles.updateButton,
            { borderColor: tintColor, opacity: isUpdating ? 0.5 : 1 }
          ]}
        >
          <ThemedText style={[styles.updateButtonText, { color: tintColor }]}>
            {isUpdating ? 'Actualizando...' : 'Actualizar'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Widget Preview */}
      <View style={[styles.widgetPreview, { backgroundColor }]}>
        {/* Date Header */}
        <View style={styles.dateHeader}>
          <ThemedText style={[styles.dayName, { color: textColor }]}>
            {widgetData.dayName}
          </ThemedText>
          <ThemedText style={[styles.currentDate, { color: textColor }]}>
            {widgetData.currentDate}
          </ThemedText>
        </View>

        {/* Tasks Summary */}
        <View style={styles.tasksSummary}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryItem, { borderColor: tintColor }]}>
              <ThemedText style={[styles.summaryNumber, { color: tintColor }]}>
                {widgetData.tasksCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: textColor }]}>
                Total
              </ThemedText>
            </View>

            <View style={[styles.summaryItem, { borderColor: '#4CAF50' }]}>
              <ThemedText style={[styles.summaryNumber, { color: '#4CAF50' }]}>
                {widgetData.completedTasks}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: textColor }]}>
                Completadas
              </ThemedText>
            </View>

            <View style={[styles.summaryItem, { borderColor: '#FF9800' }]}>
              <ThemedText style={[styles.summaryNumber, { color: '#FF9800' }]}>
                {widgetData.pendingTasks}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: textColor }]}>
                Pendientes
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Tasks Preview */}
        {widgetData.todayTasks.length > 0 && (
          <View style={styles.tasksPreview}>
            <ThemedText style={[styles.tasksTitle, { color: textColor }]}>
              Tareas de Hoy:
            </ThemedText>
            {widgetData.todayTasks.slice(0, 3).map((task) => (
              <View key={task.id} style={styles.taskItem}>
                <View
                  style={[
                    styles.taskCheckbox,
                    {
                      backgroundColor: task.completed ? '#4CAF50' : 'transparent',
                      borderColor: task.completed ? '#4CAF50' : textColor
                    }
                  ]}
                >
                  {task.completed && (
                    <ThemedText style={[styles.checkmark, { color: 'white' }]}>
                      ✓
                    </ThemedText>
                  )}
                </View>
                <ThemedText
                  style={[
                    styles.taskText,
                    {
                      color: textColor,
                      textDecorationLine: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.6 : 1
                    }
                  ]}
                  numberOfLines={1}
                >
                  {task.text}
                </ThemedText>
              </View>
            ))}
            {widgetData.todayTasks.length > 3 && (
              <ThemedText style={[styles.moreTasksText, { color: textColor, opacity: 0.7 }]}>
                +{widgetData.todayTasks.length - 3} tareas más
              </ThemedText>
            )}
          </View>
        )}

        {widgetData.todayTasks.length === 0 && (
          <View style={styles.noTasks}>
            <ThemedText style={[styles.noTasksText, { color: textColor, opacity: 0.7 }]}>
              No hay tareas para hoy
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
  },
  updateButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  widgetPreview: {
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
  },
  dateHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dayName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  currentDate: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 2,
  },
  tasksSummary: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minWidth: 80,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  tasksPreview: {
    marginTop: 8,
  },
  tasksTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 10,
    fontWeight: '700',
  },
  taskText: {
    fontSize: 12,
    flex: 1,
  },
  moreTasksText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  noTasks: {
    alignItems: 'center',
    marginTop: 16,
  },
  noTasksText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
