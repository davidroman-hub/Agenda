import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import useAgendaTasksStore, { AgendaTask } from '../../stores/agenda-tasks-store';

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
    
    // Get tasks for today from the store
    const { tasksByDate } = useAgendaTasksStore.getState();
    const dayTasks = tasksByDate[dateString] || {};
    
    // Convert DayTasks object to array of tasks
    const todayTasksArray: AgendaTask[] = Object.values(dayTasks).filter((task): task is AgendaTask => task !== null);
    
    const completedTasks = todayTasksArray.filter((task: AgendaTask) => task.completed).length;
    const pendingTasks = todayTasksArray.length - completedTasks;

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
