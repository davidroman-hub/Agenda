import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/hooks/use-i18n";
import {
  exactAlarmSettingsAvailable,
  openExactAlarmSettings,
} from "@/services/exact-alarm-service";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

// Acceso permanente a los ajustes de alarmas exactas de Android (por si el usuario descartó
// el aviso o quiere cambiarlo). Solo existe a partir de Android 12.
export default function ExactAlarmButton() {
  const { tCommon } = useI18n();

  if (!exactAlarmSettingsAvailable()) return null;

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          void openExactAlarmSettings();
        }}
      >
        <ThemedText style={styles.buttonText}>
          ⏰ {tCommon("exactAlarms.title")}
        </ThemedText>
        <ThemedText style={styles.hintText}>
          {tCommon("exactAlarms.settingsHint")}
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
  hintText: {
    fontSize: 13,
    opacity: 0.8,
    textAlign: "center",
  },
});
