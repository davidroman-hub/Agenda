import { AgendaTask, DayTasks } from "@/stores/agenda-tasks-store";
import { FilteredTask, FilterStats } from "./usePastTasksFilters";

// Función auxiliar para procesar tareas de una fecha
export const processTasksForDate = (dayTasks: DayTasks) => {
  const tasksForDate: { lineNumber: number; task: AgendaTask }[] = [];
  
  for (const [lineNumber, task] of Object.entries(dayTasks)) {
    if (task) {
      tasksForDate.push({
        lineNumber: Number.parseInt(lineNumber, 10),
        task,
      });
    }
  }
  
  tasksForDate.sort((a, b) => a.lineNumber - b.lineNumber);
  return tasksForDate;
};

// Función para obtener tareas pasadas filtradas
export const getFilteredPastTasks = (
  tasksByDate: Record<string, DayTasks>,
  dateMatchesFilters: (date: Date) => boolean
): FilteredTask[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const pastTasksData: FilteredTask[] = [];

  for (const [date, dayTasks] of Object.entries(tasksByDate)) {
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    // Solo incluir fechas anteriores a hoy que cumplan con los filtros
    if (taskDate < today && dateMatchesFilters(taskDate)) {
      const tasksForDate = processTasksForDate(dayTasks);
      
      if (tasksForDate.length > 0) {
        pastTasksData.push({
          date,
          tasks: tasksForDate,
        });
      }
    }
  }

  pastTasksData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return pastTasksData;
};

// Función para calcular estadísticas de tareas filtradas
export const calculateFilterStats = (filteredTasks: FilteredTask[]): FilterStats => {
  let totalTasks = 0;
  let completedTasks = 0;
  
  for (const { tasks } of filteredTasks) {
    for (const { task } of tasks) {
      totalTasks++;
      if (task.completed) {
        completedTasks++;
      }
    }
  }
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  return {
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    completionRate,
  };
};

// Función para calcular total de tareas sin filtros
export const calculateTotalTasksAllTime = (tasksByDate: Record<string, DayTasks>): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let total = 0;
  for (const [date, dayTasks] of Object.entries(tasksByDate)) {
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    if (taskDate < today) {
      for (const task of Object.values(dayTasks)) {
        if (task) total++;
      }
    }
  }
  return total;
};
