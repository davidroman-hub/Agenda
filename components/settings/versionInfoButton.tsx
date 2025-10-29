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
              ` ${versionJSON} - ✨ ADD Enlaces clickeables en tareas: URLs automáticamente detectadas y convertidas en hipervínculos
- ✨ ADD Soporte completo para múltiples formatos de URL (https://, http://, www., dominios)
- ✨ ADD Componente LinkableText para renderizar texto con enlaces interactivos
- ✨ ADD Utilidades url-utils para detección, normalización y apertura de enlaces
- ✨ ADD ScrollView en configuración de notificaciones para mejor navegación
- ✨ ADD Límite de texto extendido para tareas (de 100 a 500 caracteres)
- ✨ ADD Sistema de migración de fechas para compatibilidad global de zonas horarias
- 🔧 IMPROVE Enlaces con estilos adaptativos para modo claro/oscuro (azul con subrayado)
- 🔧 IMPROVE Widget simplificado: solo abre la app, eliminada sincronización agresiva
- 🔧 IMPROVE Manejo de errores al abrir enlaces con alertas informativas
- 🔧 IMPROVE Altura de campo de entrada de tareas aumentada (120px → 200px)
- 🔧 IMPROVE Límites de visualización de texto aumentados (30/25 → 80/75 caracteres)
- 🔧 IMPROVE Sistema de fechas completamente compatible con todas las zonas horarias
- 🐛 FIX Widget ya no causa pérdida de datos al tocarlo
- 🐛 FIX Problemas de compilación Android en WidgetDataManagerModule y AgendaWidgetProvider
- 🐛 FIX Tareas aparecían 1 hora después del cambio de día por problemas de timezone
- 🐛 FIX Sistema de migración automática ejecuta una sola vez por instalación
- 🐛 FIX Uso correcto de dateToLocalDateString en lugar de toISOString().split('T')[0]`,

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
