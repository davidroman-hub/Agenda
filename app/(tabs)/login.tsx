import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import useLoginStore from "@/stores/login-store";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, TextInput, TouchableOpacity } from "react-native";

export default function LoginScreen() {
  const { setUserValues, userValues, login, isLoggedIn } = useLoginStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/(tabs)");
    }
  }, [isLoggedIn, router]);

  const handleLogin = () => {
    if (userValues?.username === "test" && userValues?.password === "123") {
      login();
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header con logo o título */}
      <ThemedView style={styles.headerContainer}>
        <ThemedText type="title" style={styles.title}>
          Mi Agenda
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Organiza tu día, todos los días
        </ThemedText>
      </ThemedView>

      {/* Formulario de login */}
      <ThemedView style={styles.formContainer}>
        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Usuario</ThemedText>
          <TextInput
            onChange={(e) =>
              setUserValues(e.nativeEvent.text, userValues?.password || "")
            }
            style={styles.input}
            value={userValues?.username || ""}
            placeholder="Ingresa tu usuario"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Contraseña</ThemedText>
          <TextInput
            style={styles.input}
            value={userValues?.password || ""}
            onChange={(e) =>
              setUserValues(userValues?.username || "", e.nativeEvent.text)
            }
            placeholder="Ingresa tu contraseña"
            placeholderTextColor="#999"
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ThemedView>

        {/* Botón de login */}
        <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
          <ThemedText style={styles.loginButtonText}>Iniciar Sesión</ThemedText>
        </TouchableOpacity>

        {/* Enlaces adicionales */}
        <ThemedView style={styles.linksContainer}>
          <TouchableOpacity>
            <ThemedText style={styles.linkText}>
              ¿Olvidaste tu contraseña?
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity>
            <ThemedText style={styles.linkText}>Crear cuenta nueva</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      {/* Footer */}
      <ThemedView style={styles.footer}>
        <ThemedText style={styles.footerText}>
          Tu agenda personal para el éxito diario
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 10,
    height: 40,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  loginButton: {
    backgroundColor: "#007AFF",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  linksContainer: {
    alignItems: "center",
    gap: 15,
  },
  linkText: {
    color: "#007AFF",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  footer: {
    alignItems: "center",
    marginTop: 50,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
});
