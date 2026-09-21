import { notePin, noteRotation } from "@/utils/notes";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

const PAPER_SHADE = require("@/assets/images/notes/paper-shade.png");

// Los post-it se ven algo más torcidos de lo que dice noteRotation (que también usa el widget)
const TILT = 1.5;
const PIN_SIZE = 20;
const PIN_BOX = 26;

interface PostItProps {
  // Color del papel
  readonly color: string;
  // De aquí salen la inclinación y la chincheta: la misma semilla, siempre el mismo post-it
  readonly seed: string;
  // Alto mínimo: así las notas cortas también son cuadradas
  readonly minHeight?: number;
  readonly children: React.ReactNode;
}

// Un post-it clavado con una chincheta: papel con su sombreado, sombra debajo e inclinación pequeña
export default function PostIt({ color, seed, minHeight, children }: PostItProps) {
  const pin = notePin(seed);

  return (
    <View style={{ transform: [{ rotate: `${noteRotation(seed) * TILT}deg` }] }}>
      {/* La sombra son varias capas, cada vez más anchas y suaves, y una asoma algo torcida por abajo */}
      <View style={[styles.shadow, styles.shadowFar]} />
      <View style={[styles.shadow, styles.shadowLifted]} />
      <View style={[styles.shadow, styles.shadowNear]} />

      <View style={[styles.paper, { backgroundColor: color, minHeight }]}>
        <View style={StyleSheet.absoluteFill}>
          <Image source={PAPER_SHADE} style={styles.fill} resizeMode="stretch" />
        </View>
        {children}
      </View>

      <View style={[styles.pin, { marginLeft: pin.offset - PIN_BOX / 2 }]}>
        <View style={styles.pinShadow} />
        <View style={[styles.pinFoot, { backgroundColor: pin.dark }]} />
        <View style={[styles.pinHead, { backgroundColor: pin.head }]}>
          <View style={styles.pinGloss} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    borderRadius: 2,
    overflow: "hidden",
    // Espacio para la chincheta arriba
    paddingTop: 34,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  // Con solo absoluteFill, en Android la imagen se pinta a su tamaño y no rellena el papel
  fill: {
    width: "100%",
    height: "100%",
  },
  shadow: {
    position: "absolute",
    backgroundColor: "#000",
  },
  shadowFar: {
    top: 4,
    left: -4,
    right: -4,
    bottom: -10,
    borderRadius: 8,
    opacity: 0.07,
  },
  shadowLifted: {
    top: 6,
    left: -3,
    right: 3,
    bottom: -7,
    borderRadius: 4,
    opacity: 0.16,
    transform: [{ rotate: "-1.4deg" }],
  },
  shadowNear: {
    top: 2,
    left: -1,
    right: -1,
    bottom: -3,
    borderRadius: 3,
    opacity: 0.22,
  },
  pin: {
    position: "absolute",
    top: 7,
    left: "50%",
    width: PIN_BOX,
    height: PIN_BOX,
  },
  pinShadow: {
    position: "absolute",
    top: 12,
    left: 9,
    width: 19,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.3)",
    transform: [{ rotate: "38deg" }],
  },
  // Un círculo más oscuro, algo corrido hacia abajo: asoma como el volumen de la cabeza
  pinFoot: {
    position: "absolute",
    top: 3,
    left: 3,
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
  },
  pinHead: {
    position: "absolute",
    top: 1,
    left: 1,
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  pinGloss: {
    position: "absolute",
    top: 3,
    left: 4,
    width: 7,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.75)",
    transform: [{ rotate: "-35deg" }],
  },
});
