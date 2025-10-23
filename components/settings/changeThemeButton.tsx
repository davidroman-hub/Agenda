import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useThemeStore from "@/stores/theme-store";
import { StyleSheet, TouchableOpacity } from "react-native";

const ChangeThemeButton = () => {
  const { colorScheme, toggleColorScheme } = useThemeStore();
  const systemColorScheme = useColorScheme();
  const colors = Colors[systemColorScheme ?? 'light'];

  const handleToggleTheme = () => {
    toggleColorScheme();
  };

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: colors.tint }]} 
      onPress={handleToggleTheme}
      activeOpacity={0.8}
    >
      <ThemedView style={styles.buttonContent}>
        <ThemedText style={styles.icon}>
          {colorScheme === "light" ? "🌙" : "☀️"}
        </ThemedText>
        <ThemedText style={[styles.buttonText, { color: colors.background }]}>
          {colorScheme === "light" ? "Modo Oscuro" : "Modo Claro"}
        </ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 10,
    shadowColor: '#000',
    color: '#fff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChangeThemeButton;