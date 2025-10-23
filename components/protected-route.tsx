import useLoginStore from "@/stores/login-store";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn } = useLoginStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Marcar como montado después del primer render
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Solo navegar después de que el componente esté montado
    if (isMounted && !isLoggedIn) {
      // Usar push en lugar de replace para evitar conflictos
      router.push("/(tabs)/login");
    }
  }, [isLoggedIn, router, isMounted]);

  // Mostrar loading mientras no esté montado o mientras redirige
  if (!isMounted || !isLoggedIn) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ThemedText>
          {!isMounted ? "Cargando..." : "Redirigiendo al login..."}
        </ThemedText>
      </ThemedView>
    );
  }

  return <>{children}</>;
}
