import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
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
      }}
    >
      <Tabs.Screen
        name="login"
        options={{
          title: "Login",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.circle" color={color} />
          ),
          // Ocultar el tab si ya está logueado
          href: isLoggedIn ? null : "/(tabs)/login",
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Agenda",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
          // Mostrar solo si está logueado
          href: isLoggedIn ? "/(tabs)" : null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
          // Mostrar solo si está logueado
          href: isLoggedIn ? "/(tabs)/explore" : null,
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
