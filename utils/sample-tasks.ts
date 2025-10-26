import useAgendaTasksStore from "@/stores/agenda-tasks-store";

// Función para crear tareas de prueba en fechas pasadas
export const createSamplePastTasks = async () => {
  const { addTask } = useAgendaTasksStore.getState();
  
  // Fechas de ejemplo (días anteriores)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // Formato YYYY-MM-DD
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  try {
    // Tareas de ayer
    await addTask(formatDate(yesterday), 1, "Revisar emails importantes", null);
    await addTask(formatDate(yesterday), 2, "Llamar al cliente ABC", null);
    await addTask(formatDate(yesterday), 3, "Preparar presentación", null);
    
    // Tareas de hace 2 días
    await addTask(formatDate(twoDaysAgo), 1, "Comprar víveres", null);
    await addTask(formatDate(twoDaysAgo), 2, "Hacer ejercicio", null);
    
    // Tareas de hace 3 días
    await addTask(formatDate(threeDaysAgo), 1, "Reunión de equipo", null);
    await addTask(formatDate(threeDaysAgo), 2, "Revisar documentos", null);
    await addTask(formatDate(threeDaysAgo), 3, "Enviar reporte semanal", null);
    
    // Tareas de hace una semana
    await addTask(formatDate(oneWeekAgo), 1, "Planificar proyecto Q1", null);
    await addTask(formatDate(oneWeekAgo), 2, "Actualizar CV", null);
    
    // Marcar algunas como completadas para mostrar estadísticas realistas
    const { toggleTaskCompletion } = useAgendaTasksStore.getState();
    
    // Completar algunas tareas
    toggleTaskCompletion(formatDate(yesterday), 1); // Revisar emails - completada
    toggleTaskCompletion(formatDate(yesterday), 3); // Preparar presentación - completada
    toggleTaskCompletion(formatDate(twoDaysAgo), 2); // Hacer ejercicio - completada
    toggleTaskCompletion(formatDate(threeDaysAgo), 1); // Reunión de equipo - completada
    toggleTaskCompletion(formatDate(threeDaysAgo), 3); // Enviar reporte - completada
    toggleTaskCompletion(formatDate(oneWeekAgo), 1); // Planificar proyecto - completada
    
    console.log("✅ Tareas de prueba creadas exitosamente");
  } catch (error) {
    console.error("❌ Error creando tareas de prueba:", error);
  }
};

// Función para limpiar todas las tareas (útil para testing)
export const clearAllTasks = () => {
  const { tasksByDate } = useAgendaTasksStore.getState();
  const { deleteTask } = useAgendaTasksStore.getState();
  
  // Eliminar todas las tareas
  for (const [date, dayTasks] of Object.entries(tasksByDate)) {
    for (const lineNumber of Object.keys(dayTasks)) {
      deleteTask(date, Number.parseInt(lineNumber, 10));
    }
  }
  
  console.log("🗑️ Todas las tareas han sido eliminadas");
};
