import ParallaxScrollView from "@/components/parallax-scroll-view";
import BackupButton from "@/components/settings/BackupButton";
import BugReportButton from "@/components/settings/BugReportButton";
import ChangeThemeButton from "@/components/settings/changeThemeButton";
import ExactAlarmButton from "@/components/settings/ExactAlarmButton";
import TaskFontSizeButton from "@/components/settings/taskFontSizeButton";
import TaskTypesButton from "@/components/settings/TaskTypesButton";
import VersionInfoButton from "@/components/settings/versionInfoButton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import TranslationTest from "@/components/translation-test";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useI18n } from "@/hooks/use-i18n";
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

// Política de privacidad publicada en Netlify (el HTML está en app-store-assets/privacy-policy-multilang.html)
const PRIVACY_POLICY_URL = "https://just-an-agenda.netlify.app/";

const handlePrivacyPolicyPress = () => {
  Linking.openURL(PRIVACY_POLICY_URL);
};

export default function SettingsPage() {
  const { tCommon } = useI18n();

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
        <ThemedText
          style={{
            marginBottom: 10,
            height: 40,
          }}
          type="title"
        >
          {tCommon("settings.title")}
        </ThemedText>
        <ThemedText style={dynamicStyles.text}>
          {tCommon("settings.info")}
        </ThemedText>
        <ThemedText style={dynamicStyles.text}>
          {tCommon("settings.version")} {versionJSON}
        </ThemedText>

        <ChangeThemeButton />
        <TaskFontSizeButton />
        <TaskTypesButton />
        <BackupButton />
        <VersionInfoButton />
        <ExactAlarmButton />
        <BugReportButton />
        {/* <DevToolsButton /> */}
        {/* <LogoutButton /> */}
      </ThemedView>

      <TouchableOpacity
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 10,
        }}
      >
        <TranslationTest />
      </TouchableOpacity>
      <ThemedText style={dynamicStyles.text}>
        Creado con ❤️‍🔥 desde 🇲🇽 por{" "}
      </ThemedText>
      <TouchableOpacity
        style={{ justifyContent: "center", alignItems: "center", padding: 10 }}
        onPress={handleDavidRomanPress}
      >
        <ThemedText style={dynamicStyles.link}>David Roman</ThemedText>
      </TouchableOpacity>

      {/* Privacy Policy Link */}
      <TouchableOpacity
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 15,
          marginTop: 20,
          borderTopWidth: 1,
          borderTopColor: "#E0E0E0",
        }}
        onPress={handlePrivacyPolicyPress}
      >
        <ThemedText style={[dynamicStyles.link, { fontSize: 14 }]}>
          {tCommon("settings.privacyPolicy")}
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
