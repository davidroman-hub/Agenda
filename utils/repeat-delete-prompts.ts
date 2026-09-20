import { Alert, AlertButton, Platform } from "react-native";
import type { RepeatDeleteScope } from "../services/repeating-occurrence-service";

type Translate = (key: string, options?: any) => string;

/**
 * Pregunta qué borrar al eliminar una ocurrencia de una tarea repetida:
 * solo esta, esta y las siguientes, o toda la serie.
 */
export function promptDeleteRepeatingOccurrence(
  tCommon: Translate,
  onSelect: (scope: RepeatDeleteScope) => void
): void {
  const buttons: AlertButton[] = [
    { text: tCommon("repeatDelete.onlyThis"), onPress: () => onSelect("this") },
    {
      text: tCommon("repeatDelete.thisAndFollowing"),
      onPress: () => onSelect("following"),
    },
    {
      text: tCommon("repeatDelete.allSeries"),
      style: "destructive",
      onPress: () => onSelect("all"),
    },
  ];

  // Android admite 3 botones como máximo: allí se cancela tocando fuera o con "atrás".
  // iOS no tiene esa vía, así que necesita un botón de cancelar explícito.
  if (Platform.OS === "ios") {
    buttons.push({ text: tCommon("buttons.cancel"), style: "cancel" });
  }

  Alert.alert(
    tCommon("repeatDelete.occurrenceTitle"),
    tCommon("repeatDelete.occurrenceMessage"),
    buttons,
    { cancelable: true }
  );
}

/** Confirma el borrado de la tarea original de una serie, que borra la serie entera */
export function promptDeleteRepeatingSeries(
  tCommon: Translate,
  onConfirm: () => void
): void {
  Alert.alert(
    tCommon("repeatDelete.seriesTitle"),
    tCommon("repeatDelete.seriesMessage"),
    [
      { text: tCommon("buttons.cancel"), style: "cancel" },
      {
        text: tCommon("repeatDelete.allSeries"),
        style: "destructive",
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
}
