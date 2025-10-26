import ParallaxScrollView from "@/components/parallax-scroll-view";
import ChangeThemeButton from "@/components/settings/changeThemeButton";
import LogoutButton from "@/components/settings/logoutButton";
import TaskFontSizeButton from "@/components/settings/taskFontSizeButton";
import VersionInfoButton from "@/components/settings/versionInfoButton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  Linking,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import pjson from "../../app.json";
const versionJSON = pjson.expo.version;

const handleDavidRomanPress = () => {
  Linking.openURL("https://aulaconnect.davidroman-hub.deno.net/work-with-me");
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
        <ThemedText style={dynamicStyles.text}>
          Versión {versionJSON}
        </ThemedText>

        <ChangeThemeButton />
        <TaskFontSizeButton />
        <VersionInfoButton />
        <LogoutButton />
      </ThemedView>
      <ThemedText style={dynamicStyles.text}>
        Creado con ❤️‍🔥 desde 🇲🇽 por{" "}
      </ThemedText>
      <TouchableOpacity
        style={{ justifyContent: "center", alignItems: "center", padding: 10 }}
        onPress={handleDavidRomanPress}
      >
        <ThemedText style={dynamicStyles.link}>David Roman</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 10,
        }}
      >
        <ThemedText
          style={{
            fontSize: 7,
          }}
        >
         Powered by React Native
        </ThemedText>
      </TouchableOpacity>
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

const dynamicStyles: {
  container: ViewStyle;
  text: TextStyle;
  link: TextStyle;
} = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    marginTop: 0,
    fontSize: 16,
    textAlign: "center",
  },
  link: {
    color: "#007AFF",
    textDecorationLine: "underline",
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 0,
  },
};
