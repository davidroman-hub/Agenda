import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { Button, TextStyle, ViewStyle } from "react-native";

export default function SettingsPage() {
  return (
    <ThemedView style={dynamicStyles.container}>
      <ThemedText type="title">Configuración</ThemedText>
      <ThemedText style={dynamicStyles.text}>
        Aquí puedes ajustar tus preferencias de la aplicación.
      </ThemedText>
      <Button
        title="Guardar Cambios"
        onPress={() => alert("Cambios guardados")}
      />
    </ThemedView>
  );
}
const dynamicStyles: { container: ViewStyle; text: TextStyle } = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
  },
};
