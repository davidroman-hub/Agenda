import { NativeModules, Platform } from "react-native";
import type { WidgetPayload } from "../utils/widget-data";

// Módulo nativo de Android (android/.../WidgetDataManagerModule.kt): guarda el resumen de los próximos
// días y las notas en SharedPreferences y repinta el widget. En iOS y en web no existe.
class WidgetStore {
  // Debe coincidir con AgendaWidgetProvider.DATA_KEY
  private static readonly WIDGET_KEY = "widget-data-v3";

  // Lo último que se guardó con éxito: la sincronización se llama a menudo y casi siempre no hay cambios
  private static lastSent: string | null = null;

  // Guarda los datos y refresca el widget al instante
  static async updateWidgetData(payload: WidgetPayload): Promise<void> {
    const native = NativeModules.WidgetDataManager;
    if (Platform.OS !== "android" || !native) return;

    const json = JSON.stringify(payload);
    if (json === this.lastSent) return;

    try {
      await native.saveWidgetData(this.WIDGET_KEY, json);
      await native.forceWidgetUpdate();
      this.lastSent = json;
    } catch (error) {
      console.error("❌ WIDGET STORE: Error guardando datos:", error);
    }
  }
}

export default WidgetStore;
