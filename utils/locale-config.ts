import { I18nManager } from 'react-native';

// Configurar locale para DateTimePicker y otras funciones de fecha
export const configureLocale = () => {
  // Como estamos en Expo Go, usamos configuración manual
  // Detectar si el dispositivo está configurado para RTL (puede indicar idioma)
  const isRTL = I18nManager.isRTL;
  
  // Por defecto, usar español
  return {
    locale: 'es-ES',
    languageCode: 'es',
    countryCode: 'ES',
    isRTL
  };
};

// Formatear fecha con locale correcto
export const formatDateLocalized = (date: Date): string => {
  const { locale } = configureLocale();
  
  try {
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    // Fallback manual para español
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
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

// Configuración específica para DateTimePicker
export const getDateTimePickerLocale = (): string => {
  // Para Expo Go, forzamos español
  return 'es-ES';
};
