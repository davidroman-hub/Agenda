import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import WidgetService, { WidgetData } from '../services/widgets/widget-service';
import useAgendaTasksStore from '../stores/agenda-tasks-store';
import useRepeatingTasksStore from '../stores/repeating-tasks-store';

interface UseWidgetReturn {
  widgetData: WidgetData | null;
  isWidgetSupported: boolean;
  updateWidget: () => Promise<boolean>;
  isUpdating: boolean;
}

export const useWidget = (): UseWidgetReturn => {
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWidgetSupported, setIsWidgetSupported] = useState(false);

  // Subscribe to tasks store to update widget when tasks change
  const tasksByDate = useAgendaTasksStore((state) => state.tasksByDate);
  
  // Subscribe to repeating tasks store to update widget when patterns or completions change
  const repeatingPatterns = useRepeatingTasksStore((state) => state.repeatingPatterns);
  const repeatingCompletions = useRepeatingTasksStore((state) => state.repeatingTaskCompletions);

  const updateWidgetData = useCallback(() => {
    try {
      const data = WidgetService.getCurrentDayData();
      setWidgetData(data);
    } catch (error) {
      console.error('Error getting widget data:', error);
      setWidgetData(null);
    }
  }, []);

  const updateWidget = useCallback(async (): Promise<boolean> => {
    if (!isWidgetSupported) {
      return false;
    }

    setIsUpdating(true);
    try {
      const success = await WidgetService.updateWidget();
      if (success) {
        updateWidgetData();
      }
      return success;
    } catch (error) {
      console.error('Error updating widget:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [isWidgetSupported, updateWidgetData]);

  useEffect(() => {
    // Check if widget is supported
    setIsWidgetSupported(WidgetService.isWidgetSupported());
    
    // Initial widget data load
    updateWidgetData();
  }, [updateWidgetData]);

  useEffect(() => {
    // Update widget data when tasks change
    updateWidgetData();
  }, [tasksByDate, repeatingPatterns, repeatingCompletions, updateWidgetData]);

  useEffect(() => {
    // Update widget when app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background, update widget
        updateWidget();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [updateWidget]);

  return {
    widgetData,
    isWidgetSupported,
    updateWidget,
    isUpdating
  };
};

export default useWidget;
