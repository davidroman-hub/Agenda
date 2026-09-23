import { Redirect } from "expo-router";

// El botón «Calendario» de la barra no llega aquí: pide la vista de año y va a la agenda (ver
// components/section-tabs.tsx). La ruta existe para que la barra tenga su pestaña
export default function CalendarTab() {
  return <Redirect href="/(tabs)" />;
}
