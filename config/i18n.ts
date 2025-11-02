import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importar traducciones - Español
import esAgenda from '../locales/es/agenda.json';
import esCommon from '../locales/es/common.json';

// Importar traducciones - Inglés
import enAgenda from '../locales/en/agenda.json';
import enCommon from '../locales/en/common.json';

// Idiomas soportados
const SUPPORTED_LANGUAGES = new Set(['es', 'en']);

// Función para detectar el idioma del dispositivo
const getDeviceLanguage = (): string => {
  try {
    // Obtener los locales del dispositivo
    const locales = getLocales();
    
    if (locales && locales.length > 0) {
      // Obtener el idioma principal del dispositivo
      const primaryLocale = locales[0];
      const deviceLanguage = primaryLocale.languageCode;
      
      // Verificar que el idioma no sea null y esté soportado
      if (deviceLanguage && SUPPORTED_LANGUAGES.has(deviceLanguage)) {
        console.log(`🌍 Idioma detectado del dispositivo: ${deviceLanguage} (${primaryLocale.languageTag})`);
        return deviceLanguage;
      }
      
      // Si no está soportado, usar inglés como fallback
      console.log(`🌍 Idioma del dispositivo (${deviceLanguage || 'desconocido'}) no soportado. Usando inglés como fallback.`);
      return 'en';
    }
  } catch (error) {
    console.warn('🌍 Error detectando idioma del dispositivo:', error);
  }
  
  // Fallback por defecto
  console.log('🌍 No se pudo detectar idioma del dispositivo. Usando inglés como fallback.');
  return 'en';
};

// Detectar idioma del dispositivo
const detectedLanguage = getDeviceLanguage();

i18n
  .use(initReactI18next)
  .init({
    lng: detectedLanguage, // usar idioma detectado del dispositivo
    fallbackLng: 'en', // idioma de respaldo (inglés)
    
    resources: {
      es: {
        common: esCommon,
        agenda: esAgenda,
      },
      en: {
        common: enCommon,
        agenda: enAgenda,
      },
    },

    interpolation: {
      escapeValue: false, // React ya escapa por defecto
    },

    // Namespace por defecto
    defaultNS: 'common',
    
    // Configuración de debug (solo en desarrollo)
    debug: __DEV__ ?? false,
    
    // Configuración adicional para React Native
    react: {
      useSuspense: false, // evitar problemas en React Native
    },
  });

console.log(`🌍 i18next inicializado con idioma: ${detectedLanguage}`);

export default i18n;
