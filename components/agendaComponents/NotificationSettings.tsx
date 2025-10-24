import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { notificationService } from '@/services/notifications/notification-service';
import useAgendaTasksStore from '@/stores/agenda-tasks-store';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

interface ScheduledNotificationInfo {
  id: string;
  taskTitle: string;
  scheduledDate: Date;
  taskId: string;
}

export default function NotificationSettings() {
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotificationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  
  // Suscribirse al store para detectar cambios en las tareas
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);

  const loadScheduledNotifications = async () => {
    try {
      setIsLoading(true);
      const notifications = await notificationService.getScheduledNotifications();
      const taskNotifications: ScheduledNotificationInfo[] = notifications
        .filter(n => n.content.data?.type === 'task-reminder')
        .map(n => {
          let scheduledDate = new Date();
          
          // Extraer la fecha dependiendo del tipo de trigger
          if (n.trigger && typeof n.trigger === 'object' && 'date' in n.trigger && n.trigger.date) {
            scheduledDate = new Date(n.trigger.date as unknown as string);
          }
          
          return {
            id: n.identifier,
            taskTitle: n.content.data?.taskTitle as string || 'Tarea sin título',
            scheduledDate,
            taskId: n.content.data?.taskId as string || '',
          };
        });
      
      setScheduledNotifications(taskNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScheduledNotifications();
  }, []);

  // Recargar automáticamente cuando cambien las tareas
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadScheduledNotifications();
    }, 500); // Debounce de 500ms para evitar recargas excesivas

    return () => clearTimeout(timeoutId);
  }, [tasksByDate]);

  const handleTestNotification = async () => {
    try {
      // Programar una notificación de prueba en 5 segundos
      const testDate = new Date();
      testDate.setSeconds(testDate.getSeconds() + 5);
      
      const notificationId = await notificationService.scheduleTaskReminder(
        'test-task-id',
        'Notificación de Prueba',
        'Esta es una notificación de prueba del sistema de recordatorios',
        testDate,
        new Date().toISOString().split('T')[0]
      );

      if (notificationId) {
        Alert.alert(
          'Notificación programada',
          'Se enviará una notificación de prueba en 5 segundos',
          [{ text: 'OK' }]
        );
        
        // Recargar la lista
        setTimeout(() => loadScheduledNotifications(), 1000);
      } else {
        Alert.alert('Error', 'No se pudo programar la notificación de prueba');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Error al programar la notificación de prueba');
    }
  };

  const handleCancelNotification = async (notificationId: string, taskId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      Alert.alert('Notificación cancelada', 'La notificación ha sido cancelada exitosamente');
      loadScheduledNotifications();
    } catch (error) {
      console.error('Error canceling notification:', error);
      Alert.alert('Error', 'No se pudo cancelar la notificación');
    }
  };

  const handleCancelAllNotifications = async () => {
    Alert.alert(
      'Cancelar todas las notificaciones',
      '¿Estás seguro de que quieres cancelar todas las notificaciones programadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, cancelar todas',
          style: 'destructive',
          onPress: () => {
            (async () => {
              try {
                await notificationService.cancelAllTaskReminders();
                Alert.alert('Completado', 'Todas las notificaciones han sido canceladas');
                setScheduledNotifications([]);
              } catch (error) {
                console.error('Error canceling all notifications:', error);
                Alert.alert('Error', 'No se pudieron cancelar las notificaciones');
              }
            })();
          },
        },
      ]
    );
  };

  const renderNotificationItem = ({ item }: { item: ScheduledNotificationInfo }) => (
    <ThemedView style={[styles.notificationItem, { borderColor: tintColor }]}>
      <ThemedView style={styles.notificationContent}>
        <ThemedText style={[styles.notificationTitle, { color: textColor }]}>
          {item.taskTitle}
        </ThemedText>
        <ThemedText style={[styles.notificationDate, { color: textColor }]}>
          📅 {item.scheduledDate.toLocaleDateString('es-ES')} a las {item.scheduledDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </ThemedText>
      </ThemedView>
      
      <TouchableOpacity
        style={[styles.cancelButton, { backgroundColor: '#ff4444' }]}
        onPress={() => handleCancelNotification(item.id, item.taskId)}
      >
        <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedText style={[styles.title, { color: textColor }]}>
        🔔 Configuración de Recordatorios
      </ThemedText>

      <ThemedView style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Acciones de prueba
        </ThemedText>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#2196f3" }]}
          onPress={handleTestNotification}
        >
          <ThemedText style={ styles.actionButtonText}>
            🧪 Enviar recordatorio de prueba
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ff4444' }]}
          onPress={handleCancelAllNotifications}
        >
          <ThemedText style={styles.actionButtonText}>
            🗑️ Cancelar todos los recordatorios
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton, 
            { 
              backgroundColor: isLoading ? '#999' : '#666',
              opacity: isLoading ? 0.7 : 1,
            }
          ]}
          onPress={loadScheduledNotifications}
          disabled={isLoading}
        >
          <ThemedText style={styles.actionButtonText}>
            {isLoading ? '🔄 Recargando...' : '🔄 Recargar lista manualmente'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Recordatorios programados ({scheduledNotifications.length}) 
          {isLoading && <ThemedText style={{ color: tintColor }}> - Actualizando...</ThemedText>}
        </ThemedText>
        
        {isLoading && (
          <ThemedText style={[styles.loadingText, { color: tintColor }]}>
            🔄 Cargando recordatorios...
          </ThemedText>
        )}
        
        {!isLoading && scheduledNotifications.length === 0 && (
          <ThemedText style={[styles.emptyText, { color: textColor }]}>
            No hay recordatorios programados.{'\n'}
            Crea una tarea y activa el recordatorio para verlo aquí.
          </ThemedText>
        )}
        
        {!isLoading && scheduledNotifications.length > 0 && (
          <FlatList
            data={scheduledNotifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>

      {/* Sección de información */}
      <ThemedView style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Información
        </ThemedText>
        
        <ThemedView style={[styles.infoBox, { backgroundColor: tintColor + '20', borderColor: tintColor }]}>
          <ThemedText style={[styles.infoText, { color: textColor }]}>
            💡 La lista de recordatorios se actualiza automáticamente cuando editas tareas.
            {'\n'}📱 Los recordatorios aparecerán como notificaciones en tu dispositivo a la hora programada.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginTop: 50,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.6,
    marginTop: 20,
    lineHeight: 20,
  },
  loadingText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
