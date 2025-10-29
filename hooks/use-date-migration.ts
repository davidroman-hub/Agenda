import { mmkvStorage } from "@/lib/mmkv";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import { useEffect } from "react";

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
        const migrationCompleted = await mmkvStorage.getItem(
          "date_migration_completed"
        );

        if (migrationCompleted === null) {
          // Ejecutar migración
          migrateTaskDates();

          // Marcar migración como completada
          await mmkvStorage.setItem("date_migration_completed", "true");
        } else {
        }
      } catch (error) {}
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
    // Remover flag de migración completada
    await mmkvStorage.removeItem("date_migration_completed");

    // Ejecutar migración
    migrateTaskDates();

    // Marcar como completada nuevamente
    await mmkvStorage.setItem("date_migration_completed", "true");
  };

  return { forceMigration };
};
