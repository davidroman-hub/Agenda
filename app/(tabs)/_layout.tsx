import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import NotificationIconWithBadge from "@/components/ui/notification-icon-with-badge";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

import useLoginStore from "@/stores/login-store";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isLoggedIn } = useLoginStore();

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
          title: "Agenda",
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
          title: "Tareas Pasadas",
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
          title: "Recordatorios",
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
          title: "Settings",
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
