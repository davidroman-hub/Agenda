import useLoginStore from "@/stores/login-store";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

interface ProtectedRouteProps {
  readonly children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn } = useLoginStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Marcar como montado después del primer render
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Solo navegar después de que el componente esté montado
    if (isMounted && !isLoggedIn && !hasRedirected.current) {
      hasRedirected.current = true;
      // Usar setTimeout para evitar problemas de navegación
      setTimeout(() => {
        router.replace("/(tabs)/login");
      }, 0);
    }
    
    // Reset si el usuario se loguea
    if (isLoggedIn) {
      hasRedirected.current = false;
    }
  }, [isLoggedIn, router, isMounted]);

  // Mostrar loading mientras no esté montado o mientras redirige
  if (!isMounted || !isLoggedIn) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ThemedText>
          {isMounted ? "Redirigiendo al login..." : "Cargando..."}
        </ThemedText>
      </ThemedView>
    );
  }

  return <>{children}</>;
}
