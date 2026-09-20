import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  createBackupFile,
  CreateBackupResult,
  pickBackupFile,
  restoreBackup,
  shareBackupFile,
} from "@/services/backup-service";
import { MIN_BACKUP_PASSWORD_LENGTH } from "@/utils/backup";
import { dateToLocalDateString } from "@/utils/date-utils";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface BackupModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

type Screen = "menu" | "create" | "created" | "restore" | "restored";

type CreatedBackup = Extract<CreateBackupResult, { status: "created" }>;

// Texto de cada error posible (todos los motivos de fallo de crear, elegir archivo y restaurar)
const ERROR_KEYS = {
  "wrong-password": "backup.errorWrongPassword",
  "invalid-file": "backup.errorInvalidFile",
  "unsupported-version": "backup.errorUnsupportedVersion",
  "too-large": "backup.errorTooLarge",
  unavailable: "backup.errorUnavailable",
  failed: "backup.errorFailed",
} as const;

// Copia de seguridad: crear un archivo cifrado con contraseña para pasar la agenda a otro móvil, y
// restaurarlo. Mientras trabaja (derivar la clave tarda unos segundos) no se puede cerrar.
export default function BackupModal({ visible, onClose }: BackupModalProps) {
  const { tCommon } = useI18n();

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const accentColor = useThemeColor({}, "accent");
  const onAccentColor = useThemeColor({}, "onAccent");
  const borderColor = "rgba(128,128,128,0.35)";

  const [screen, setScreen] = useState<Screen>("menu");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [created, setCreated] = useState<CreatedBackup | null>(null);
  const [pickedText, setPickedText] = useState<string | null>(null);
  const [restoredDate, setRestoredDate] = useState("");
  const [shareError, setShareError] = useState(false);

  const goTo = (next: Screen) => {
    setScreen(next);
    setPassword("");
    setConfirm("");
    setError(null);
    setShareError(false);
    setPickedText(null);
  };

  const close = () => {
    if (busy) return;
    goTo("menu");
    setCreated(null);
    onClose();
  };

  // Atrás (también el botón del sistema): a la pantalla anterior, y desde el menú se cierra
  const back = () => {
    if (busy) return;
    if (screen === "menu") close();
    else goTo("menu");
  };

  // Avisa del avance sin repintar por cada paso de la derivación de la clave
  const reportProgress = (fraction: number) =>
    setProgress((previous) => (fraction === 1 || Math.abs(fraction - previous) >= 0.02 ? fraction : previous));

  const startWork = () => {
    setError(null);
    setProgress(0);
    setBusy(true);
  };

  const share = async (backup: CreatedBackup) => {
    setShareError((await shareBackupFile(backup.uri, backup.fileName)) === "unavailable");
  };

  const handleCreate = async () => {
    if (password.length < MIN_BACKUP_PASSWORD_LENGTH) {
      setError(tCommon("backup.passwordTooShort", { min: MIN_BACKUP_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirm) {
      setError(tCommon("backup.passwordsDontMatch"));
      return;
    }

    startWork();
    const result = await createBackupFile(password, { onProgress: reportProgress });
    setBusy(false);

    if (result.status === "error") {
      setError(tCommon(ERROR_KEYS[result.reason]));
      return;
    }
    goTo("created");
    setCreated(result);
    await share(result);
  };

  const handlePick = async () => {
    setError(null);
    const result = await pickBackupFile();
    if (result.status === "picked") setPickedText(result.text);
    else if (result.status === "error") setError(tCommon(ERROR_KEYS[result.reason]));
  };

  const runRestore = async () => {
    if (pickedText === null) return;

    startWork();
    const result = await restoreBackup(pickedText, password, { onProgress: reportProgress });
    setBusy(false);

    if (result.status === "error") {
      setError(tCommon(ERROR_KEYS[result.reason]));
      return;
    }
    goTo("restored");
    setRestoredDate(dateToLocalDateString(result.createdAt));
  };

  // Restaurar reemplaza lo que hay: se pide confirmación
  const handleRestore = () => {
    if (pickedText === null || password === "") return;
    Alert.alert(tCommon("backup.restoreConfirmTitle"), tCommon("backup.restoreConfirmMessage"), [
      { text: tCommon("buttons.cancel"), style: "cancel" },
      { text: tCommon("backup.restoreConfirmButton"), style: "destructive", onPress: runRestore },
    ]);
  };

  const primaryButton = (label: string, onPress: () => void, disabled = false) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.primaryButton, { backgroundColor: accentColor }, disabled && styles.disabled]}
    >
      <ThemedText style={[styles.primaryText, { color: onAccentColor }]}>{label}</ThemedText>
    </TouchableOpacity>
  );

  const secondaryButton = (label: string, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.secondaryButton, { borderColor: accentColor }]}
    >
      <ThemedText style={styles.secondaryText}>{label}</ThemedText>
    </TouchableOpacity>
  );

  const passwordInput = (label: string, value: string, onChange: (text: string) => void) => (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        style={[styles.input, { color: textColor, borderColor }]}
        value={value}
        onChangeText={(text) => {
          onChange(text);
          setError(null);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        accessibilityLabel={label}
      />
    </View>
  );

  const title = {
    menu: tCommon("backup.title"),
    create: tCommon("backup.createButton"),
    created: tCommon("backup.createdTitle"),
    restore: tCommon("backup.restoreButton"),
    restored: tCommon("backup.restoredTitle"),
  }[screen];

  const percent = Math.round(progress * 100);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={back}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ThemedView style={[styles.container, { backgroundColor }]}>
          <ThemedView style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity
              onPress={close}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={tCommon("buttons.close")}
              style={styles.closeButton}
            >
              <ThemedText style={[styles.closeText, busy && styles.disabled]}>✕</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator size="large" color={accentColor} />
                <ThemedText style={styles.busyTitle}>{tCommon("backup.working")}</ThemedText>
                <View style={[styles.track, { borderColor }]}>
                  <View style={[styles.bar, { backgroundColor: accentColor, width: `${percent}%` }]} />
                </View>
                <ThemedText style={styles.hint}>{tCommon("backup.workingHint")}</ThemedText>
              </View>
            ) : (
              <>
                {screen === "menu" && (
                  <>
                    <ThemedText style={styles.paragraph}>{tCommon("backup.intro")}</ThemedText>
                    {primaryButton(tCommon("backup.createButton"), () => goTo("create"))}
                    {secondaryButton(tCommon("backup.restoreButton"), () => goTo("restore"))}
                  </>
                )}

                {screen === "create" && (
                  <>
                    {passwordInput(tCommon("backup.passwordLabel"), password, setPassword)}
                    {passwordInput(tCommon("backup.confirmPasswordLabel"), confirm, setConfirm)}
                    <ThemedText style={styles.hint}>{tCommon("backup.passwordWarning")}</ThemedText>
                    {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
                    {primaryButton(tCommon("backup.createAndShare"), handleCreate, password === "")}
                    {secondaryButton(tCommon("backup.back"), back)}
                  </>
                )}

                {screen === "created" && created && (
                  <>
                    <ThemedText style={styles.paragraph}>{tCommon("backup.createdMessage")}</ThemedText>
                    <ThemedText style={styles.fileName}>{created.fileName}</ThemedText>
                    {created.droppedNotes > 0 && (
                      <ThemedText style={styles.hint}>
                        {tCommon("backup.droppedNotes", { total: created.droppedNotes })}
                      </ThemedText>
                    )}
                    {shareError && (
                      <ThemedText style={styles.errorText}>{tCommon("backup.shareUnavailable")}</ThemedText>
                    )}
                    {primaryButton(tCommon("backup.shareAgain"), () => void share(created))}
                    {secondaryButton(tCommon("buttons.close"), close)}
                  </>
                )}

                {screen === "restore" && (
                  <>
                    <ThemedText style={styles.paragraph}>{tCommon("backup.restoreWarning")}</ThemedText>
                    {pickedText === null ? (
                      <>
                        {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
                        {primaryButton(tCommon("backup.pickFile"), handlePick)}
                      </>
                    ) : (
                      <>
                        <ThemedText style={styles.hint}>{tCommon("backup.fileReady")}</ThemedText>
                        {passwordInput(tCommon("backup.passwordLabel"), password, setPassword)}
                        {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
                        {primaryButton(tCommon("backup.restoreAction"), handleRestore, password === "")}
                      </>
                    )}
                    {secondaryButton(tCommon("backup.back"), back)}
                  </>
                )}

                {screen === "restored" && (
                  <>
                    <ThemedText style={styles.paragraph}>
                      {tCommon("backup.restoredMessage", { date: restoredDate })}
                    </ThemedText>
                    {primaryButton(tCommon("buttons.close"), close)}
                  </>
                )}
              </>
            )}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingTop: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  closeButton: { padding: 8 },
  closeText: { fontSize: 20 },
  content: { padding: 20, gap: 16 },
  paragraph: { fontSize: 15, lineHeight: 22 },
  hint: { fontSize: 13, opacity: 0.75, lineHeight: 19 },
  fileName: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  primaryButton: { paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  primaryText: { fontSize: 16, fontWeight: "600" },
  secondaryButton: { paddingVertical: 13, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  secondaryText: { fontSize: 16, fontWeight: "500" },
  disabled: { opacity: 0.4 },
  errorText: { color: "#D32F2F", fontSize: 14 },
  busy: { alignItems: "center", gap: 16, paddingTop: 40 },
  busyTitle: { fontSize: 17, fontWeight: "600" },
  track: { width: "100%", height: 8, borderRadius: 4, borderWidth: 1, overflow: "hidden" },
  bar: { height: "100%" },
});
