import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { notificationService } from "@/services/notifications/notification-service";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

interface NotificationIconWithBadgeProps {
  readonly color: string;
  readonly size?: number;
}

export default function NotificationIconWithBadge({ 
  color, 
  size = 28 
}: NotificationIconWithBadgeProps) {
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Suscribirse a cambios en las tareas para actualizar el badge automáticamente
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);

  const loadNotificationCount = async () => {
    try {
      const notifications = await notificationService.getScheduledNotifications();
      const taskNotifications = notifications.filter(
        n => n.content.data?.type === 'task-reminder'
      );
      setNotificationCount(taskNotifications.length);
    } catch (error) {
      console.error('Error loading notification count:', error);
      setNotificationCount(0);
    }
  };

  useEffect(() => {
    loadNotificationCount();
  }, []);

  // Recargar automáticamente cuando cambien las tareas
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadNotificationCount();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [tasksByDate]);

  return (
    <View style={styles.container}>
      <IconSymbol size={size} name="bell" color={color} />
      {notificationCount > 0 && (
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>
            {notificationCount > 99 ? '99+' : notificationCount.toString()}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
});
