import React, { useCallback, useRef } from "react";
import Animated, {
  SharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { styles } from "../bookStyles";
import BookSpread from "./BookSpread";

interface BookPagesContentProps {
  readonly days: Date[];
  readonly columns: number;
  readonly colorScheme: string;
  readonly colors: any;
  readonly dynamicStyles: any;
  // Scroll vertical actual: lo comparten los aros del lomo para moverse con las páginas
  readonly scrollY: SharedValue<number>;
  tAgenda: (key: string, options?: any) => string;
  tCommon: (key: string, options?: any) => string;
  onScrollChange?: (
    scrollProgress: number,
    isAtBottom: boolean,
    offsetY: number
  ) => void;
}

export default function BookPagesContent({
  days,
  columns,
  colorScheme,
  colors,
  dynamicStyles,
  scrollY,
  tAgenda,
  tCommon,
  onScrollChange,
}: BookPagesContentProps) {
  // El callback cambia en cada render del padre; se lee por ref para que el manejador de
  // scroll (que corre en el hilo de UI) no se recree constantemente
  const onScrollChangeRef = useRef(onScrollChange);
  onScrollChangeRef.current = onScrollChange;

  const reportScroll = useCallback(
    (scrollOffset: number, totalHeight: number, containerHeight: number) => {
      // Calcular progreso del scroll (0 = top, 1 = bottom)
      const maxScrollY = totalHeight - containerHeight;
      const scrollProgress =
        maxScrollY > 0 ? Math.min(scrollOffset / maxScrollY, 1) : 0;

      // Determinar si está en el fondo (con un pequeño margen)
      const isAtBottom = scrollOffset >= maxScrollY - 50;

      onScrollChangeRef.current?.(scrollProgress, isAtBottom, scrollOffset);
    },
    []
  );

  const handleScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    scheduleOnRN(
      reportScroll,
      event.contentOffset.y,
      event.contentSize.height,
      event.layoutMeasurement.height
    );
  });

  return (
    <Animated.ScrollView
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <BookSpread
        days={days}
        columns={columns}
        colorScheme={colorScheme}
        colors={colors}
        dynamicStyles={dynamicStyles}
        tAgenda={tAgenda}
        tCommon={tCommon}
      />
    </Animated.ScrollView>
  );
}
