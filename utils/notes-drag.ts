/**
 * Las cuentas del arrastre de notas, sin nada de pantalla para poder probarlas enteras: sobre qué nota
 * está el dedo y a qué velocidad hay que desplazar el tablero cuando se llega a su borde.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

const contains = (rect: Rect, point: Point) =>
  point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;

/**
 * La nota sobre la que se suelta: la que contiene el dedo o, si cae entre dos (el hueco entre post-it, la torcedura),
 * la de centro más cercano. null si no hay otras notas o si el dedo sigue sobre el hueco de la propia nota arrastrada
 * (soltarla ahí la deja donde estaba).
 *
 * `rects` son los huecos de las notas en pantalla cuando empezó el arrastre; `scrollDelta` es lo que se ha
 * desplazado el tablero desde entonces (las notas suben esa cantidad).
 */
export function dropTargetId(
  rects: ReadonlyMap<string, Rect>,
  draggedId: string,
  finger: Point,
  scrollDelta = 0
): string | null {
  let nearest: { id: string; distance: number } | null = null;
  let overOwnSlot = false;

  for (const [id, rect] of rects) {
    const moved = { ...rect, y: rect.y - scrollDelta };

    if (id === draggedId) {
      overOwnSlot = contains(moved, finger);
      continue;
    }
    if (contains(moved, finger)) return id;

    const dx = moved.x + moved.width / 2 - finger.x;
    const dy = moved.y + moved.height / 2 - finger.y;
    const distance = dx * dx + dy * dy;
    if (nearest === null || distance < nearest.distance) nearest = { id, distance };
  }

  return overOwnSlot ? null : (nearest?.id ?? null);
}

/**
 * Cuánto (px por paso) hay que desplazar el tablero: negativo hacia arriba, positivo hacia abajo, 0 si el
 * dedo está lejos de los bordes. Crece según se acerca al borde (y más allá de él).
 */
export function dragScrollSpeed(
  fingerY: number,
  viewportTop: number,
  viewportBottom: number,
  edge = 90,
  maxSpeed = 18
): number {
  const intoTop = viewportTop + edge - fingerY;
  if (intoTop > 0) return -Math.min(maxSpeed, Math.max(2, (intoTop / edge) * maxSpeed));

  const intoBottom = fingerY - (viewportBottom - edge);
  if (intoBottom > 0) return Math.min(maxSpeed, Math.max(2, (intoBottom / edge) * maxSpeed));

  return 0;
}
