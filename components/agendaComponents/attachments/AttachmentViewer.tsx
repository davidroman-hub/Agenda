import { getAttachmentUri, openAttachment, shareAttachment } from "@/services/attachments-service";
import { Attachment } from "@/utils/attachments";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AttachmentViewerProps {
  // La imagen que se enseña; null cierra el visor
  readonly attachment: Attachment | null;
  readonly onClose: () => void;
  readonly tCommon: (key: string, options?: any) => string;
}

// Visor de imágenes adjuntas a pantalla completa (los PDF y demás se abren con la app del sistema)
export default function AttachmentViewer({ attachment, onClose, tCommon }: AttachmentViewerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [attachment?.fileName]);

  const uri = attachment ? getAttachmentUri(attachment) : null;
  const imageHeight = height - insets.top - insets.bottom - 120;

  return (
    <Modal
      visible={attachment !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {attachment?.name}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={tCommon("attachments.close")}
            hitSlop={12}
          >
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {uri && !failed ? (
          // El zoom con dos dedos funciona en iOS; en Android la imagen se ve entera
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            bouncesZoom
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri }}
              style={{ width, height: imageHeight }}
              contentFit="contain"
              onError={() => setFailed(true)}
              accessibilityLabel={attachment?.name}
            />
          </ScrollView>
        ) : (
          <View style={styles.message}>
            <Text style={styles.messageText}>
              {tCommon(uri ? "attachments.imageFailed" : "attachments.missing")}
            </Text>
          </View>
        )}

        {attachment && uri && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.action} onPress={() => shareAttachment(attachment)}>
              <Text style={styles.actionText}>{tCommon("attachments.share")}</Text>
            </TouchableOpacity>
            {failed && (
              <TouchableOpacity style={styles.action} onPress={() => openAttachment(attachment)}>
                <Text style={styles.actionText}>{tCommon("attachments.openWith")}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  name: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  close: {
    color: "#ffffff",
    fontSize: 22,
  },
  message: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  messageText: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    opacity: 0.85,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 12,
  },
  action: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  actionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
