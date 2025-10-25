import ParallaxScrollView from "@/components/parallax-scroll-view";
import ChangeThemeButton from "@/components/settings/changeThemeButton";
import LogoutButton from "@/components/settings/logoutButton";
import TaskFontSizeButton from "@/components/settings/taskFontSizeButton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Linking, StyleSheet, TextStyle, TouchableOpacity, ViewStyle } from "react-native";
import pjson from '../../app.json';
const versionJSON = pjson.expo.version;

const handleDavidRomanPress = () => {
  Linking.openURL('https://www.linkedin.com/in/jobdavidroman');
};

export default function SettingsPage() {
  console.log("Rendering SettingsPage");
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="gear"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={dynamicStyles.container}>
        <ThemedText type="title">Configuración</ThemedText>
        <ThemedText style={dynamicStyles.text}>
          Aquí puedes ajustar tus preferencias de la aplicación.
        </ThemedText>
        <ThemedText style={dynamicStyles.text}>Versión {versionJSON}</ThemedText>
        <ThemedText style={dynamicStyles.text}>
          Creado con ❤️‍🔥 desde 🇲🇽 por{' '}
          <TouchableOpacity onPress={handleDavidRomanPress} style={dynamicStyles.linkContainer}>
            <ThemedText style={[dynamicStyles.text, dynamicStyles.link]}>
              David Roman
            </ThemedText>
          </TouchableOpacity>
        </ThemedText>
        <ChangeThemeButton />
        <TaskFontSizeButton />
        <LogoutButton />
      </ThemedView>
    </ParallaxScrollView>
  );
}
const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});

const dynamicStyles: { container: ViewStyle; text: TextStyle; linkContainer: ViewStyle; link: TextStyle } = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
  },
  linkContainer: {
    display: 'inline-flex' as any,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
};
