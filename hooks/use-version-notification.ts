import { useEffect } from 'react';
import pjson from '../app.json';
import { VersionNotificationService } from '../services/version-notification-service';

// La versión sale de app.json (única fuente; el resto se sincroniza con `npm run version:sync`)
const APP_VERSION = pjson.expo.version;

export const useVersionNotification = () => {
  useEffect(() => VersionNotificationService.start(APP_VERSION), []);

  return {
    checkUpdate: VersionNotificationService.checkAndShowUpdateNotification,
    getVersionInfo: VersionNotificationService.getVersionInfo,
    simulateUpdate: VersionNotificationService.simulateUpdate,
  };
};
