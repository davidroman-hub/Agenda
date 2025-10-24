import { Platform } from 'react-native';

// Configurar locale al inicio de la aplicación (Expo Go compatible)
export const initializeLocale = () => {
  console.log('Platform:', Platform.OS);
  console.log('App locale initialized for Expo Go');
  
  // En Expo Go, el DateTimePicker usa el idioma del sistema automáticamente
  // Si el sistema está en español, debería mostrar español
  console.log('Using system locale for DateTimePicker');
};

// Detectar cambios de locale
export const setupLocaleListener = (callback: () => void) => {
  // react-native-localize no tiene addEventListener en versiones recientes
  // Podemos verificar el locale manualmente si es necesario
  console.log('Locale listener setup (manual check required)');
  
  return () => {
    console.log('Locale listener cleanup');
  };
};
