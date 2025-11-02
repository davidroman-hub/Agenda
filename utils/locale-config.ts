import i18n from '@/config/i18n';
import { I18nManager } from 'react-native';

// Configurar locale para DateTimePicker y otras funciones de fecha
export const configureLocale = () => {
  // Obtener el idioma actual de i18next
  const currentLanguage = i18n.language || 'es';
  
  // Detectar si el dispositivo está configurado para RTL
  const isRTL = I18nManager.isRTL;
  
  // Mapear idioma a locale completo
  const localeMap: Record<string, { locale: string; countryCode: string }> = {
    'es': { locale: 'es-ES', countryCode: 'ES' },
    'en': { locale: 'en-US', countryCode: 'US' },
    'it': { locale: 'it-IT', countryCode: 'IT' },
    'fr': { locale: 'fr-FR', countryCode: 'FR' },
  };
  
  const config = localeMap[currentLanguage] || localeMap['es'];
  
  return {
    locale: config.locale,
    languageCode: currentLanguage,
    countryCode: config.countryCode,
    isRTL
  };
};

// Formatear fecha con locale correcto basado en i18next
export const formatDateLocalized = (date: Date): string => {
  const { locale, languageCode } = configureLocale();
  
  try {
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    // Fallback manual basado en el idioma de i18next
    if (languageCode === 'en') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } else if (languageCode === 'it') {
      const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
                     'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
      
      return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } else if (languageCode === 'fr') {
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                     'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      
      return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } else {
      // Fallback para español
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                     'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }
  }
};

// Formatear hora con locale correcto
export const formatTimeLocalized = (date: Date): string => {
  const { locale } = configureLocale();
  
  try {
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    // Fallback manual
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

// Configuración específica para DateTimePicker basada en i18next
export const getDateTimePickerLocale = (): string => {
  const { locale } = configureLocale();
  return locale;
};

// Formatear fecha completa con traducciones de i18next
export const formatDateWithI18n = (date: Date): string => {
  const { languageCode } = configureLocale();
  
  // Mapeo de índices a claves de traducción
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december'];
  
  // Obtener traducciones usando i18next
  const dayName = i18n.t(`days.${dayKeys[date.getDay()]}`, { ns: 'agenda' });
  const monthName = i18n.t(`months.${monthKeys[date.getMonth()]}`, { ns: 'agenda' });
  
  if (languageCode === 'en') {
    return `${dayName}, ${monthName} ${date.getDate()}, ${date.getFullYear()}`;
  } else if (languageCode === 'it') {
    return `${dayName}, ${date.getDate()} ${monthName} ${date.getFullYear()}`;
  } else if (languageCode === 'fr') {
    return `${dayName}, ${date.getDate()} ${monthName} ${date.getFullYear()}`;
  } else {
    // Formato para español
    return `${dayName}, ${date.getDate()} de ${monthName} de ${date.getFullYear()}`;
  }
};

// Obtener nombre del día basado en traducciones de i18next
export const getDayName = (dayIndex: number): string => {
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return i18n.t(`days.${dayKeys[dayIndex]}`, { ns: 'agenda' });
};

// Obtener nombre del mes basado en traducciones de i18next
export const getMonthName = (monthIndex: number): string => {
  const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december'];
  return i18n.t(`months.${monthKeys[monthIndex]}`, { ns: 'agenda' });
};
