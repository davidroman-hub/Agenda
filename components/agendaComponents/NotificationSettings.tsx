import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { notificationService } from "@/services/notifications/notification-service";
import { RepeatedTaskNotificationService } from "@/services/repeated-task-notification-service";
import { useRepeatedTaskNotifications } from "@/hooks/use-repeated-task-notifications";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, TouchableOpacity } from "react-native";
import { notificationSettingsStyles as styles } from "./notificationSettingsStyles";

interface ScheduledNotificationInfo {
  id: string;
  taskTitle: string;
  scheduledDate: Date;
  taskId: string;
}

export default function NotificationSettings() {
  const [scheduledNotifications, setScheduledNotifications] = useState<
    ScheduledNotificationInfo[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [repeatedTaskStats, setRepeatedTaskStats] = useState<any>(null);
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  // Activar el sistema de notificaciones automáticas para tareas repetidas
  useRepeatedTaskNotifications();

  // Suscribirse al store para detectar cambios en las tareas
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);

  const loadScheduledNotifications = async () => {
    try {
      setIsLoading(true);
      const notifications =
        await notificationService.getScheduledNotifications();

      console.log(
        "Raw notifications:",
        notifications.map((n) => ({
          id: n.identifier,
          trigger: n.trigger,
          data: n.content.data,
        }))
      );

      const taskNotifications: ScheduledNotificationInfo[] = notifications
        .filter((n) => n.content.data?.type === "task-reminder")
        .map((n) => {
          let scheduledDate = new Date();

          // Extraer la fecha dependiendo del tipo de trigger
          if (n.trigger && typeof n.trigger === "object") {
            // Para DateTrigger con estructura {type: "date", value: timestamp}
            if ("value" in n.trigger && n.trigger.value) {
              scheduledDate = new Date(n.trigger.value as number);
            }
            // Para DateTrigger tradicional
            else if ("date" in n.trigger && n.trigger.date) {
              // El date podría ser un número (timestamp) o Date object
              if (typeof n.trigger.date === "number") {
                scheduledDate = new Date(n.trigger.date);
              } else if (n.trigger.date instanceof Date) {
                scheduledDate = n.trigger.date;
              } else {
                // Si es string u otro tipo, intentar parsearlo
                scheduledDate = new Date(n.trigger.date as any);
              }
            }
            // Para CalendarTrigger
            else if (
              "dateComponents" in n.trigger &&
              n.trigger.dateComponents
            ) {
              const components = n.trigger.dateComponents as any;
              const year = components.year || new Date().getFullYear();
              const month = (components.month || 1) - 1; // JavaScript months are 0-indexed
              const day = components.day || 1;
              const hour = components.hour || 0;
              const minute = components.minute || 0;
              scheduledDate = new Date(year, month, day, hour, minute);
            } else {
              console.log("Unknown trigger type:", n.trigger);
            }
          }

          return {
            id: n.identifier,
            taskTitle:
              (n.content.data?.taskTitle as string) || "Tarea sin título",
            scheduledDate,
            taskId: (n.content.data?.taskId as string) || "",
          };
        });

      setScheduledNotifications(taskNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScheduledNotifications();
    loadRepeatedTaskStats();
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

      const today = new Date();
      const todayDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const notificationId = await notificationService.scheduleTaskReminder(
        "test-task-id",
        "Activar notificaciones  📲",
        "Esta es una notificación de prueba del sistema de recordatorios",
        testDate,
        todayDateKey
      );

      if (notificationId) {
        Alert.alert(
          "Notificación programada",
          "Se enviará una notificación de prueba en 5 segundos",
          [{ text: "OK" }]
        );

        // Recargar la lista
        setTimeout(() => loadScheduledNotifications(), 1000);
      } else {
        Alert.alert("Error", "No se pudo programar la notificación de prueba");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      Alert.alert("Error", "Error al programar la notificación de prueba");
    }
  };

  const handleForceRepeatedTaskCheck = async () => {
    try {
      setIsLoading(true);
      await RepeatedTaskNotificationService.forceNewCheck();
      await loadRepeatedTaskStats();
      Alert.alert(
        "✅ Verificación Completada",
        "Se ha ejecutado la verificación de tareas repetidas y se programaron las notificaciones correspondientes"
      );
      // Recargar notificaciones después de la verificación
      setTimeout(() => loadScheduledNotifications(), 1000);
    } catch (error) {
      console.error('Error forcing repeated task check:', error);
      Alert.alert("❌ Error", "No se pudo ejecutar la verificación");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRepeatedTaskStats = async () => {
    try {
      const stats = await RepeatedTaskNotificationService.getNotificationStats();
      setRepeatedTaskStats(stats);
    } catch (error) {
      console.error('Error loading repeated task stats:', error);
      setRepeatedTaskStats(null);
    }
  };

  const handleCancelNotification = async (
    notificationId: string,
    taskId: string
  ) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      Alert.alert(
        "Notificación cancelada",
        "La notificación ha sido cancelada exitosamente"
      );
      loadScheduledNotifications();
    } catch (error) {
      console.error("Error canceling notification:", error);
      Alert.alert("Error", "No se pudo cancelar la notificación");
    }
  };

  const renderNotificationItem = ({
    item,
  }: {
    item: ScheduledNotificationInfo;
  }) => (
    <ThemedView style={[styles.notificationItem, { borderColor: tintColor }]}>
      <ThemedView style={styles.notificationContent}>
        <ThemedText style={[styles.notificationTitle, { color: textColor }]}>
          {item.taskTitle}
        </ThemedText>
        <ThemedText style={[styles.notificationDate, { color: textColor }]}>
          📅 {item.scheduledDate.toLocaleDateString("es-ES")} a las{" "}
          {item.scheduledDate.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </ThemedText>
      </ThemedView>

      <TouchableOpacity
        style={[styles.cancelButton, { backgroundColor: "#ff4444" }]}
        onPress={() => handleCancelNotification(item.id, item.taskId)}
      >
        <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  console.log(scheduledNotifications);

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
          <ThemedText style={styles.actionButtonText}>
            🧪 Activa las notificaciones
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Tareas Repetidas
        </ThemedText>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
          onPress={handleForceRepeatedTaskCheck}
          disabled={isLoading}
        >
          <ThemedText style={styles.actionButtonText}>
            {isLoading ? "🔄 Verificando..." : "🔁 Verificar Tareas Repetidas"}
          </ThemedText>
        </TouchableOpacity>

        {repeatedTaskStats && (
          <ThemedView style={[styles.statsContainer, { borderColor: textColor + '20' }]}>
            <ThemedText style={[styles.statsTitle, { color: textColor }]}>
              📊 Estadísticas de Tareas Repetidas
            </ThemedText>
            <ThemedText style={[styles.statsText, { color: textColor }]}>
              Última verificación: {repeatedTaskStats.lastCheck ? new Date(repeatedTaskStats.lastCheck).toLocaleString() : 'Nunca'}
            </ThemedText>
            <ThemedText style={[styles.statsText, { color: textColor }]}>
              Patrones activos: {repeatedTaskStats.totalPatterns}
            </ThemedText>
            <ThemedText style={[styles.statsText, { color: textColor }]}>
              Notificaciones hoy: {repeatedTaskStats.notificationsToday}
            </ThemedText>
            <ThemedText style={[styles.statsText, { color: textColor }]}>
              Próxima verificación: {repeatedTaskStats.nextCheck ? new Date(repeatedTaskStats.nextCheck).toLocaleString() : 'No programada'}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          Recordatorios programados ({scheduledNotifications.length})
          {isLoading && (
            <ThemedText style={{ color: tintColor }}>
              {" "}
              - Actualizando...
            </ThemedText>
          )}
        </ThemedText>

        {isLoading && (
          <ThemedText style={[styles.loadingText, { color: tintColor }]}>
            🔄 Cargando recordatorios...
          </ThemedText>
        )}

        {!isLoading && scheduledNotifications.length === 0 && (
          <ThemedText style={[styles.emptyText, { color: textColor }]}>
            No hay recordatorios programados.{"\n"}
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

        <ThemedView
          style={[
            styles.infoBox,
            { backgroundColor: tintColor + "20", borderColor: tintColor },
          ]}
        >
          <ThemedText style={[styles.infoText, { color: textColor }]}>
            💡 La lista de recordatorios se actualiza automáticamente cuando
            editas tareas.
            {"\n"}📱 Los recordatorios aparecerán como notificaciones en tu
            dispositivo a la hora programada.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}
