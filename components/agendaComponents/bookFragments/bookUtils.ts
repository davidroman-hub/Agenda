export const calculateDays = (currentPageIndex: number, daysToShow: number): Date[] => {
  const today = new Date();
  const days: Date[] = [];

  // Calcular el offset basado en la página actual y el modo de vista
  const startOffset = currentPageIndex * daysToShow;

  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + startOffset + i);
    days.push(date);
  }

  return days;
};
