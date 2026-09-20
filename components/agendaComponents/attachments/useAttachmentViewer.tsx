import { attachmentExists, openAttachment } from "@/services/attachments-service";
import { Attachment, getAttachmentKind } from "@/utils/attachments";
import React, { useCallback, useState } from "react";
import { Alert } from "react-native";
import AttachmentViewer from "./AttachmentViewer";

// Abre un adjunto según lo que sea: las imágenes dentro de la app (visor propio), los PDF y demás
// con la app del sistema que sepa leerlos. `viewer` hay que pintarlo en algún sitio del componente.
export function useAttachmentViewer(tCommon: (key: string, options?: any) => string) {
  const [imageToShow, setImageToShow] = useState<Attachment | null>(null);

  const open = useCallback(
    async (attachment: Attachment) => {
      const notAvailable = () =>
        Alert.alert(tCommon("attachments.missingTitle"), tCommon("attachments.missing"));

      // Tras restaurar una copia de seguridad, o si el sistema limpió el almacenamiento, el archivo puede faltar
      if (!attachmentExists(attachment)) {
        notAvailable();
        return;
      }

      if (getAttachmentKind(attachment) === "image") {
        setImageToShow(attachment);
        return;
      }

      const result = await openAttachment(attachment);
      if (result === "missing") notAvailable();
      if (result === "unavailable") {
        Alert.alert(tCommon("attachments.errorTitle"), tCommon("attachments.cannotOpen"));
      }
    },
    [tCommon]
  );

  const viewer = (
    <AttachmentViewer
      attachment={imageToShow}
      onClose={() => setImageToShow(null)}
      tCommon={tCommon}
    />
  );

  return { open, viewer };
}
