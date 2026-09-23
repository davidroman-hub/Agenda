import { Tabs } from "expo-router";
import React, { useEffect } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import NotificationIconWithBadge from "@/components/ui/notification-icon-with-badge";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { BookTabButton, NotesTabButton, SectionTabIcon, SectionTabLabel, YearTabButton } from "@/components/section-tabs";
import { useI18n } from "@/hooks/use-i18n";
import useLoginStore from "@/stores/login-store";

import useAgendaSectionStore from "@/stores/agenda-section-store";
import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useBookSettingsStore from "@/stores/boook-settings";
import useFontSettingsStore from "@/stores/font-settings-store";
import useLanguagePreferencesStore from "@/stores/language-preferences-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import useThemeStore from "@/stores/theme-store";
import { getTabBarStyle, isLandscapeForced } from "@/utils/agenda-strip";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isLoggedIn } = useLoginStore();
  const { tCommon } = useI18n();
  // Con el año forzado en horizontal se oculta la barra de abajo para ganar altura
  const forcedLandscape = useAgendaSectionStore(isLandscapeForced);

  // Obtener todos los states de las stores para logging
  const agendaTasksState = useAgendaTasksStore((state) => state);
  const repeatingTasksState = useRepeatingTasksStore((state) => state);
  const themeState = useThemeStore((state) => state);
  const languageState = useLanguagePreferencesStore((state) => state);
  const bookSettingsState = useBookSettingsStore((state) => state);
  const fontSettingsState = useFontSettingsStore((state) => state);

  // Console log de todas las stores
  useEffect(() => {
    console.log("=== STORES STATE UPDATE ===");
    console.log("📝 Agenda Tasks:", agendaTasksState);
    console.log("🔄 Repeating Tasks:", repeatingTasksState);
    console.log("🎨 Theme:", themeState);
    console.log("🌍 Language:", languageState);
    console.log("📖 Book Settings:", bookSettingsState);
    console.log("🔤 Font Settings:", fontSettingsState);

    console.log("=========================");
  }, [
    agendaTasksState,
    repeatingTasksState,
    themeState,
    languageState,
    bookSettingsState,
    fontSettingsState,
    isLoggedIn,
  ]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        // Ocultar el tab bar cuando no está logueado (solo mostrar login)
        tabBarStyle: getTabBarStyle({ isLoggedIn, forcedLandscape }),
      }}
    >
      <Tabs.Screen
        name="login"
        options={{
          title: "Login",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.circle" color={color} />
          ),
          // Ocultar completamente el tab si ya está logueado
          href: isLoggedIn ? null : "/(tabs)/login",
        }}
      />
      {/* Agenda, Calendario y Notas: tres botones para la misma pantalla (ver components/section-tabs.tsx).
          Sin `href`: Expo Router no lo admite junto a un tabBarButton propio; sin sesión la barra entera va oculta */}
      <Tabs.Screen
        name="index"
        options={{
          title: tCommon("tabs.agenda"),
          tabBarIcon: () => <SectionTabIcon target="book" name="agenda" />,
          tabBarLabel: () => <SectionTabLabel target="book" title={tCommon("tabs.agenda")} />,
          tabBarButton: BookTabButton,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: tCommon("tabs.calendar"),
          tabBarIcon: () => <SectionTabIcon target="year" name="calendar" />,
          tabBarLabel: () => <SectionTabLabel target="year" title={tCommon("tabs.calendar")} />,
          tabBarButton: YearTabButton,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: tCommon("tabs.notes"),
          tabBarIcon: () => <SectionTabIcon target="notes" name="note.text" />,
          tabBarLabel: () => <SectionTabLabel target="notes" title={tCommon("tabs.notes")} />,
          tabBarButton: NotesTabButton,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: tCommon("tabs.reminders"),
          tabBarIcon: ({ color }) => (
            <NotificationIconWithBadge color={color} size={28} />
          ),
          // Mostrar solo si está logueado
          href: isLoggedIn ? "/(tabs)/notifications" : null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: tCommon("tabs.settings"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gear" color={color} />
          ),
          // Mostrar solo si está logueado
          href: isLoggedIn ? "/(tabs)/settings" : null,
        }}
      />
    </Tabs>
  );
}
