import { Redirect } from "expo-router";

// Igual que calendar.tsx: el botón «Notas» de la barra pide las notas y va a la agenda
export default function NotesTab() {
  return <Redirect href="/(tabs)" />;
}
