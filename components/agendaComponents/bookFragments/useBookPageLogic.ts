import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import { useState } from "react";
import { PanResponder } from "react-native";

export const useBookPageLogic = () => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null
  );
  const [showPageTransition, setShowPageTransition] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);

  const { repeatingPatterns, removeRepeatingPattern } = useRepeatingTasksStore(
    (state) => state
  );
  const allTasks = useAgendaTasksStore((state) => state.getAllTasks());

  // Transformar de estructura por fecha/línea a array simple de tareas
  const allTaskArray = Object.entries(allTasks).flatMap(([date, dayTasks]) =>
    Object.values(dayTasks).filter((task) => task !== null)
  );

  const compareWhichTaksAreStillRepeatingUsignRepeatingPatterns = () => {
    // Obtener todos los IDs de tareas originales que existen actualmente
    const existingTaskIds = new Set(
      allTaskArray.map((task) => task?.id).filter(Boolean)
    );

    // Buscar patrones que no tienen tarea original correspondiente
    const orphanedPatterns = repeatingPatterns.filter(
      (pattern) =>
        pattern.isActive && !existingTaskIds.has(pattern.originalTaskId)
    );

    // Buscar tareas que tienen patrones que ya no existen
    const tasksWithOrphanedPatterns = allTaskArray.filter(
      (task) =>
        task?.repeatingPatternId &&
        !repeatingPatterns.some(
          (pattern) => pattern.id === task.repeatingPatternId
        )
    );

    return {
      orphanedPatterns,
      tasksWithOrphanedPatterns,
      existingTaskIds: Array.from(existingTaskIds),
      patternTaskIds: repeatingPatterns.map((p) => p.originalTaskId),
    };
  };

  // Función para limpiar patrones huérfanos
  const cleanUpOrphanedPatterns = () => {
    const analysis = compareWhichTaksAreStillRepeatingUsignRepeatingPatterns();
    if (analysis.orphanedPatterns.length > 0) {
      for (const pattern of analysis.orphanedPatterns) {
        removeRepeatingPattern(pattern.originalTaskId);
      }
    }
  };

  const goToNextPage = () => {
    // Limpiar patrones huérfanos antes de cambiar de página
    cleanUpOrphanedPatterns();
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
          setCurrentPageIndex((prev) => prev + 1);
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

    // Limpiar patrones huérfanos antes de cambiar de página
    cleanUpOrphanedPatterns();

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
          setCurrentPageIndex((prev) => Math.max(0, prev - 1));
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
        setSwipeDirection(dx > 0 ? "right" : "left");
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
    if (swipeDirection === "right") return 8;
    if (swipeDirection === "left") return -8;
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
