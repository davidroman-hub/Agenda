import { positiveModulo } from "@/utils/page-turn";
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  COMPACT_RING_WIDTH,
  COMPACT_SPINE_WIDTH,
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
  // Lomo pequeño para pantallas justas: aros más chicos y pegados al borde de la página de tareas
  readonly compact?: boolean;
  // Distancia entre aros; por defecto la del lomo normal o la del compacto
  readonly ringPitch?: number;
}

const COMPACT_RING_HEIGHT = 6;
const COMPACT_RING_PITCH = 20;

// Un aro de anilla: óvalo dorado (más claro arriba, más oscuro abajo) metido en su ranura
function Ring({ dark, compact }: { readonly dark: boolean; readonly compact: boolean }) {
  return (
    <View style={[styles.ringSlot, compact && compactStyles.ringSlot]}>
      <View style={[styles.hole, dark ? styles.holeDark : styles.holeLight, compact && compactStyles.hole]} />
      <View style={[styles.ring, compact && compactStyles.ring]} />
    </View>
  );
}

// Lomo del libro: franja de papel entre las dos páginas con la hilera de aros. Se dibuja por
// encima de las páginas y de la hoja que gira, que pivota justo sobre él.
export default function BookSpine({ height, colorScheme, scrollY, compact = false, ringPitch }: BookSpineProps) {
  const dark = colorScheme === "dark";
  const pitch = ringPitch ?? (compact ? COMPACT_RING_PITCH : RING_PITCH);
  const ringCount = Math.ceil(height / pitch) + 1;

  // El patrón se repite cada RING_PITCH, así que basta desplazarlo el resto del scroll
  const ringsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -positiveModulo(scrollY.value, pitch) }],
  }));

  return (
    <View pointerEvents="none" style={[styles.spine, compact && compactStyles.spine]}>
      <View style={[styles.strip, dark ? styles.stripDark : styles.stripLight, compact && compactStyles.strip]}>
        <View style={[styles.crease, dark ? styles.creaseDark : styles.creaseLight]} />
      </View>
      <Animated.View
        style={[styles.rings, compact && compactStyles.rings, { height: ringCount * pitch }, ringsStyle]}
      >
        {Array.from({ length: ringCount }, (_, index) => (
          <View key={`ring-${index}`} style={[styles.ringCell, { height: pitch }]}>
            <Ring dark={dark} compact={compact} />
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

// En compacto el lomo deja de ser absoluto y centrado: es una columna estrecha entre las dos páginas
const compactStyles = StyleSheet.create({
  spine: { position: "relative", left: 0, marginLeft: 0, width: COMPACT_SPINE_WIDTH, alignSelf: "stretch", overflow: "visible" },
  strip: { width: COMPACT_SPINE_WIDTH },
  rings: { width: COMPACT_RING_WIDTH, left: -(COMPACT_RING_WIDTH - COMPACT_SPINE_WIDTH) / 2 },
  ringSlot: { width: COMPACT_RING_WIDTH, height: COMPACT_RING_HEIGHT + 4 },
  hole: { width: COMPACT_RING_WIDTH - 6, height: COMPACT_RING_HEIGHT - 3, borderRadius: (COMPACT_RING_HEIGHT - 3) / 2 },
  ring: { width: COMPACT_RING_WIDTH, height: COMPACT_RING_HEIGHT, borderRadius: COMPACT_RING_HEIGHT / 2, borderWidth: 1.5 },
});
