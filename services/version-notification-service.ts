import i18n from 'i18next';
import { Alert, AlertButton } from 'react-native';
import { changeLogLocales } from '../components/settings/changeLogLocales';
import { useVersionStore } from '../stores/version-store';
import { getChangelogForVersion } from '../utils/changelog-utils';

// Espera tras el arranque antes de enseñar el aviso, para no interrumpir la carga de la app
const CHECK_DELAY_MS = 2000;

const t = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, { ...options, ns: 'common' }) as string;

// Cambios de una versión en el idioma actual (o en inglés), sin marcas de negrita; null si esa versión no tiene entrada
const getChangesForVersion = (version: string): string | null => {
  const language = (i18n.language ?? 'en').split('-')[0] as keyof typeof changeLogLocales;
  const { changes } = changeLogLocales[language] ?? changeLogLocales.en;
  const block = getChangelogForVersion(changes, version);
  return block ? block.replace(/\*\*/g, '') : null;
};

export const VersionNotificationService = {
  /**
   * Registra la versión instalada y, poco después, avisa si el usuario acaba de actualizar.
   * Devuelve una función para cancelarlo.
   *
   * El store se hidrata de forma asíncrona desde AsyncStorage; hay que esperar a que
   * termine, o se compararía contra el estado por defecto y se pisaría la versión guardada.
   */
  start: (appVersion: string, delayMs: number = CHECK_DELAY_MS): (() => void) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopWaiting: (() => void) | undefined;

    const registerVersionAndCheck = () => {
      useVersionStore.getState().updateVersion(appVersion);
      timer = setTimeout(
        VersionNotificationService.checkAndShowUpdateNotification,
        delayMs
      );
    };

    if (useVersionStore.persist.hasHydrated()) {
      registerVersionAndCheck();
    } else {
      stopWaiting = useVersionStore.persist.onFinishHydration(() => {
        stopWaiting?.();
        registerVersionAndCheck();
      });
    }

    return () => {
      stopWaiting?.();
      if (timer) clearTimeout(timer);
    };
  },

  checkAndShowUpdateNotification: () => {
    const { checkForVersionUpdate, currentVersion, previousVersion, markNotificationShown } = useVersionStore.getState();

    if (!checkForVersionUpdate() || !currentVersion) return;

    const buttons: AlertButton[] = [];

    // Solo se ofrece "Ver cambios" si esta versión tiene entrada en el changelog de la app
    const changes = getChangesForVersion(currentVersion);
    if (changes) {
      buttons.push({
        text: t('versionUpdate.viewChanges'),
        onPress: () =>
          Alert.alert(
            t('versionUpdate.changesTitle', { version: currentVersion }),
            changes
          ),
      });
    }
    buttons.push({ text: t('versionUpdate.gotIt'), style: 'default' });

    Alert.alert(
      t('versionUpdate.title'),
      t('versionUpdate.message', { previous: previousVersion, current: currentVersion }),
      buttons
    );

    markNotificationShown();
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
