import { configureLocale, formatDateLocalized, formatTimeLocalized, getDayName, getMonthName } from '@/utils/locale-config';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook para usar localización de fechas que se actualiza automáticamente con i18next
 */
export const useLocalization = () => {
  const { i18n } = useTranslation();
  const [locale, setLocale] = useState(configureLocale());
  
  // Actualizar locale cuando cambia el idioma
  useEffect(() => {
    const handleLanguageChange = () => {
      setLocale(configureLocale());
    };
    
    // Suscribirse a cambios de idioma
    i18n.on('languageChanged', handleLanguageChange);
    
    // Cleanup
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  return {
    locale,
    formatDate: formatDateLocalized,
    formatTime: formatTimeLocalized,
    getDayName,
    getMonthName,
    isRTL: locale.isRTL,
    languageCode: locale.languageCode,
    countryCode: locale.countryCode,
  };
};
