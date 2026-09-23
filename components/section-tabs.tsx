import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useAgendaSectionStore from "@/stores/agenda-section-store";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { router, usePathname } from "expo-router";
import React from "react";
import { Text } from "react-native";

// Agenda, Calendario y Notas son la misma pantalla (app/(tabs)/index.tsx) enseñando una cosa u otra según
// el store de sección; aquí se les da a cada una su botón en la barra de abajo. Como para el navegador
// solo existe la pestaña "index", cuál está marcada no lo decide él sino esto

export type SectionTarget = "book" | "year" | "notes";

const SHOW: Record<SectionTarget, () => void> = {
  book: () => useAgendaSectionStore.getState().showBook(),
  year: () => useAgendaSectionStore.getState().showYear(),
  notes: () => useAgendaSectionStore.getState().showNotes(),
};

// ¿Está a la vista lo que enseña este botón? Solo cuenta si la pestaña de la agenda es la actual
function useSectionActive(target: SectionTarget): boolean {
  const onAgendaTab = usePathname() === "/";
  const shown = useAgendaSectionStore((state) => (state.section === "notes" ? "notes" : state.agendaView));
  return onAgendaTab && shown === target;
}

function useTabColor(active: boolean): string {
  const colors = Colors[useColorScheme() ?? "light"];
  return active ? colors.tint : colors.tabIconDefault;
}

export function SectionTabIcon({ target, name }: { readonly target: SectionTarget; readonly name: "agenda" | "calendar" | "note.text" }) {
  return <IconSymbol size={28} name={name} color={useTabColor(useSectionActive(target))} />;
}

export function SectionTabLabel({ target, title }: { readonly target: SectionTarget; readonly title: string }) {
  const active = useSectionActive(target);
  return (
    <Text numberOfLines={1} style={{ fontSize: 10, textAlign: "center", color: useTabColor(active), fontWeight: active ? "600" : "400" }}>
      {title}
    </Text>
  );
}

// Al pulsar se elige qué enseñar y se va a la pestaña de la agenda (desde Ajustes o Recordatorios también)
function makeSectionTabButton(target: SectionTarget) {
  return function SectionTabButton(props: BottomTabBarButtonProps) {
    const active = useSectionActive(target);
    return (
      <HapticTab
        {...props}
        accessibilityState={{ selected: active }}
        onPress={() => {
          SHOW[target]();
          router.navigate("/(tabs)");
        }}
      />
    );
  };
}

// Se crean una sola vez: si el layout los recreara en cada render, la barra los desmontaría y montaría de nuevo
export const BookTabButton = makeSectionTabButton("book");
export const YearTabButton = makeSectionTabButton("year");
export const NotesTabButton = makeSectionTabButton("notes");
