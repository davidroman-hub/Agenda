import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { useVersionStore } from "@/stores/version-store";
import React from "react";
import { Alert, StyleSheet, TouchableOpacity } from "react-native";
import pjson from "../../app.json";
const versionJSON = pjson.expo.version;

export default function VersionInfoButton() {
  const { previousVersion, isFirstLaunch } = useVersionStore();

  const handleVersionPress = () => {
    Alert.alert(
      "📱 Información de Versión",
      `Versión actual: ${versionJSON}\n\n\n¿Qué quieres ver?`,
      [
        {
          text: "Changelog",
          onPress: () => {
            Alert.alert(
              "📋 Historial de Cambios",
              ` **v1.5.0** - 2025-10-27
- ✨ ADD Sistema completo de tareas repetidas (diarias, semanales, mensuales)
- ✨ ADD Notificaciones independientes para tareas repetidas
- ✨ ADD Estado de completado independiente para cada instancia de tarea repetida
- ✨ ADD Integración de tareas repetidas con widget Android (indicador 🔄)
- 🔧 IMPROVE Manejo mejorado de fechas y timezone en recordatorios
- 🔧 IMPROVE Prevención de duplicación de tareas al activar repetición
- 🐛 FIX Problema de date picker mostrando día anterior por defecto
- 🐛 FIX Issue con taskDate undefined para tareas nuevas
- 🐛 FIX Problemas de timezone en creación de fechas locales
- 🗑️ REMOVE Botón de testing de tareas del menú de configuración`,

              [{ text: "Cerrar", style: "cancel" }]
            );
          },
        },

        {
          text: "Cerrar",
          style: "cancel",
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleVersionPress}>
        <ThemedText style={styles.buttonText}>
          📱 Información de Versión
        </ThemedText>
        <ThemedText style={styles.versionText}>
          v{versionJSON}
          {previousVersion && !isFirstLaunch && (
            <ThemedText style={styles.updateIndicator}>
              {" "}
              • Actualizada
            </ThemedText>
          )}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.3)",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  versionText: {
    fontSize: 14,
    opacity: 0.8,
  },
  updateIndicator: {
    color: "#34C759",
    fontWeight: "bold",
  },
});
