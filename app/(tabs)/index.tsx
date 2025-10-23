import { Button, StyleSheet } from "react-native";

import Book from "@/components/agendaComponents/book";
import ProtectedRoute from "@/components/protected-route";
import useCounterStore from "@/stores/counter-store";
import useLoginStore from "@/stores/login-store";

export default function HomeScreen() {
  const { count, increment, decrement, reset } = useCounterStore();
  const { isLoggedIn, userValues, logout } = useLoginStore();

  return (
    <ProtectedRoute>
      <Book />
      <Button title="Logout" onPress={logout} />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bigHelloText: {
    fontSize: 48,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
