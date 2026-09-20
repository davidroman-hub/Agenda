import {
  getBackAngle,
  getFrontAngle,
  getLeafFlip,
  getLeafShade,
  isFrontFacing,
  PageTurnState,
} from "@/utils/page-turn";
import React, { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SCROLL_PADDING } from "../bookStyles";
import BookSpine from "./BookSpine";

const TURN_DURATION = 520;
// Sombra de las caras de la hoja al girar y sombra ambiente sobre las páginas de debajo
const LEAF_SHADE = 0.26;
const AMBIENT_SHADE = 0.08;

interface PageTurnProps {
  readonly turn: PageTurnState | null;
  readonly onTurnEnd: (id: number) => void;
  // Vista expandida: dos páginas con el lomo en medio y la hoja pivotando sobre él.
  // Si no, una sola columna y la hoja pivota sobre el borde izquierdo.
  readonly twoPages: boolean;
  readonly backgroundColor: string;
  readonly colorScheme: string;
  readonly scrollY: SharedValue<number>;
  // Copia solo para dibujar de la hoja del libro que empieza en esa página
  readonly renderSpread: (pageIndex: number) => React.ReactNode;
  // El libro de verdad (interactivo): siempre está debajo, ya en la página nueva
  readonly children: React.ReactNode;
}

interface ClipProps {
  readonly left: number;
  readonly width: number;
  readonly fullWidth: number;
  readonly height: number;
  readonly offsetY: number;
  readonly backgroundColor: string;
  readonly children: React.ReactNode;
}

// Enseña solo un trozo (izquierda, derecha o todo) de una hoja completa del libro
function SpreadClip({
  left,
  width,
  fullWidth,
  height,
  offsetY,
  backgroundColor,
  children,
}: ClipProps) {
  return (
    <View style={[styles.clip, { width, height, backgroundColor }]}>
      <View
        style={{
          position: "absolute",
          top: -offsetY,
          left: -left,
          width: fullWidth,
          paddingHorizontal: SCROLL_PADDING,
        }}
      >
        {children}
      </View>
    </View>
  );
}

// Envuelve el libro y anima el cambio de página como en una agenda de verdad: una hoja gira
// alrededor del lomo, por delante enseña la página que se va y por detrás la que llega.
//
// El libro real ya está en la página nueva desde el primer momento; encima se dibujan copias
// (sin interacción) de las páginas que se van y las que llegan, que tapan al libro real hasta
// que la hoja termina de girar. La animación corre entera en el hilo de UI, sin renders.
export default function PageTurn({
  turn,
  onTurnEnd,
  twoPages,
  backgroundColor,
  colorScheme,
  scrollY,
  renderSpread,
  children,
}: PageTurnProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const canAnimate = size.width > 0 && size.height > 0 && !reduceMotion;
  const latest = useRef({ canAnimate, onTurnEnd });
  latest.current = { canAnimate, onTurnEnd };

  useEffect(() => {
    if (!turn) {
      // Ya no hay hoja dibujada: la siguiente empezará plana, sin parpadeo
      progress.value = 0;
      return;
    }

    // Sin medidas todavía (o con "reducir movimiento") el libro simplemente cambia de página
    if (!latest.current.canAnimate) {
      latest.current.onTurnEnd(turn.id);
      return;
    }

    const finish = () => latest.current.onTurnEnd(turn.id);
    progress.value = withTiming(
      1,
      { duration: TURN_DURATION, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(finish);
      }
    );

    // Red de seguridad: mientras hay una hoja girando no se admite otro giro, así que si la
    // animación no avisara de que ha terminado el libro se quedaría bloqueado. Terminar dos
    // veces el mismo giro es inocuo
    const fallback = setTimeout(finish, TURN_DURATION + 500);
    return () => clearTimeout(fallback);
  }, [turn, progress]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) =>
      previous.width === width && previous.height === height
        ? previous
        : { width, height }
    );
  };

  const direction = turn?.direction ?? "next";
  const spineX = twoPages ? size.width / 2 : 0;
  const leafWidth = size.width - spineX;
  // Cuanto más ancha la hoja, más lejos la cámara para que no se pegue a la pantalla
  const perspective = Math.max(1200, leafWidth * 5);

  const frontStyle = useAnimatedStyle(() => {
    const flip = getLeafFlip(progress.value, direction);
    return {
      opacity: isFrontFacing(flip) ? 1 : 0,
      transform: [{ perspective }, { rotateY: `${getFrontAngle(flip)}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const flip = getLeafFlip(progress.value, direction);
    return {
      opacity: isFrontFacing(flip) ? 0 : 1,
      transform: [{ perspective }, { rotateY: `${getBackAngle(flip)}deg` }],
    };
  });

  const leafShadeStyle = useAnimatedStyle(() => ({
    opacity: getLeafShade(getLeafFlip(progress.value, direction), LEAF_SHADE),
  }));

  const ambientShadeStyle = useAnimatedStyle(() => ({
    opacity: getLeafShade(getLeafFlip(progress.value, direction), AMBIENT_SHADE),
  }));

  const renderTurn = (activeTurn: PageTurnState) => {
    const isNext = activeTurn.direction === "next";
    const clipProps = {
      fullWidth: size.width,
      height: size.height,
      offsetY: activeTurn.scrollOffset,
      backgroundColor,
    };

    // Cara delantera de la hoja (mitad derecha): la página que se va al avanzar, la que llega al
    // retroceder. La trasera (mitad izquierda) es la contraria.
    const frontPage = isNext ? activeTurn.from : activeTurn.to;
    const backPage = isNext ? activeTurn.to : activeTurn.from;

    return (
      <>
        {/* Lo que no se mueve: al avanzar, la página izquierda vieja; al retroceder, la derecha vieja */}
        {(isNext ? twoPages : true) && (
          <View
            pointerEvents="none"
            style={[
              styles.layer,
              { left: isNext ? 0 : spineX, width: isNext ? spineX : leafWidth },
            ]}
          >
            <SpreadClip
              {...clipProps}
              left={isNext ? 0 : spineX}
              width={isNext ? spineX : leafWidth}
            >
              {renderSpread(activeTurn.from)}
            </SpreadClip>
          </View>
        )}

        <Animated.View
          pointerEvents="none"
          style={[styles.dim, ambientShadeStyle]}
        />

        {twoPages && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.layer,
              styles.backLeaf,
              { left: 0, width: spineX, height: size.height },
              backStyle,
            ]}
          >
            <SpreadClip {...clipProps} left={0} width={spineX}>
              {renderSpread(backPage)}
            </SpreadClip>
            <Animated.View style={[styles.dim, leafShadeStyle]} />
          </Animated.View>
        )}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.layer,
            styles.frontLeaf,
            { left: spineX, width: leafWidth, height: size.height },
            frontStyle,
          ]}
        >
          <SpreadClip {...clipProps} left={spineX} width={leafWidth}>
            {renderSpread(frontPage)}
          </SpreadClip>
          <Animated.View style={[styles.dim, leafShadeStyle]} />
        </Animated.View>
      </>
    );
  };

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {children}
      {turn && canAnimate && renderTurn(turn)}
      {twoPages && size.height > 0 && (
        <BookSpine
          height={size.height}
          colorScheme={colorScheme}
          scrollY={scrollY}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  layer: {
    position: "absolute",
    top: 0,
  },
  clip: {
    overflow: "hidden",
  },
  // La hoja gira sobre el lomo: la delantera pivota en su borde izquierdo, la trasera en el derecho
  frontLeaf: {
    transformOrigin: "left center",
  },
  backLeaf: {
    transformOrigin: "right center",
  },
  // Capa negra translúcida (opacidad animada) para dar volumen
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    opacity: 0,
  },
});
