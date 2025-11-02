import { getLocales } from 'expo-localization';
import { useTranslation } from 'react-i18next';

/**
 * Hook personalizado para usar traducciones de manera más conveniente
 */
export const useI18n = () => {
  const { t, i18n } = useTranslation();
  
  // Función para cambiar idioma
  const changeLanguage = (language: string) => {
    console.log(`🌍 Cambiando idioma a: ${language}`);
    i18n.changeLanguage(language);
  };
  
  // Función para obtener idioma actual
  const getCurrentLanguage = () => {
    return i18n.language;
  };
  
  // Función para obtener idioma del dispositivo
  const getDeviceLanguage = () => {
    try {
      const locales = getLocales();
      if (locales && locales.length > 0) {
        return {
          languageCode: locales[0].languageCode,
          languageTag: locales[0].languageTag,
          regionCode: locales[0].regionCode,
          textDirection: locales[0].textDirection,
        };
      }
    } catch (error) {
      console.warn('Error obteniendo idioma del dispositivo:', error);
    }
    return null;
  };
  
  // Función para verificar si un idioma está disponible
  const isLanguageAvailable = (language: string) => {
    return Object.keys(i18n.services.resourceStore.data).includes(language);
  };
  
  // Traducciones específicas por namespace
  const tCommon = (key: string, options?: any): string => t(key, { ...options, ns: 'common' }) as string;
  const tAgenda = (key: string, options?: any): string => t(key, { ...options, ns: 'agenda' }) as string;
  
  return {
    t,
    tCommon,
    tAgenda,
    changeLanguage,
    getCurrentLanguage,
    getDeviceLanguage,
    isLanguageAvailable,
    currentLanguage: i18n.language,
    availableLanguages: ['es', 'en'],
    deviceLanguage: getDeviceLanguage(),
  };
};

/**
 * Hook para traducciones de agenda específicamente
 */
export const useAgendaTranslation = () => {
  const { t } = useTranslation('agenda');
  return { t: (key: string, options?: any): string => t(key, options) as string };
};

/**
 * Hook para traducciones comunes específicamente
 */
export const useCommonTranslation = () => {
  const { t } = useTranslation('common');
  return { t: (key: string, options?: any): string => t(key, options) as string };
};
