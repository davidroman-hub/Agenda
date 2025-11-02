import useLanguagePreferencesStore from '@/stores/language-preferences-store';
import { getLocales } from 'expo-localization';
import { useTranslation } from 'react-i18next';

/**
 * Hook personalizado para usar traducciones de manera más conveniente
 */
export const useI18n = () => {
  const { t, i18n } = useTranslation();
  const { setUserLanguage, getUserLanguage, clearUserLanguage } = useLanguagePreferencesStore();
  
  // Función para cambiar idioma y guardar la preferencia
  const changeLanguage = (language: string) => {
    console.log(`🌍 Cambiando idioma a: ${language}`);
    
    // Cambiar idioma en i18next
    i18n.changeLanguage(language);
    
    // Guardar preferencia del usuario
    setUserLanguage(language);
  };
  
  // Función para restablecer al idioma automático del dispositivo
  const resetToDeviceLanguage = () => {
    console.log('🌍 Restableciendo a idioma automático del dispositivo');
    
    // Limpiar preferencia del usuario
    clearUserLanguage();
    
    // Detectar idioma del dispositivo y cambiar
    const deviceLang = getDeviceLanguageCode();
    if (deviceLang) {
      i18n.changeLanguage(deviceLang);
    }
  };
  
  // Función para obtener código de idioma del dispositivo
  const getDeviceLanguageCode = (): string | null => {
    try {
      const locales = getLocales();
      if (locales && locales.length > 0) {
        const languageCode = locales[0].languageCode;
        const availableLanguages = ['es', 'en'];
        return availableLanguages.includes(languageCode || '') ? languageCode : 'en';
      }
    } catch (error) {
      console.warn('Error obteniendo idioma del dispositivo:', error);
    }
    return 'en';
  };
  
  // Función para obtener idioma actual
  const getCurrentLanguage = () => {
    return i18n.language;
  };
  
  // Función para obtener información completa del dispositivo
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
  
  // Función para verificar si el usuario ha seleccionado un idioma manualmente
  const hasUserSelectedLanguage = () => {
    return getUserLanguage() !== null;
  };
  
  // Traducciones específicas por namespace
  const tCommon = (key: string, options?: any): string => t(key, { ...options, ns: 'common' }) as string;
  const tAgenda = (key: string, options?: any): string => t(key, { ...options, ns: 'agenda' }) as string;
  
  return {
    t,
    tCommon,
    tAgenda,
    changeLanguage,
    resetToDeviceLanguage,
    getCurrentLanguage,
    getDeviceLanguage,
    getDeviceLanguageCode,
    isLanguageAvailable,
    hasUserSelectedLanguage,
    currentLanguage: i18n.language,
    userSelectedLanguage: getUserLanguage(),
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
