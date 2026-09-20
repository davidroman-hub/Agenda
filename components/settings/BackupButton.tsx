import BackupModal from "@/components/settings/BackupModal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/hooks/use-i18n";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

// Acceso desde Ajustes a la copia de seguridad: pasar la agenda a otro móvil o guardarla a salvo
export default function BackupButton() {
  const { tCommon } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => setVisible(true)}>
        <ThemedText style={styles.buttonText}>💾 {tCommon("backup.title")}</ThemedText>
        <ThemedText style={styles.hintText}>{tCommon("backup.hint")}</ThemedText>
      </TouchableOpacity>

      <BackupModal visible={visible} onClose={() => setVisible(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10, paddingHorizontal: 20 },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.3)",
    alignItems: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  hintText: { fontSize: 13, opacity: 0.8, textAlign: "center" },
});
