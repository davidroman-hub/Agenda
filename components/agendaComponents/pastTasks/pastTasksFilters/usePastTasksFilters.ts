import useAgendaTasksStore, { AgendaTask } from "@/stores/agenda-tasks-store";
import { useCallback, useMemo, useState } from "react";

export type TaskStatusFilter = 'all' | 'completed' | 'pending';

export interface FilteredTask {
  date: string;
  tasks: { lineNumber: number; task: AgendaTask }[];
}

export interface FilterStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
}

export const usePastTasksFilters = () => {
  const { tasksByDate } = useAgendaTasksStore();
  
  // Estados para filtros
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');

  // Obtener años disponibles de tareas pasadas
  const availableYears = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const years = new Set<number>();
    
    for (const date of Object.keys(tasksByDate)) {
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate < today) {
        years.add(taskDate.getFullYear());
      }
    }
    
    return Array.from(years).sort((a, b) => b - a); // Ordenar descendente
  }, [tasksByDate]);

  // Obtener meses disponibles para el año seleccionado
  const availableMonths = useMemo(() => {
    if (!selectedYear) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const months = new Set<number>();
    
    for (const date of Object.keys(tasksByDate)) {
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate < today && taskDate.getFullYear() === selectedYear) {
        months.add(taskDate.getMonth());
      }
    }
    
    return Array.from(months).sort((a, b) => b - a); // Ordenar descendente
  }, [tasksByDate, selectedYear]);

  // Función auxiliar para verificar si una fecha cumple con los filtros
  const dateMatchesFilters = useCallback((taskDate: Date) => {
    if (selectedYear && taskDate.getFullYear() !== selectedYear) {
      return false;
    }
    
    if (selectedMonth !== null && taskDate.getMonth() !== selectedMonth) {
      return false;
    }
    
    return true;
  }, [selectedYear, selectedMonth]);

  // Función para resetear filtros
  const resetFilters = useCallback(() => {
    setSelectedYear(null);
    setSelectedMonth(null);
    setStatusFilter('all');
  }, []);

  // Función para resetear solo el filtro de estado
  const resetStatusFilter = useCallback(() => {
    setStatusFilter('all');
  }, []);

  // Verificar si hay filtros activos
  const hasActiveFilters = Boolean(selectedYear || selectedMonth !== null || statusFilter !== 'all');

  return {
    // Estados
    selectedYear,
    selectedMonth,
    statusFilter,
    setSelectedYear,
    setSelectedMonth,
    setStatusFilter,
    
    // Datos computados
    availableYears,
    availableMonths,
    hasActiveFilters,
    
    // Funciones
    dateMatchesFilters,
    resetFilters,
    resetStatusFilter,
  };
};
