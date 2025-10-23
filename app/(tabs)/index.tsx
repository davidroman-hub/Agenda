import { Image } from "expo-image";
import { Button, StyleSheet } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import ProtectedRoute from "@/components/protected-route";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useCounterStore } from "@/stores/counter-store";
import useLoginStore from "@/stores/login-store";

export default function HomeScreen() {
  const { count, increment, decrement, reset } = useCounterStore();
  const { isLoggedIn, userValues, logout } = useLoginStore();

  return (
    <ProtectedRoute>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
        headerImage={
          <Image
            source={require("@/assets/images/partial-react-logo.png")}
            style={styles.reactLogo}
          />
        }
      >
        <ThemedView style={styles.titleContainer}>
          {isLoggedIn ? (
            <ThemedText type="title" style={styles.bigHelloText}>
              ¡Bienvenido, {userValues?.username}! {count}
            </ThemedText>
          ) : (
            <ThemedText type="title" style={styles.bigHelloText}>
              Agenda! {count}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.buttonContainer}>
          <Button onPress={increment} title="Increment (+)" />
          <Button onPress={decrement} title="Decrement (-)" />
          <Button onPress={reset} title="Reset (0)" />
        </ThemedView>

        <Button title="Logout" onPress={logout} />
      </ParallaxScrollView>
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
