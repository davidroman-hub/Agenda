import useThemeStore from '@/stores/theme-store';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export function useColorScheme() {
  const systemColorScheme = useSystemColorScheme();
  const { colorScheme } = useThemeStore();
  
  // Si el usuario ha elegido un tema manual, usarlo, sino usar el del sistema
  return colorScheme || systemColorScheme;
}
