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
              ` ${versionJSON} - ✨ ADD Sistema automático de notificaciones para tareas repetidas con verificación diaria
- ✨ ADD Organización inteligente de tareas: sin horario arriba, con horario ordenado por tiempo abajo
- ✨ ADD Visualización de horarios en formato HH:MM (hora arriba, minutos abajo) en lugar de números de línea
- ✨ ADD Configuración de líneas por página (6, 8, 10, 12, 15) integrada en botón flotante
- ✨ ADD Panel de estadísticas y gestión manual en NotificationSettings
- ✨ ADD Activación automática del sistema al abrir la app principal
- 🔧 IMPROVE Hook useRepeatedTaskNotifications para monitoreo de estado de app
- 🔧 IMPROVE Servicio centralizado RepeatedTaskNotificationService para gestión eficiente
- 🔧 IMPROVE Formato de tiempo en 24 horas sin caracteres extra
- 🔧 IMPROVE Persistencia de configuraciones usando MMKV
- 🔧 IMPROVE Reducción de complejidad cognitiva en componentes
- 🐛 FIX Problema de zona horaria en recordatorios (programación para día correcto)
- 🐛 FIX Tareas repetidas ahora se programan para el día de repetición, no el día original
- 🐛 FIX Eliminación de duplicación de tareas en vista con patrones activos
- 🐛 FIX Organización automática respeta límites configurables de líneas por página`,

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
