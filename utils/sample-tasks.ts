import useAgendaTasksStore from "@/stores/agenda-tasks-store";

// Función para crear tareas de prueba en fechas pasadas
export const createSamplePastTasks = async () => {
  const { addTask } = useAgendaTasksStore.getState();
  
  // Fechas de ejemplo (días anteriores en diferentes meses y años)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  // Fechas específicas para testing de filtros
  // Diciembre 2024
  const december2024_1 = new Date('2024-12-15');
  const december2024_2 = new Date('2024-12-20');
  const december2024_3 = new Date('2024-12-25');
  
  // 2023 - diferentes meses
  const march2023 = new Date('2023-03-15');
  const june2023 = new Date('2023-06-10');
  const september2023 = new Date('2023-09-05');
  const november2023 = new Date('2023-11-20');
  
  // Formato YYYY-MM-DD
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  try {
    // Tareas de ayer
    await addTask(formatDate(yesterday), 1, "Revisar emails importantes", null);
    await addTask(formatDate(yesterday), 2, "Llamar al cliente ABC", null);
    
    // Tareas de hace una semana
    await addTask(formatDate(oneWeekAgo), 1, "Reunión de equipo semanal", null);
    await addTask(formatDate(oneWeekAgo), 2, "Preparar informe mensual", null);
    
    // Tareas de hace un mes
    await addTask(formatDate(oneMonthAgo), 1, "Planificar presupuesto Q4", null);
    await addTask(formatDate(oneMonthAgo), 2, "Revisión de rendimiento", null);
    await addTask(formatDate(oneMonthAgo), 3, "Actualizar documentación", null);
    
    // Tareas de hace dos meses
    await addTask(formatDate(twoMonthsAgo), 1, "Conferencia de tecnología", null);
    await addTask(formatDate(twoMonthsAgo), 2, "Entrevistas de candidatos", null);
    
    // Tareas de hace seis meses
    await addTask(formatDate(sixMonthsAgo), 1, "Planificación anual", null);
    await addTask(formatDate(sixMonthsAgo), 2, "Revisión de objetivos", null);
    await addTask(formatDate(sixMonthsAgo), 3, "Formación del equipo", null);
    
    // Tareas de hace un año
    await addTask(formatDate(oneYearAgo), 1, "Proyecto de migración", null);
    await addTask(formatDate(oneYearAgo), 2, "Implementación de CI/CD", null);
    await addTask(formatDate(oneYearAgo), 3, "Auditoría de seguridad", null);
    
    // Tareas de hace dos años
    await addTask(formatDate(twoYearsAgo), 1, "Lanzamiento de aplicación", null);
    await addTask(formatDate(twoYearsAgo), 2, "Investigación de mercado", null);
    
    // ===== TAREAS ESPECÍFICAS PARA TESTING =====
    
    // Diciembre 2024 - 3 tareas
    await addTask(formatDate(december2024_1), 1, "🎄 Preparar fiesta navideña", null);
    await addTask(formatDate(december2024_2), 1, "🎁 Comprar regalos de Navidad", null);
    await addTask(formatDate(december2024_3), 1, "🍾 Celebración de Fin de Año", null);
    
    // 2023 - 4 tareas en 4 meses diferentes
    await addTask(formatDate(march2023), 1, "🌸 Planificación de primavera 2023", null);
    await addTask(formatDate(june2023), 1, "☀️ Vacaciones de verano 2023", null);
    await addTask(formatDate(september2023), 1, "🍂 Inicio de temporada otoño 2023", null);
    await addTask(formatDate(november2023), 1, "🦃 Preparativos Black Friday 2023", null);
    
    // Marcar algunas como completadas para mostrar estadísticas realistas
    const { toggleTaskCompletion } = useAgendaTasksStore.getState();
    
    // Completar algunas tareas de diferentes períodos
    toggleTaskCompletion(formatDate(yesterday), 1);
    toggleTaskCompletion(formatDate(oneWeekAgo), 2);
    toggleTaskCompletion(formatDate(oneMonthAgo), 1);
    toggleTaskCompletion(formatDate(oneMonthAgo), 3);
    toggleTaskCompletion(formatDate(twoMonthsAgo), 2);
    toggleTaskCompletion(formatDate(sixMonthsAgo), 1);
    toggleTaskCompletion(formatDate(sixMonthsAgo), 3);
    toggleTaskCompletion(formatDate(oneYearAgo), 2);
    toggleTaskCompletion(formatDate(twoYearsAgo), 1);
    
    // Completar algunas de las tareas específicas de testing
    toggleTaskCompletion(formatDate(december2024_1), 1); // Fiesta navideña - completada
    toggleTaskCompletion(formatDate(march2023), 1); // Planificación primavera - completada
    toggleTaskCompletion(formatDate(september2023), 1); // Otoño - completada
    
    console.log("✅ Tareas de prueba creadas exitosamente:");
    console.log("📅 Diciembre 2024: 3 tareas (1 completada)");
    console.log("📅 2023: 4 tareas en diferentes meses (2 completadas)");
    console.log("📅 Total con datos de múltiples años y meses");
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
