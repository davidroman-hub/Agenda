import { Alert, Linking, Platform } from "react-native";
import useExactAlarmStore from "../stores/exact-alarm-store";

type Translate = (key: string, options?: any) => string;

// Android 12 (API 31) creó el permiso de alarmas exactas y Android 14 (API 34) dejó de
// concederlo por defecto en las instalaciones nuevas. Sin él, Android retrasa las alarmas
// (expo-notifications usa una alarma inexacta si no está concedido).
const API_WITH_EXACT_ALARM_SETTING = 31;
const API_WITHOUT_DEFAULT_GRANT = 34;

const EXACT_ALARM_SETTINGS_ACTION = "android.settings.REQUEST_SCHEDULE_EXACT_ALARM";

const androidApiLevel = () =>
  Platform.OS === "android" ? Number(Platform.Version) : 0;

/** ¿Existe en este dispositivo la pantalla de ajustes de alarmas exactas? (Android 12 o superior) */
export const exactAlarmSettingsAvailable = () =>
  androidApiLevel() >= API_WITH_EXACT_ALARM_SETTING;

/**
 * ¿Toca explicarle al usuario que active las alarmas exactas? Solo en Android 14 o superior,
 * donde no vienen concedidas, y una única vez. La app no puede saber si ya están concedidas
 * (no hay forma de comprobarlo desde JavaScript), así que no se insiste.
 */
export const shouldPromptForExactAlarms = () =>
  androidApiLevel() >= API_WITHOUT_DEFAULT_GRANT &&
  !useExactAlarmStore.getState().promptShown;

/** Abre los ajustes de Android para permitir alarmas exactas (o los de la app si no se puede) */
export async function openExactAlarmSettings(): Promise<void> {
  try {
    await Linking.sendIntent(EXACT_ALARM_SETTINGS_ACTION);
  } catch {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("No se pudieron abrir los ajustes de alarmas exactas:", error);
    }
  }
}

/**
 * Explica una sola vez, y solo si hace falta, por qué conviene activar las alarmas exactas y
 * ofrece abrir los ajustes. Devuelve true si mostró el aviso.
 */
export function promptForExactAlarmsOnce(tCommon: Translate): boolean {
  if (!shouldPromptForExactAlarms()) return false;

  useExactAlarmStore.getState().markPromptShown();

  Alert.alert(
    tCommon("exactAlarms.title"),
    tCommon("exactAlarms.message"),
    [
      { text: tCommon("exactAlarms.notNow"), style: "cancel" },
      {
        text: tCommon("exactAlarms.openSettings"),
        onPress: () => {
          void openExactAlarmSettings();
        },
      },
    ],
    { cancelable: true }
  );
  return true;
}
