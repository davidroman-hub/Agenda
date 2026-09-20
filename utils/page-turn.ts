/**
 * Matemática del giro de hoja del libro. La hoja gira alrededor del lomo (los aros): empieza
 * tumbada sobre la página derecha (cara delantera hacia nosotros) y acaba tumbada sobre la
 * izquierda (cara trasera hacia nosotros). Son funciones puras y "worklet" porque las usa la
 * animación, que corre en el hilo de UI.
 */

export type TurnDirection = "next" | "prev";

/** Un giro de hoja en curso: de qué página a cuál, y cuánto estaba desplazado el scroll. */
export interface PageTurnState {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  readonly direction: TurnDirection;
  /** Scroll vertical del libro al empezar: las copias de las páginas se dibujan igual de desplazadas. */
  readonly scrollOffset: number;
}

/** Lo que se ha girado la hoja: 0 = sobre la página derecha, 1 = sobre la izquierda. */
export function getLeafFlip(progress: number, direction: TurnDirection): number {
  "worklet";
  // Ir hacia atrás es el mismo giro visto al revés: la hoja vuelve de izquierda a derecha
  return direction === "next" ? progress : 1 - progress;
}

/** Ángulo (grados) de la cara delantera: de 0 a -180, así el borde libre viene hacia el usuario. */
export function getFrontAngle(flip: number): number {
  "worklet";
  return -180 * flip;
}

/** Ángulo (grados) de la cara trasera: de 180 a 0. */
export function getBackAngle(flip: number): number {
  "worklet";
  return 180 * (1 - flip);
}

/** La cara delantera se ve hasta que la hoja pasa por la vertical; después, la trasera. */
export function isFrontFacing(flip: number): boolean {
  "worklet";
  return flip < 0.5;
}

/** Sombra sobre la hoja: nula con la hoja plana, máxima cuando está de canto. */
export function getLeafShade(flip: number, max: number): number {
  "worklet";
  return max * Math.sin(Math.PI * flip);
}

/** Resto positivo (también con scroll negativo, como el rebote de iOS). */
export function positiveModulo(value: number, modulus: number): number {
  "worklet";
  return ((value % modulus) + modulus) % modulus;
}
