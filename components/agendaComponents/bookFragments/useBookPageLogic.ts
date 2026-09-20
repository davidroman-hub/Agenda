import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import { PageTurnState, TurnDirection } from "@/utils/page-turn";
import { useCallback, useRef, useState } from "react";
import { PanResponder } from "react-native";

interface BookPageLogicOptions {
  // Scroll vertical actual del libro, para que la hoja que gira se dibuje igual de desplazada
  readonly getScrollOffset?: () => number;
}

export const useBookPageLogic = ({
  getScrollOffset,
}: BookPageLogicOptions = {}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null
  );
  // Hoja girando ahora mismo (null si el libro está quieto). Ver PageTurn
  const [turn, setTurn] = useState<PageTurnState | null>(null);
  const lastTurnId = useRef(0);

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

  // Pasa de página con el giro de la hoja. El libro cambia ya a la página nueva y PageTurn
  // dibuja encima la hoja girando; mientras gira no se admite otro giro
  const turnPage = (direction: TurnDirection) => {
    if (turn) return;

    // Limpiar patrones huérfanos antes de cambiar de página
    cleanUpOrphanedPatterns();

    // Sin límite: también se puede ir a días anteriores a hoy (índices negativos)
    const to = currentPageIndex + (direction === "next" ? 1 : -1);
    lastTurnId.current += 1;
    setTurn({
      id: lastTurnId.current,
      from: currentPageIndex,
      to,
      direction,
      scrollOffset: getScrollOffset?.() ?? 0,
    });
    setCurrentPageIndex(to);
  };

  const goToNextPage = () => turnPage("next");
  const goToPrevPage = () => turnPage("prev");

  const endTurn = useCallback((id: number) => {
    setTurn((current) => (current?.id === id ? null : current));
  }, []);

  // Salto directo a una página (sin la animación de pasar página), p. ej. al abrir una notificación
  const goToPage = (pageIndex: number) => {
    setTurn(null);
    setCurrentPageIndex(pageIndex);
  };

  const goToToday = () => {
    setTurn(null);
    setCurrentPageIndex(0);
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
    turn,
    endTurn,
    goToNextPage,
    goToPrevPage,
    goToPage,
    goToToday,
    panResponder,
    getTranslateX,
  };
};
