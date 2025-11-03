import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import useAgendaTasksStore, { AgendaTask } from '../../stores/agenda-tasks-store';
import useRepeatingTasksStore from '../../stores/repeating-tasks-store';

export interface WidgetData {
  currentDate: string;
  dayName: string;
  tasksCount: number;
  completedTasks: number;
  pendingTasks: number;
  todayTasks: {
    id: string;
    text: string;
    completed: boolean;
  }[];
}

class WidgetService {
  private static instance: WidgetService;

  public static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService();
    }
    return WidgetService.instance;
  }

  /**
   * Get current day data for widget display
   */
  public getCurrentDayData(): WidgetData {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    console.log('🔍 Widget Service - Obteniendo datos para:', dateString);
    
    // Get tasks for today from the store
    const { tasksByDate, getAllTasks } = useAgendaTasksStore.getState();
    const dayTasks = tasksByDate[dateString] || {};
    
    console.log('📋 Tareas normales del día:', Object.keys(dayTasks).length);
    
    // Get repeating tasks data
    const { getAllRepeatingPatterns, shouldTaskRepeatOnDate, isRepeatingTaskCompleted } = useRepeatingTasksStore.getState();
    const allPatterns = getAllRepeatingPatterns();
    const allExistingTasks = getAllTasks();
    
    console.log('🔄 Patrones de repetición encontrados:', allPatterns.length);
    console.log('🔄 Patrones activos:', allPatterns.filter(p => p.isActive).length);
    
    // Comenzar con las tareas normales del día
    const normalTasks = { ...dayTasks };
    
    // Crear un mapa de tareas originales y sus fechas de creación
    const originalTasksMap = new Map();
    for (const [dateKey, dayTasks] of Object.entries(allExistingTasks)) {
      for (const [line, task] of Object.entries(dayTasks)) {
        if (task) {
          originalTasksMap.set(task.id, {
            task,
            originalDate: dateKey,
            line: Number.parseInt(line, 10),
          });
        }
      }
    }
    
    // Solo filtrar tareas originales si NO estamos en su día de creación
    const tasksWithActivePatterns = new Set(
      allPatterns
        .filter(pattern => pattern.isActive)
        .map(pattern => pattern.originalTaskId)
    );
    
    for (const [line, task] of Object.entries(normalTasks)) {
      if (task && tasksWithActivePatterns.has(task.id)) {
        const originalInfo = originalTasksMap.get(task.id);
        // Solo filtrar si NO estamos en el día de creación original
        if (originalInfo && originalInfo.originalDate !== dateString) {
          delete normalTasks[Number.parseInt(line, 10)];
        }
      }
    }
    
    // Generar tareas repetidas para hoy (solo si NO es el día original)
    const repeatingTasks: AgendaTask[] = [];
    for (const pattern of allPatterns) {
      if (!pattern.isActive) continue;
      
      if (shouldTaskRepeatOnDate(pattern.originalTaskId, dateString)) {
        const originalInfo = originalTasksMap.get(pattern.originalTaskId);
        
        // Solo agregar como tarea repetida si NO estamos en el día de creación original
        if (originalInfo && originalInfo.originalDate !== dateString) {
          repeatingTasks.push({
            ...originalInfo.task,
            id: `${originalInfo.task.id}-repeat-${dateString}`,
            completed: isRepeatingTaskCompleted(originalInfo.task.id, dateString),
            isRepeatingTask: true,
            repeatingTaskId: originalInfo.task.id,
            repeatingPatternId: pattern.id,
          });
        }
      }
    }
    
    console.log('🔄 Tareas repetidas generadas:', repeatingTasks.length);
    
    // Convertir tareas normales a array
    const normalTasksArray = Object.values(normalTasks).filter((task): task is AgendaTask => task !== null);
    
    console.log('📋 Tareas normales finales:', normalTasksArray.length);
    
    // Combinar tareas normales y repetidas
    const todayTasksArray = [...normalTasksArray, ...repeatingTasks];
    
    console.log('📊 Total de tareas para widget:', todayTasksArray.length);
    
    const completedTasks = todayTasksArray.filter((task: AgendaTask) => task.completed).length;
    const pendingTasks = todayTasksArray.length - completedTasks;

    console.log('✅ Tareas completadas:', completedTasks);
    console.log('⏳ Tareas pendientes:', pendingTasks);

    return {
      currentDate: this.formatDate(today),
      dayName: this.getDayName(today),
      tasksCount: todayTasksArray.length,
      completedTasks,
      pendingTasks,
      todayTasks: todayTasksArray.map((task: AgendaTask) => ({
        id: task.id,
        text: task.text,
        completed: task.completed
      }))
    };
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-ES', options);
  }

  /**
   * Get day name in Spanish
   */
  private getDayName(date: Date): string {
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado'
    ];
    return days[date.getDay()];
  }

  /**
   * Check if widget is supported on current platform
   */
  public isWidgetSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Get device info for widget configuration
   */
  public async getDeviceInfo() {
    return {
      platform: Platform.OS,
      deviceName: Device.deviceName,
      osVersion: Device.osVersion,
      isDevice: Device.isDevice,
      appVersion: Constants.expoConfig?.version || '1.0.0'
    };
  }

  /**
   * Update widget data (for native implementations)
   */
  public async updateWidget(): Promise<boolean> {
    try {
      const widgetData = this.getCurrentDayData();
      
      if (Platform.OS === 'ios') {
        // iOS WidgetKit implementation
        return await this.updateiOSWidget(widgetData);
      } else if (Platform.OS === 'android') {
        // Android App Widget implementation
        return await this.updateAndroidWidget(widgetData);
      }
      
      return false;
    } catch (error) {
      console.error('Error updating widget:', error);
      return false;
    }
  }

  /**
   * iOS Widget implementation
   */
  private async updateiOSWidget(data: WidgetData): Promise<boolean> {
    try {
      // For iOS widgets, we'll need to use native modules or expo-updates
      // This is a placeholder for the actual implementation
      console.log('Updating iOS widget with data:', data);
      
      // Store widget data for native access - implementation pending
      // JSON.stringify(data) will be used with native bridge later
      
      return true;
    } catch (error) {
      console.error('Error updating iOS widget:', error);
      return false;
    }
  }

  /**
   * Android Widget implementation
   */
  private async updateAndroidWidget(data: WidgetData): Promise<boolean> {
    try {
      // For Android widgets, we'll need to use native modules
      // This is a placeholder for the actual implementation
      console.log('Updating Android widget with data:', data);
      
      // Store widget data for native access - implementation pending
      // JSON.stringify(data) will be used with native bridge later
      
      return true;
    } catch (error) {
      console.error('Error updating Android widget:', error);
      return false;
    }
  }

  /**
   * Schedule periodic widget updates
   */
  public scheduleWidgetUpdates(): void {
    // Update widget every hour or when tasks change
    setInterval(async () => {
      await this.updateWidget();
    }, 60 * 60 * 1000); // 1 hour
  }
}

export default WidgetService.getInstance();
