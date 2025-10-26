import { useEffect } from 'react';
import { VersionNotificationService } from '../services/version-notification-service';
import { useVersionStore } from '../stores/version-store';

export const useVersionNotification = () => {
  const { updateVersion, currentVersion } = useVersionStore();

  useEffect(() => {
    // Simular detección de versión actual (en una app real esto vendría del package.json o build config)
    const APP_VERSION = '1.4.0';
    
    // Actualizar la versión si es diferente a la almacenada
    if (currentVersion !== APP_VERSION) {
      updateVersion(APP_VERSION);
    }

    // Verificar y mostrar notificación de actualización después de un breve delay
    const timer = setTimeout(() => {
      VersionNotificationService.checkAndShowUpdateNotification();
    }, 2000); // 2 segundos después de que la app se cargue

    return () => clearTimeout(timer);
  }, [currentVersion, updateVersion]);

  return {
    checkUpdate: VersionNotificationService.checkAndShowUpdateNotification,
    getVersionInfo: VersionNotificationService.getVersionInfo,
    simulateUpdate: VersionNotificationService.simulateUpdate,
  };
};
