import { moveInOrder } from "@/utils/notes";
import { dragScrollSpeed, dropTargetId, type Point, type Rect } from "@/utils/notes-drag";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type View,
} from "react-native";

const AUTO_SCROLL_INTERVAL_MS = 16;

export interface NoteDrag {
  /** La nota que se está arrastrando, y la sobre la que está el dedo (donde caería al soltar) */
  readonly dragId: string | null;
  readonly targetId: string | null;
  /** Cuánto se ha movido la nota arrastrada (con el desplazamiento del tablero incluido) */
  readonly translate: Animated.ValueXY;
  /** Cada tarjeta da su vista para poder medirla al empezar a arrastrar */
  readonly setNode: (id: string, node: View | null) => void;
  readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** `finger` es dónde está el dedo en pantalla cuando se coge la nota */
  readonly begin: (id: string, finger: Point) => void;
  readonly move: (finger: Point, translation: Point) => void;
  /** Suelta: con `commit` la nota se coloca donde está el dedo; sin él, se cancela y todo queda como estaba */
  readonly end: (commit: boolean) => void;
}

interface Options {
  /** Los ids de las notas en el orden en que se ven ahora */
  readonly ids: readonly string[];
  readonly scrollRef: React.RefObject<ScrollView | null>;
  /** Recibe la lista de ids ya con la nota en su sitio nuevo */
  readonly onReorder: (orderedIds: string[]) => void;
}

const measure = (node: View | null | undefined) =>
  new Promise<Rect | null>((resolve) => {
    if (typeof node?.measureInWindow !== "function") {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });

/**
 * El arrastre de notas del tablero: qué nota se lleva, sobre cuál está el dedo, el desplazamiento
 * automático al llegar al borde y, al soltar, el nuevo orden. Solo lleva la cuenta; los gestos los
 * lanza DraggableNote y lo que se guarda lo decide `onReorder`.
 *
 * Las posiciones se miden en coordenadas de pantalla al empezar (`measureInWindow`), así el dedo
 * (que también viene en pantalla) se compara directamente con las notas, esté donde esté el tablero.
 */
export function useNoteDrag({ ids, scrollRef, onReorder }: Options): NoteDrag {
  const [dragId, setDragId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const translate = useRef(new Animated.ValueXY()).current;

  // Lo que cambia con cada render se lee siempre de aquí, no del cierre del momento en que empezó el arrastre
  const latest = useRef({ ids, onReorder });
  useEffect(() => {
    latest.current = { ids, onReorder };
  });

  const api = useMemo(() => {
    const nodes = new Map<string, View>();
    let rects = new Map<string, Rect>();
    let active: string | null = null;
    let ready = false;
    let target: string | null = null;
    let scrollY = 0;
    let startScrollY = 0;
    let measuredScrollY = 0;
    let viewport: { top: number; bottom: number } | null = null;
    let finger: Point = { x: 0, y: 0 };
    let translation: Point = { x: 0, y: 0 };
    let timer: ReturnType<typeof setInterval> | null = null;

    const applyTranslation = () =>
      translate.setValue({ x: translation.x, y: translation.y + scrollY - startScrollY });

    const refreshTarget = () => {
      if (active === null || !ready) return;
      const next = dropTargetId(rects, active, finger, scrollY - measuredScrollY);
      if (next !== target) {
        target = next;
        setTargetId(next);
      }
    };

    // Cerca del borde, el tablero se desplaza solo para poder llegar a las notas de más arriba o de más abajo
    const tick = () => {
      if (active === null || viewport === null) return;
      const speed = dragScrollSpeed(finger.y, viewport.top, viewport.bottom);
      const next = Math.max(0, scrollY + speed);
      if (speed === 0 || next === scrollY) return;

      scrollY = next;
      scrollRef.current?.scrollTo({ y: next, animated: false });
      applyTranslation();
      refreshTarget();
    };

    const stopTimer = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };

    return {
      setNode: (id: string, node: View | null) => {
        if (node) nodes.set(id, node);
        else nodes.delete(id);
      },

      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY = event.nativeEvent.contentOffset.y;
        if (active !== null) {
          applyTranslation();
          refreshTarget();
        }
      },

      begin: (id: string, start: Point) => {
        active = id;
        ready = false;
        target = null;
        finger = start;
        startScrollY = scrollY;
        translation = { x: 0, y: 0 };
        translate.setValue({ x: 0, y: 0 });
        setDragId(id);
        setTargetId(null);
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        } catch {
          // Sin vibración también funciona
        }

        stopTimer();
        timer = setInterval(tick, AUTO_SCROLL_INTERVAL_MS);

        const entries = [...nodes].map(async ([noteId, node]) => [noteId, await measure(node)] as const);
        void Promise.all([measure(scrollRef.current as unknown as View | null), Promise.all(entries)]).then(
          ([view, measured]) => {
            // Si ya se soltó (o se empezó con otra nota) mientras se medía, estas medidas no valen
            if (active !== id) return;

            viewport = view ? { top: view.y, bottom: view.y + view.height } : null;
            rects = new Map(measured.flatMap(([noteId, rect]) => (rect ? [[noteId, rect] as const] : [])));
            measuredScrollY = scrollY;
            ready = true;
            refreshTarget();
          }
        );
      },

      move: (nextFinger: Point, nextTranslation: Point) => {
        if (active === null) return;
        finger = nextFinger;
        translation = nextTranslation;
        applyTranslation();
        refreshTarget();
      },

      end: (commit: boolean) => {
        const id = active;
        if (id === null) return;

        const to = target;
        active = null;
        ready = false;
        target = null;
        stopTimer();
        translate.setValue({ x: 0, y: 0 });
        setDragId(null);
        setTargetId(null);

        if (!commit || to === null) return;
        const { ids: current, onReorder: reorder } = latest.current;
        const next = moveInOrder(current, id, current.indexOf(to));
        if (next.every((value, index) => value === current[index])) return;

        try {
          // Las demás notas se recolocan con una animación en vez de saltar
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch {
          // Sin animación también funciona
        }
        reorder(next);
      },

      dispose: stopTimer,
    };
  }, [scrollRef, translate]);

  useEffect(() => api.dispose, [api]);

  return useMemo(
    () => ({
      dragId,
      targetId,
      translate,
      setNode: api.setNode,
      onScroll: api.onScroll,
      begin: api.begin,
      move: api.move,
      end: api.end,
    }),
    [api, dragId, targetId, translate]
  );
}
