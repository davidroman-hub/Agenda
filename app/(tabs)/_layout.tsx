import { Tabs } from "expo-router";
import React, { useEffect } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import NotificationIconWithBadge from "@/components/ui/notification-icon-with-badge";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { useI18n } from "@/hooks/use-i18n";
import useLoginStore from "@/stores/login-store";

import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import useBookSettingsStore from "@/stores/boook-settings";
import useCalendarStore from "@/stores/Calendar-store";
import useFontSettingsStore from "@/stores/font-settings-store";
import useLanguagePreferencesStore from "@/stores/language-preferences-store";
import useRepeatingTasksStore from "@/stores/repeating-tasks-store";
import useThemeStore from "@/stores/theme-store";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isLoggedIn } = useLoginStore();
  const { tCommon } = useI18n();

  // Obtener todos los states de las stores para logging
  const agendaTasksState = useAgendaTasksStore((state) => state);
  const repeatingTasksState = useRepeatingTasksStore((state) => state);
  const themeState = useThemeStore((state) => state);
  const languageState = useLanguagePreferencesStore((state) => state);
  const bookSettingsState = useBookSettingsStore((state) => state);
  const calendarState = useCalendarStore((state) => state);
  const fontSettingsState = useFontSettingsStore((state) => state);

  // Console log de todas las stores
  useEffect(() => {
    console.log("=== STORES STATE UPDATE ===");
    console.log("📝 Agenda Tasks:", agendaTasksState);
    console.log("🔄 Repeating Tasks:", repeatingTasksState);
    console.log("🎨 Theme:", themeState);
    console.log("🌍 Language:", languageState);
    console.log("📖 Book Settings:", bookSettingsState);
    console.log("📅 Calendar:", calendarState);
    console.log("🔤 Font Settings:", fontSettingsState);

    console.log("=========================");
  }, [
    agendaTasksState,
    repeatingTasksState,
    themeState,
    languageState,
    bookSettingsState,
    calendarState,
    fontSettingsState,
    isLoggedIn,
  ]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        // Ocultar el tab bar cuando no está logueado (solo mostrar login)
        tabBarStyle: isLoggedIn ? undefined : { display: "none" },
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
      <Tabs.Screen
        name="index"
        options={{
          title: tCommon("tabs.agenda"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="agenda" color={color} />
          ),
          // Mostrar solo si está logueado
          href: isLoggedIn ? "/(tabs)" : null,
        }}
      />
      <Tabs.Screen
        name="pastTasks"
        options={{
          title: tCommon("tabs.pastTasks"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bell.fill" color={color} />
          ),
          // Mostrar solo si está logueado
          href: isLoggedIn ? "/(tabs)/pastTasks" : null,
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
