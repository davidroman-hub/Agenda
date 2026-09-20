import { forceLandscape, restoreOrientation } from "@/services/screen-orientation";
import useAgendaSectionStore from "@/stores/agenda-section-store";
import { isLandscapeForced } from "@/utils/agenda-strip";
import { useEffect } from "react";

/**
 * Mientras deba verse el año en horizontal (ver isLandscapeForced) la pantalla se fuerza; en cuanto
 * deja de ser así (se vuelve al libro, se va a las notas o se pulsa "Vertical") vuelve a como estaba.
 * Devuelve si ahora mismo está forzada.
 */
export function useForcedOrientation(): boolean {
  const forced = useAgendaSectionStore(isLandscapeForced);

  useEffect(() => {
    if (!forced) {
      void restoreOrientation();
      return;
    }

    let cancelled = false;
    void forceLandscape().then((ok) => {
      // Si el sistema no deja, se apaga lo pedido para que el botón no diga "Vertical" sin estarlo
      if (!ok && !cancelled) useAgendaSectionStore.getState().setLandscapeYear(false);
    });
    return () => {
      cancelled = true;
    };
  }, [forced]);

  // Si el libro se desmonta, la pantalla no se puede quedar tumbada
  useEffect(
    () => () => {
      void restoreOrientation();
    },
    []
  );

  return forced;
}
