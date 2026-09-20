import { positiveModulo } from "@/utils/page-turn";
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  RING_HEIGHT,
  RING_PITCH,
  RING_WIDTH,
  SPINE_WIDTH,
} from "../bookStyles";

interface BookSpineProps {
  readonly height: number;
  readonly colorScheme: string;
  // Scroll del contenido: los aros se mueven con las páginas, como en un libro de verdad
  readonly scrollY: SharedValue<number>;
}

// Un aro de anilla: óvalo dorado (más claro arriba, más oscuro abajo) metido en su ranura
function Ring({ dark }: { readonly dark: boolean }) {
  return (
    <View style={styles.ringSlot}>
      <View style={[styles.hole, dark ? styles.holeDark : styles.holeLight]} />
      <View style={styles.ring} />
    </View>
  );
}

// Lomo del libro: franja de papel entre las dos páginas con la hilera de aros. Se dibuja por
// encima de las páginas y de la hoja que gira, que pivota justo sobre él.
export default function BookSpine({ height, colorScheme, scrollY }: BookSpineProps) {
  const dark = colorScheme === "dark";
  const ringCount = Math.ceil(height / RING_PITCH) + 1;

  // El patrón se repite cada RING_PITCH, así que basta desplazarlo el resto del scroll
  const ringsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -positiveModulo(scrollY.value, RING_PITCH) }],
  }));

  return (
    <View pointerEvents="none" style={styles.spine}>
      <View style={[styles.strip, dark ? styles.stripDark : styles.stripLight]}>
        <View style={[styles.crease, dark ? styles.creaseDark : styles.creaseLight]} />
      </View>
      <Animated.View style={[styles.rings, { height: ringCount * RING_PITCH }, ringsStyle]}>
        {Array.from({ length: ringCount }, (_, index) => (
          <View key={`ring-${index}`} style={styles.ringCell}>
            <Ring dark={dark} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  spine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: RING_WIDTH,
    marginLeft: -RING_WIDTH / 2,
    alignItems: "center",
    overflow: "hidden",
  },
  strip: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SPINE_WIDTH,
    alignItems: "center",
  },
  stripLight: { backgroundColor: "#fbfaf6" },
  stripDark: { backgroundColor: "#242424" },
  // Marca del pliegue en el centro del lomo
  crease: { flex: 1, width: 1 },
  creaseLight: { backgroundColor: "rgba(0,0,0,0.12)" },
  creaseDark: { backgroundColor: "rgba(0,0,0,0.55)" },
  rings: { position: "absolute", top: 0, width: RING_WIDTH },
  ringCell: {
    height: RING_PITCH,
    alignItems: "center",
    justifyContent: "center",
  },
  ringSlot: {
    width: RING_WIDTH,
    height: RING_HEIGHT + 4,
    alignItems: "center",
    justifyContent: "center",
  },
  // Ranura del papel por donde pasa el aro: una rendija oscura dentro del óvalo
  hole: {
    position: "absolute",
    width: RING_WIDTH - 10,
    height: RING_HEIGHT - 4,
    borderRadius: (RING_HEIGHT - 4) / 2,
  },
  holeLight: { backgroundColor: "rgba(0,0,0,0.22)" },
  holeDark: { backgroundColor: "rgba(0,0,0,0.45)" },
  ring: {
    width: RING_WIDTH,
    height: RING_HEIGHT,
    borderRadius: RING_HEIGHT / 2,
    borderWidth: 2,
    borderTopColor: "#f3e2a4",
    borderBottomColor: "#9a7a2c",
    borderLeftColor: "#c9a54c",
    borderRightColor: "#c9a54c",
  },
});
