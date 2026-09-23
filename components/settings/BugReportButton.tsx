import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BUG_REPORT_EMAIL, FORMSPREE_ENDPOINT } from "@/config/bug-report";
import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getCurrentLocalDateString } from "@/utils/date-utils";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import pjson from "../../app.json";

const REQUEST_TIMEOUT_MS = 15000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Añade un canal alfa a un color hex. Expande #rgb a #rrggbb antes,
// porque "#fff" + "20" no es un color válido (tint en modo oscuro es "#fff").
const withAlpha = (hex: string, alpha: string) => {
  const full = /^#[0-9a-f]{3}$/i.test(hex)
    ? "#" + hex.slice(1).split("").map((c) => c + c).join("")
    : hex;
  return full + alpha;
};

export default function BugReportButton() {
  const [modalVisible, setModalVisible] = useState(false);
  const [bugDescription, setBugDescription] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { tCommon } = useI18n();

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  const closeAndReset = () => {
    setBugDescription("");
    setUserEmail("");
    setModalVisible(false);
  };

  // Contenido del reporte, compartido por el envío directo y el mailto
  const buildReport = () => ({
    subject: "Just an Agenda - Bug Report",
    message:
      `Bug Report from Just an Agenda App\n\n` +
      `Description:\n${bugDescription}\n\n` +
      `Contact Email: ${userEmail || "Not provided"}\n\n` +
      `Device Info:\n` +
      `- App Version: ${pjson.expo.version}\n` +
      `- Platform: ${Platform.OS} ${Platform.Version}\n` +
      `- Date: ${getCurrentLocalDateString()}\n\n` +
      `Thank you for helping improve the app!`,
  });

  // Envío directo con Formspree: el reporte llega al correo sin abrir la app de email
  const sendWithFormspree = async () => {
    const { subject, message } = buildReport();
    const replyTo = userEmail.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: subject,
          name: "Just an Agenda App",
          message,
          // Formspree lo usa como reply-to y rechaza el envío si no es válido
          ...(EMAIL_REGEX.test(replyTo) ? { email: replyTo } : {}),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error ?? `HTTP ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  };

  // Alternativa: abrir la app de email con el reporte ya escrito
  const sendWithEmailApp = async () => {
    try {
      // Preparar el contenido del email
      const { subject, message } = buildReport();

      // Crear el enlace mailto
      const mailtoUrl = `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(message)}`;

      // Intentar abrir el cliente de email
      const canOpen = await Linking.canOpenURL(mailtoUrl);

      if (canOpen) {
        await Linking.openURL(mailtoUrl);

        // Mostrar mensaje de éxito y cerrar modal
        Alert.alert(
          tCommon("settings.bugReport.success"),
          tCommon("settings.bugReport.emailOpened"),
          [{ text: tCommon("buttons.ok"), onPress: closeAndReset }]
        );
      } else {
        // Si no puede abrir email, mostrar información para contacto manual
        Alert.alert(
          tCommon("settings.bugReport.noEmailClient"),
          `${tCommon("settings.bugReport.manualContact")}\n\n${BUG_REPORT_EMAIL}`,
          [
            {
              text: tCommon("buttons.copy"),
              onPress: () => {
                // Aquí podrías copiar al portapapeles si agregas esa funcionalidad
              },
            },
            { text: tCommon("buttons.ok") },
          ]
        );
      }
    } catch (error) {
      console.error("Error sending bug report:", error);
      Alert.alert(
        tCommon("settings.bugReport.error"),
        tCommon("settings.bugReport.sendError")
      );
    }
  };

  const handleSendBugReport = async () => {
    if (!bugDescription.trim()) {
      Alert.alert(
        tCommon("settings.bugReport.error"),
        tCommon("settings.bugReport.descriptionRequired")
      );
      return;
    }

    // Sin formulario de Formspree configurado se usa la app de email
    if (!FORMSPREE_ENDPOINT) {
      await sendWithEmailApp();
      return;
    }

    setSending(true);
    try {
      await sendWithFormspree();
      Alert.alert(
        tCommon("settings.bugReport.success"),
        tCommon("settings.bugReport.reportSent"),
        [{ text: tCommon("buttons.ok"), onPress: closeAndReset }]
      );
    } catch (error) {
      console.error("Error sending bug report:", error);
      Alert.alert(
        tCommon("settings.bugReport.error"),
        tCommon("settings.bugReport.sendError"),
        [
          { text: tCommon("buttons.ok") },
          {
            text: tCommon("settings.bugReport.sendByEmail"),
            onPress: sendWithEmailApp,
          },
        ]
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: withAlpha(tintColor, "20"),
            borderColor: tintColor,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Icon name="bug" size={20} color={tintColor} style={styles.icon} />
        <ThemedText style={[styles.buttonText, { color: tintColor }]}>
          {tCommon("settings.bugReport.reportBug")}
        </ThemedText>
      </TouchableOpacity>

      {/* Modal para reporte de bug */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header del modal */}
              <View style={styles.modalHeader}>
                <View style={styles.titleRow}>
                  <Icon name="bug" size={20} color={tintColor} />
                  <ThemedText style={styles.modalTitle}>
                    {tCommon("settings.bugReport.reportBug")}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Icon name="times" size={24} color={textColor} />
                </TouchableOpacity>
              </View>

              {/* Descripción del propósito */}
              <ThemedText style={[styles.description, { color: textColor }]}>
                {tCommon("settings.bugReport.description")}
              </ThemedText>

              {/* Campo de email (opcional) */}
              <View style={styles.labelRow}>
                <Icon name="envelope-o" size={16} color={tintColor} />
                <ThemedText style={[styles.label, styles.labelText, { color: textColor }]}>
                  {tCommon("settings.bugReport.emailLabel")} ({tCommon("settings.bugReport.optional")})
                </ThemedText>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.emailInput,
                  {
                    borderColor: withAlpha(tintColor, "40"),
                    color: textColor,
                    backgroundColor: backgroundColor,
                  },
                ]}
                value={userEmail}
                onChangeText={setUserEmail}
                placeholder={tCommon("settings.bugReport.emailPlaceholder")}
                placeholderTextColor={textColor + "60"}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Campo de descripción del bug */}
              <View style={styles.labelRow}>
                <Icon name="pencil" size={16} color={tintColor} />
                <ThemedText style={[styles.label, styles.labelText, { color: textColor }]}>
                  {tCommon("settings.bugReport.bugDescription")} *
                </ThemedText>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    borderColor: withAlpha(tintColor, "40"),
                    color: textColor,
                    backgroundColor: backgroundColor,
                  },
                ]}
                value={bugDescription}
                onChangeText={setBugDescription}
                placeholder={tCommon("settings.bugReport.bugPlaceholder")}
                placeholderTextColor={textColor + "60"}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />

              {/* Contador de caracteres */}
              <ThemedText style={[styles.charCounter, { color: textColor + "60" }]}>
                {bugDescription.length}/1000
              </ThemedText>

              {/* Botones */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.cancelButton,
                    { borderColor: textColor + "40" },
                  ]}
                  onPress={() => setModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel={tCommon("buttons.cancel")}
                >
                  <Icon name="times" size={24} color={textColor} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.sendButton,
                    { backgroundColor: tintColor },
                    sending && styles.sendingButton,
                  ]}
                  onPress={handleSendBugReport}
                  disabled={sending}
                  accessibilityRole="button"
                  accessibilityLabel={tCommon(
                    sending
                      ? "settings.bugReport.sending"
                      : "settings.bugReport.sendReport"
                  )}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={backgroundColor} />
                  ) : (
                    <Icon name="paper-plane" size={22} color={backgroundColor} />
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Mientras se envía: un velo con spinner encima del formulario, que también impide tocarlo */}
            {sending && (
              <View
                style={[styles.sendingOverlay, { backgroundColor: withAlpha(backgroundColor, "E6") }]}
                accessibilityLiveRegion="polite"
              >
                <ActivityIndicator size="large" color={tintColor} />
                <ThemedText style={[styles.sendingText, { color: textColor }]}>
                  {tCommon("settings.bugReport.sending")}
                </ThemedText>
              </View>
            )}
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  icon: {
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 10,
  },
  labelText: {
    flex: 1,
    marginBottom: 0,
    marginTop: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  emailInput: {
    marginBottom: 10,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCounter: {
    textAlign: "right",
    fontSize: 12,
    marginTop: 5,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  sendButton: {
    // backgroundColor will be set dynamically
  },
  sendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  sendingText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sendingButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
