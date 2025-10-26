import { Alert } from 'react-native';
import { useVersionStore } from '../stores/version-store';

export const VersionNotificationService = {
  checkAndShowUpdateNotification: () => {
    const { checkForVersionUpdate, currentVersion, previousVersion, markNotificationShown } = useVersionStore.getState();
    
    if (checkForVersionUpdate()) {
      Alert.alert(
        '🎉 Nueva versión instalada',
        `Has actualizado la app de la versión ${previousVersion} a la ${currentVersion}.\n\n✨ ¡Disfruta de las nuevas funciones y mejoras!`,
        [
          {
            text: 'Ver cambios',
            onPress: () => {
              // Aquí se podría navegar a una pantalla de changelog
              Alert.alert(
                '📋 Cambios en v1.4.0',
                '• Sistema de notificación de actualizaciones\n• Eliminado botón debug que causaba interferencias\n• Sistema de seguimiento de versiones\n• Optimización del widget con datos dinámicos'
              );
            },
          },
          {
            text: 'Entendido',
            style: 'default',
          },
        ]
      );
      
      markNotificationShown();
    }
  },

  // Función para simular una actualización (útil para testing)
  simulateUpdate: (newVersion: string) => {
    const { updateVersion } = useVersionStore.getState();
    updateVersion(newVersion);
  },

  // Función para obtener información de la versión actual
  getVersionInfo: () => {
    const { currentVersion, previousVersion, isFirstLaunch } = useVersionStore.getState();
    return {
      currentVersion,
      previousVersion,
      isFirstLaunch,
    };
  },
};
