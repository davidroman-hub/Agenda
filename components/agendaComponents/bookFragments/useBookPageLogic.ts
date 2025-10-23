import { useState } from "react";
import { PanResponder } from "react-native";

export const useBookPageLogic = () => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showPageTransition, setShowPageTransition] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);

  // Funciones para navegación de páginas con efecto de doblez realista
  const goToNextPage = () => {
    setShowPageTransition(true);
    setTransitionProgress(0);
    
    // Efecto más rápido y suave
    const duration = 250;
    const steps = 10;
    
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        setTransitionProgress((i / steps) * 100);
        if (i === Math.floor(steps / 2)) {
          // Cambiar contenido en la mitad de la animación
          setCurrentPageIndex(prev => prev + 1);
        }
        if (i === steps) {
          // Terminar efecto
          setShowPageTransition(false);
          setTransitionProgress(0);
        }
      }, (duration / steps) * i);
    }
  };

  const goToPrevPage = () => {
    if (currentPageIndex === 0) return;
    
    setShowPageTransition(true);
    setTransitionProgress(0);
    
    // Efecto más rápido y suave para página anterior
    const duration = 250;
    const steps = 10;
    
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        setTransitionProgress((i / steps) * 100);
        if (i === Math.floor(steps / 2)) {
          // Cambiar contenido en la mitad de la animación
          setCurrentPageIndex(prev => Math.max(0, prev - 1));
        }
        if (i === steps) {
          // Terminar efecto
          setShowPageTransition(false);
          setTransitionProgress(0);
        }
      }, (duration / steps) * i);
    }
  };

  // Gesture handler para swipe que no interfiere con scroll vertical
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false, // No capturar inmediatamente
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const { dx, dy } = gestureState;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      // Solo activar si el movimiento horizontal es claramente mayor que el vertical
      // Y si el movimiento horizontal es significativo
      return absDx > 25 && absDx > absDy * 2; // Horizontal debe ser al menos 2x mayor que vertical
    },
    onPanResponderGrant: () => {
      setIsFlipping(true);
    },
    onPanResponderMove: (_, gestureState) => {
      const { dx } = gestureState;
      // Solo mostrar dirección si estamos seguros que es horizontal
      if (Math.abs(dx) > 30) {
        setSwipeDirection(dx > 0 ? 'right' : 'left');
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      setIsFlipping(false);
      setSwipeDirection(null);
      
      const { dx, vx } = gestureState;
      const threshold = 40; // Un poco más alto para ser más específico
      
      if (dx > threshold || vx > 0.8) {
        // Swipe derecha - página anterior
        goToPrevPage();
      } else if (dx < -threshold || vx < -0.8) {
        // Swipe izquierda - página siguiente
        goToNextPage();
      }
    },
    onPanResponderTerminate: () => {
      // Reset estados si el gesto es interrumpido
      setIsFlipping(false);
      setSwipeDirection(null);
    },
  });

  // Calcular offset para el efecto visual más pronunciado
  const getTranslateX = () => {
    if (swipeDirection === 'right') return 8;
    if (swipeDirection === 'left') return -8;
    return 0;
  };

  return {
    currentPageIndex,
    isFlipping,
    swipeDirection,
    showPageTransition,
    transitionProgress,
    goToNextPage,
    goToPrevPage,
    panResponder,
    getTranslateX,
  };
};
