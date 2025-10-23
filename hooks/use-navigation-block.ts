import useLoginStore from '@/stores/login-store';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

// Hook para manejar navegación inteligente hacia atrás
export function useNavigationBlock() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn } = useLoginStore();
  const lastScreenRef = useRef<string | null>(null);

  // Capturar la última pantalla visitada
  useEffect(() => {
    if (isLoggedIn && pathname !== '/(tabs)/login') {
      lastScreenRef.current = pathname;
    }
  }, [pathname, isLoggedIn]);

  useEffect(() => {
    // Para Android - manejar botón de atrás del hardware
    if (Platform.OS === 'android') {
      const backAction = () => {
        // Si está en login y no está logueado, permitir salir de la app
        if (pathname === '/(tabs)/login' && !isLoggedIn) {
          return false; // Permite salir de la app
        }
        
        // Si está logueado y hay una pantalla previa, navegar a ella
        if (isLoggedIn && lastScreenRef.current && lastScreenRef.current !== pathname) {
          router.push(lastScreenRef.current as any);
          return true; // Previene la acción por defecto
        }
        
        // Si está logueado pero es la primera pantalla, ir a agenda principal
        if (isLoggedIn && pathname !== '/(tabs)' && pathname !== '/(tabs)/index') {
          router.push('/(tabs)');
          return true;
        }
        
        // Si está en agenda principal y logueado, salir de la app
        if (isLoggedIn && (pathname === '/(tabs)' || pathname === '/(tabs)/index')) {
          return false; // Permite salir de la app
        }
        
        return false;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => backHandler.remove();
    }
  }, [pathname, isLoggedIn, router]);

  // Para web - manejar navegación del navegador
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handlePopState = (event: PopStateEvent) => {
        // Si está logueado y trata de ir hacia atrás
        if (isLoggedIn) {
          // Si hay una pantalla previa válida, ir a ella
          if (lastScreenRef.current && !globalThis.location.pathname.includes('login')) {
            router.push(lastScreenRef.current as any);
            return;
          }
          
          // Si trata de ir al login estando logueado, redirigir a agenda
          if (globalThis.location.pathname.includes('login')) {
            event.preventDefault();
            router.replace('/(tabs)');
            return;
          }
        }
      };

      globalThis.addEventListener('popstate', handlePopState);

      return () => {
        globalThis.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isLoggedIn, router]);
}

// Hook para manejar gestos de swipe
export function useSwipeBlock() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Bloquear gestos de navegación en navegadores web
      const preventSwipe = (e: Event) => {
        e.preventDefault();
      };

      // Deshabilitar gestos de swipe hacia atrás/adelante en navegadores
      globalThis.addEventListener('touchstart', preventSwipe, { passive: false });
      globalThis.addEventListener('touchmove', preventSwipe, { passive: false });
      
      return () => {
        globalThis.removeEventListener('touchstart', preventSwipe);
        globalThis.removeEventListener('touchmove', preventSwipe);
      };
    }
  }, []);
}
