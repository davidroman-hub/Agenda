import useLoginStore from "@/stores/login-store";
import { StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "../themed-text";

const LogoutButton = () => {
  const { logout } = useLoginStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
      <ThemedText style={styles.logoutButtonText}>Cerrar Sesión</ThemedText>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 10,
    backgroundColor: "#FF3B30", // Color rojo para indicar acción de cierre de sesión
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF", // Texto en blanco para contraste
    textAlign: "center",
  },
});

export default LogoutButton;
