import { mmkvStorage } from '@/lib/mmkv';
import useAgendaTasksStore from '@/stores/agenda-tasks-store';
import WidgetStore from '@/stores/widget-store';
import { useCallback, useEffect } from 'react';
import { NativeModules } from 'react-native';

console.log('🔍 Todos los NativeModules:', Object.keys(NativeModules));

// Intentar diferentes formas de acceder al módulo
const { WidgetDataManager } = NativeModules;
const widgetModule = NativeModules.WidgetDataManager;

console.log('🔍 WidgetDataManager:', WidgetDataManager);
console.log('🔍 widgetModule:', widgetModule);

// Hook para sincronizar datos del widget
export const useWidgetSync = () => {
  const { tasksByDate } = useAgendaTasksStore();

  // Función para crear datos estáticos de prueba
  const createStaticWidgetData = useCallback(async () => {
    console.log('📱 CREANDO DATOS ESTÁTICOS PARA EL WIDGET...');
    await WidgetStore.createStaticTestData();
    
    // Verificar que se guardaron
    const savedData = await WidgetStore.getWidgetData();
    console.log('📱 Datos guardados verificados:', savedData);
  }, []);

  // Función para sincronizar datos reales desde Zustand store
  const syncRealDataToWidget = useCallback(async (date: string) => {
    try {
      console.log('=== SINCRONIZANDO DATOS REALES A WIDGET STORE ===');
      console.log('Fecha:', date);
      console.log('Datos completos de tasksByDate:', tasksByDate);
      
      const dayTasks = tasksByDate[date] || {};
      console.log('Tareas del día desde Zustand:', dayTasks);
      
      // Crear un array simple de las tareas del día
      const tasksList = [];
      let totalTasks = 0;
      let completedTasks = 0;
      
      for (const [, task] of Object.entries(dayTasks)) {
        if (task?.text) {
          totalTasks++;
          if (task.completed) {
            completedTasks++;
          } else if (tasksList.length < 3) {
            // Solo agregar tareas no completadas al widget (máximo 3)
            tasksList.push(task.text);
          }
        }
      }
      
      // Actualizar Widget Store con datos reales
      await WidgetStore.updateWidgetData({
        tasks: tasksList,
        totalTasks,
        completedTasks,
        date,
        timestamp: Date.now()
      });
      
      // Debugging: listar todas las claves guardadas
      await WidgetStore.debugListAllKeys();
      
      // Forzar actualización del widget
      await WidgetStore.forceWidgetUpdate();
      
      console.log('✅ Widget Store actualizada con datos reales');
      
    } catch (error) {
      console.error('❌ Error sincronizando datos reales:', error);
    }
  }, [tasksByDate]);

  const forceWidgetUpdate = useCallback(async () => {
    try {
      console.log('🔄 Forzando actualización del widget...');
      
      // Crear datos estáticos primero
      await createStaticWidgetData();
      
      // Actualizar timestamp para forzar cambios
      const timestamp = Date.now();
      await mmkvStorage.setItem('widget_force_update', timestamp.toString());
      
      console.log('✅ Widget update forzado con datos estáticos, timestamp:', timestamp);
      
    } catch (error) {
      console.error('❌ Error forzando actualización del widget:', error);
    }
  }, [createStaticWidgetData]);

  const syncTodayWidget = useCallback(async () => {
    // FORZAR fecha 2025-10-25 para testing
    const today = '2025-10-25';  // Hardcoded para debugging
    console.log('🗓️ Sincronizando para FECHA FORZADA:', today);
    
    // Verificar si hay tareas para hoy en Zustand
    const todayTasks = tasksByDate[today] || {};
    console.log('📋 Tareas para fecha forzada encontradas:', Object.keys(todayTasks).length);
    console.log('📋 Tareas completas para fecha forzada:', todayTasks);
    
    if (Object.keys(todayTasks).length > 0) {
      // Si hay datos reales, usarlos
      await syncRealDataToWidget(today);
    } else {
      // Si no hay datos reales, usar datos estáticos
      console.log('📱 No hay tareas reales, usando datos estáticos...');
      await createStaticWidgetData();
    }
  }, [tasksByDate, syncRealDataToWidget, createStaticWidgetData]);

  // Función para forzar sincronización manual (útil para debugging)
  const forceSyncWidget = useCallback(async () => {
    console.log('🔄 Sincronización manual del widget activada');
    await syncTodayWidget();
    await forceWidgetUpdate();
  }, [syncTodayWidget, forceWidgetUpdate]);

  // Sincronizar automáticamente cuando cambien las tareas O al inicio
  useEffect(() => {
    console.log('📱 useWidgetSync: Iniciando sincronización automática...');
    syncTodayWidget();
  }, [tasksByDate, syncTodayWidget]);

  return {
    syncRealDataToWidget,
    syncTodayWidget,
    forceSyncWidget,
    forceWidgetUpdate,
    createStaticWidgetData,
  };
};
