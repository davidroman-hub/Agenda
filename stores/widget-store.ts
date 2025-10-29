import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules } from "react-native";

const { WidgetDataManager } = NativeModules;

export interface WidgetTask {
  text: string;
  completed: boolean;
}

export interface WidgetData {
  tasks: string[]; // Array de strings de tareas pendientes (máximo 3)
  totalTasks: number; // Total de tareas del día
  completedTasks: number; // Tareas completadas
  date: string; // Fecha en formato YYYY-MM-DD
  timestamp: number; // Timestamp de la última actualización
}

// Store específica para el widget - datos simples y directos
class WidgetStore {
  private static readonly WIDGET_KEY = "widget-simple-data";
  private static readonly WIDGET_KEY_ALT = "agenda-widget-tasks"; // Clave alternativa que el widget busca

  // Escribir datos directamente a AsyncStorage de forma sincronizada
  static async updateWidgetData(data: WidgetData): Promise<void> {
    try {
      const dataString = JSON.stringify(data);

      // Guardar en múltiples claves para que el widget las encuentre
      await AsyncStorage.setItem(this.WIDGET_KEY, dataString);
      await AsyncStorage.setItem(this.WIDGET_KEY_ALT, dataString);
      await AsyncStorage.setItem("widget-data", dataString);
      await AsyncStorage.setItem("widget_current_tasks", dataString);

      // NUEVO: También guardar usando el módulo nativo que escribe directamente en SharedPreferences
      if (WidgetDataManager) {
        try {
          await WidgetDataManager.saveWidgetData(this.WIDGET_KEY, dataString);
          await WidgetDataManager.saveWidgetData(
            this.WIDGET_KEY_ALT,
            dataString
          );
          await WidgetDataManager.saveWidgetData("widget-data", dataString);
          await WidgetDataManager.saveWidgetData(
            "widget_current_tasks",
            dataString
          );
        } catch (nativeError) {
          console.error(
            "❌ WIDGET STORE: Error con módulo nativo:",
            nativeError
          );
        }
      } else {
      }

      // IMPORTANTE: Forzar actualización inmediata del widget después de guardar
      setTimeout(async () => {
        await this.forceWidgetUpdate();
      }, 200); // Delay más corto para respuesta más rápida
    } catch (error) {
      console.error("❌ WIDGET STORE: Error guardando datos:", error);
    }
  }

  // Leer datos del widget (para debugging)
  static async getWidgetData(): Promise<WidgetData | null> {
    try {
      const dataString = await AsyncStorage.getItem(this.WIDGET_KEY);
      if (dataString) {
        return JSON.parse(dataString);
      }
      return null;
    } catch (error) {
      console.error("❌ WIDGET STORE: Error leyendo datos:", error);
      return null;
    }
  }

  // Crear datos estáticos de prueba
  static async createStaticTestData(): Promise<void> {
    const staticData: WidgetData = {
      tasks: [], // Sin tareas pendientes (datos estáticos)
      totalTasks: 0, // Sin tareas totales
      completedTasks: 0, // Sin tareas completadas
      date: new Date().toISOString().split("T")[0], // Fecha actual
      timestamp: Date.now(),
    };

    await this.updateWidgetData(staticData);
  }

  // Función de debugging para listar todas las claves
  static async debugListAllKeys(): Promise<void> {
    try {
      if (WidgetDataManager) {
        await WidgetDataManager.getAllKeys();
      } else {
      }
    } catch (error) {
      console.error("❌ WIDGET STORE: Error en debugging:", error);
    }
  }

  // Forzar actualización del widget
  static async forceWidgetUpdate(): Promise<void> {
    try {
      // Método 1: Usar el módulo nativo si está disponible
      if (WidgetDataManager?.forceWidgetUpdate) {
        await WidgetDataManager.forceWidgetUpdate();
      } else {
        console.log("❌ WIDGET STORE: Módulo nativo no disponible");
      }

      // Método 2: Guardar timestamp especial para activar actualizaciones
      await AsyncStorage.setItem("widget_last_update", Date.now().toString());
      await AsyncStorage.setItem("widget_force_refresh", "true");
    } catch (error) {
      console.error("❌ WIDGET STORE: Error forzando actualización:", error);
    }
  }
}

export default WidgetStore;
