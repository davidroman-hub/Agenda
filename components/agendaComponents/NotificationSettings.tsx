import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/hooks/use-i18n";
import { useRepeatedTaskNotifications } from "@/hooks/use-repeated-task-notifications";
import { useThemeColor } from "@/hooks/use-theme-color";
import { notificationService } from "@/services/notifications/notification-service";
import { RepeatedTaskNotificationService } from "@/services/repeated-task-notification-service";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, TouchableOpacity } from "react-native";
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
  const { tCommon, tAgenda } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [repeatedTaskStats, setRepeatedTaskStats] = useState<any>(null);
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  // Obtener el idioma actual para formateo de fechas
  const { getCurrentLanguage } = useI18n();
  const currentLanguage = getCurrentLanguage();
  
  // Mapear idiomas a locales apropiados para formateo de fechas
  const getLocaleForDate = (language: string) => {
    switch (language) {
      case 'es':
        return 'es-ES';
      case 'en':
        return 'en-US';
      case 'it':
        return 'it-IT';
      case 'fr':
        return 'fr-FR';
      default:
        return 'es-ES';
    }
  };

  // Activar el sistema de notificaciones automáticas para tareas repetidas
  useRepeatedTaskNotifications();

  // Suscribirse al store para detectar cambios en las tareas
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);

  const loadScheduledNotifications = async () => {
    try {
      setIsLoading(true);
      const notifications =
        await notificationService.getScheduledNotifications();

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
      const todayDateKey = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const notificationId = await notificationService.scheduleTaskReminder(
        "test-task-id",
        tCommon("reminders.activateNotification"),
        tCommon("reminders.notificationTest"),
        testDate,
        todayDateKey
      );

      if (notificationId) {
        Alert.alert(
          tCommon("reminders.scheduleReminder"),
          tCommon("reminders.testReminder"),
          [{ text: "OK" }]
        );

        // Recargar la lista
        setTimeout(() => loadScheduledNotifications(), 1000);
      } else {
        Alert.alert("Error", tCommon("reminders.reminderSetTestFailed"));
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      Alert.alert("Error", tCommon("reminders.reminderSetSecondError"));
    }
  };

  const handleForceRepeatedTaskCheck = async () => {
    try {
      setIsLoading(true);
      await RepeatedTaskNotificationService.forceNewCheck();
      await loadRepeatedTaskStats();
      Alert.alert(
        "✅" + tCommon("reminders.verifyCompleted"),
        tCommon("reminders.verifyMessage")
      );
      // Recargar notificaciones después de la verificación
      setTimeout(() => loadScheduledNotifications(), 1000);
    } catch (error) {
      console.error("Error forcing repeated task check:", error);
      Alert.alert("❌ Error", tCommon("reminders.notVerifyException"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadRepeatedTaskStats = async () => {
    try {
      const stats =
        await RepeatedTaskNotificationService.getNotificationStats();
      setRepeatedTaskStats(stats);
    } catch (error) {
      console.error("Error loading repeated task stats:", error);
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
        tCommon("reminders.reminderCanceled"),
        tCommon("reminders.reminderCanceledMessageSuccess")
      );
      loadScheduledNotifications();
    } catch (error) {
      console.error("Error canceling notification:", error);
      Alert.alert(
        "Error",
        tCommon("reminders.reminderCanceledMessageSuccessFailed")
      );
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
          📅 {item.scheduledDate.toLocaleDateString(getLocaleForDate(currentLanguage))} {tCommon("reminders.scheduledAt")}{" "}
          {item.scheduledDate.toLocaleTimeString(getLocaleForDate(currentLanguage), {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </ThemedText>
      </ThemedView>

      <TouchableOpacity
        style={[styles.cancelButton, { backgroundColor: "#ff4444" }]}
        onPress={() => handleCancelNotification(item.id, item.taskId)}
      >
        <ThemedText style={styles.cancelButtonText}>{tCommon("buttons.cancel")}</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedText style={[styles.title, { color: textColor }]}>
        {tCommon("reminders.reminderConfigTitle")}
      </ThemedText>

      <ThemedView style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          {tCommon("reminders.testActions")}
        </ThemedText>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#2196f3" }]}
          onPress={handleTestNotification}
        >
          <ThemedText style={styles.actionButtonText}>
            {tCommon("reminders.turnOnNotifications")}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          {tCommon("reminders.repeatedTasks")}
        </ThemedText>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
          onPress={handleForceRepeatedTaskCheck}
          disabled={isLoading}
        >
          <ThemedText style={styles.actionButtonText}>
            {isLoading
              ? tCommon("reminders.verifying")
              : tCommon("reminders.repeatedTaskCheck")}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          ℹ️ {tCommon("reminders.information")}
        </ThemedText>

        <ThemedView
          style={[
            styles.infoBox,
            { backgroundColor: tintColor + "20", borderColor: tintColor },
          ]}
        >
          <ThemedText style={[styles.infoText, { color: textColor }]}>
            {tCommon("reminders.infoOne")}
            {"\n"}📆 {tCommon("reminders.infoTwo")}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          {tCommon("reminders.scheduledReminders")} (
          {scheduledNotifications.length})
          {isLoading && (
            <ThemedText style={{ color: tintColor }}> 🔄</ThemedText>
          )}
        </ThemedText>

        {isLoading && (
          <ThemedText style={[styles.loadingText, { color: tintColor }]}>
            {tCommon("reminders.loadingReminders")}
          </ThemedText>
        )}

        {!isLoading && scheduledNotifications.length === 0 && (
          <ThemedText style={[styles.emptyText, { color: textColor }]}>
            {tCommon("reminders.noReminders")}
            {"\n"}
            {tCommon("reminders.infoFour")}
          </ThemedText>
        )}

        {!isLoading && scheduledNotifications.length > 0 && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 250 }}
          >
            <FlatList
              data={scheduledNotifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </ScrollView>
        )}
      </ThemedView>

      {/* Sección de información */}
    </ThemedView>
  );
}
