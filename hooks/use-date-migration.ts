import { mmkvStorage } from '@/lib/mmkv';
import useAgendaTasksStore from '@/stores/agenda-tasks-store';
import { useEffect } from 'react';

/**
 * Hook que ejecuta la migración de fechas automáticamente al cargar la app
 * Solo se ejecuta una vez por instalación
 */
export const useDateMigration = () => {
  const { migrateTaskDates } = useAgendaTasksStore();

  useEffect(() => {
    const runMigration = async () => {
      try {
        // Verificar si ya se ejecutó la migración
        const migrationCompleted = await mmkvStorage.getItem('date_migration_completed');
        
        if (migrationCompleted === null) {
          console.log('🔄 Ejecutando migración de fechas por primera vez...');
          
          // Ejecutar migración
          migrateTaskDates();
          
          // Marcar migración como completada
          await mmkvStorage.setItem('date_migration_completed', 'true');
          
          console.log('✅ Migración de fechas completada y marcada');
        } else {
          console.log('✅ Migración de fechas ya completada anteriormente');
        }
      } catch (error) {
        console.error('❌ Error durante la migración de fechas:', error);
      }
    };

    // Ejecutar migración con un pequeño delay para asegurar que los stores estén listos
    const timeoutId = setTimeout(runMigration, 1000);

    return () => clearTimeout(timeoutId);
  }, [migrateTaskDates]);
};

/**
 * Hook para forzar migración manual (útil para debugging)
 */
export const useForceDateMigration = () => {
  const { migrateTaskDates } = useAgendaTasksStore();

  const forceMigration = async () => {
    console.log('🔄 Forzando migración manual de fechas...');
    
    // Remover flag de migración completada
    await mmkvStorage.removeItem('date_migration_completed');
    
    // Ejecutar migración
    migrateTaskDates();
    
    // Marcar como completada nuevamente
    await mmkvStorage.setItem('date_migration_completed', 'true');
    
    console.log('✅ Migración manual completada');
  };

  return { forceMigration };
};
