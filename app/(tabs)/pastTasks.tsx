import PastTasks from "@/components/agendaComponents/pastTasks/pastTask";
import ProtectedRoute from "@/components/protected-route";

export default function PastTasksTab() {
  return (
    <ProtectedRoute>
      <PastTasks />
    </ProtectedRoute>
  );
}
    