import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VersionNotificationService } from '@/services/version-notification-service';
import { useVersionStore } from '@/stores/version-store';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';

export default function VersionInfoButton() {
  const { currentVersion, previousVersion, isFirstLaunch } = useVersionStore();

  const simulateVersionUpdate = () => {
    // Primero simular versión anterior
    VersionNotificationService.simulateUpdate('1.3.0');
    setTimeout(() => {
      // Luego simular actualización
      VersionNotificationService.simulateUpdate('1.4.0');
      // Mostrar notificación después de un momento
      setTimeout(() => {
        VersionNotificationService.checkAndShowUpdateNotification();
      }, 1000);
    }, 500);
  };

  const handleVersionPress = () => {
    const versionInfo = VersionNotificationService.getVersionInfo();
    
    Alert.alert(
      '📱 Información de Versión',
      `Versión actual: ${versionInfo.currentVersion}\n${
        versionInfo.previousVersion 
          ? `Versión anterior: ${versionInfo.previousVersion}` 
          : 'Primera instalación'
      }\n\n¿Qué quieres ver?`,
      [
        {
          text: 'Changelog',
          onPress: () => {
            Alert.alert(
              '📋 Historial de Cambios',
              '• v1.4.0: Sistema de notificación de actualizaciones, eliminado botón debug, optimización del widget\n' +
              '• v1.3.0: Widget de Android agregado\n' +
              '• v1.1.0: Cambio de tamaño de fuente, changelog\n' +
              '• v1.0.0: Agenda inicial con recordatorios y tareas',
              [{ text: 'Cerrar', style: 'cancel' }]
            );
          },
        },
        {
          text: 'Simular Actualización',
          onPress: () => {
            Alert.alert(
              '🧪 Simular Actualización',
              'Esto simulará una actualización de v1.3.0 a v1.4.0 para probar el sistema de notificaciones.',
              [
                {
                  text: 'Cancelar',
                  style: 'cancel',
                },
                {
                  text: 'Simular',
                  onPress: simulateVersionUpdate,
                },
              ]
            );
          },
        },
        {
          text: 'Cerrar',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleVersionPress}>
        <ThemedText style={styles.buttonText}>
          📱 Información de Versión
        </ThemedText>
        <ThemedText style={styles.versionText}>
          v{currentVersion}
          {previousVersion && !isFirstLaunch && (
            <ThemedText style={styles.updateIndicator}> • Actualizada</ThemedText>
          )}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  versionText: {
    fontSize: 14,
    opacity: 0.8,
  },
  updateIndicator: {
    color: '#34C759',
    fontWeight: 'bold',
  },
});
