import useLoginStore from "@/stores/login-store";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

interface PublicRouteProps {
  readonly children: React.ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { isLoggedIn } = useLoginStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Si el usuario está logueado y trata de acceder a una ruta pública,
    // redirigirlo inmediatamente a la agenda (pero solo una vez)
    if (isMounted && isLoggedIn && !hasRedirected.current) {
      hasRedirected.current = true;
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 0);
    }
    
    // Reset si el usuario se desloguea
    if (!isLoggedIn) {
      hasRedirected.current = false;
    }
  }, [isLoggedIn, router, isMounted]);

  // Si está logueado, no renderizar nada (evitar flash de contenido)
  if (isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
