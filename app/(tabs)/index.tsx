
import Book from "@/components/agendaComponents/book";
import ProtectedRoute from "@/components/protected-route";

export default function HomeScreen() {
  return (
    <ProtectedRoute>
      <Book />
    </ProtectedRoute>
  );
}
