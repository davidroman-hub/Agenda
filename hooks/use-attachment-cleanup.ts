import { startAttachmentCleanup } from "@/services/attachments-cleanup";
import { useEffect } from "react";

// Mantiene la carpeta de adjuntos limpia mientras la app está abierta (ver services/attachments-cleanup.ts)
export const useAttachmentCleanup = () => {
  useEffect(() => startAttachmentCleanup(), []);
};
