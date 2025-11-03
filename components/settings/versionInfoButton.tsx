import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { useI18n } from "@/hooks/use-i18n";
import { useVersionStore } from "@/stores/version-store";
import React from "react";
import { Alert, StyleSheet, TouchableOpacity } from "react-native";
import pjson from "../../app.json";
import { changeLogLocales } from "./changeLogLocales";
const versionJSON = pjson.expo.version;

export default function VersionInfoButton() {
  const { tCommon ,currentLanguage} = useI18n();

  const { previousVersion, isFirstLaunch } = useVersionStore();

  const showChanelog = () => {
    if (currentLanguage === "es") {
      return changeLogLocales.es.changes;
    }
    if (currentLanguage === "en") {
      return changeLogLocales.en.changes;
    }
    if (currentLanguage === "fr") {
      return changeLogLocales.fr.changes;
    }
    if (currentLanguage === "it") {
      return changeLogLocales.it.changes;
    }   
    return undefined;
  };

  const handleVersionPress = () => {
    Alert.alert(
      "📱" + tCommon("settings.versionInfo"),
      `${tCommon("settings.currentVersion")}: ${versionJSON}\n\n\n ${tCommon(
        "settings.what"
      )}`,
      [
        {
          text: "Changelog",
          onPress: () => {
            Alert.alert(
              "📋 " + tCommon("settings.changeHistory"),
              ` ${versionJSON} ${showChanelog()}`,

              [{ text: tCommon("buttons.close"), style: "cancel" }]
            );
          },
        },

        {
          text: tCommon("buttons.close"),
          style: "cancel",
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleVersionPress}>
        <ThemedText style={styles.buttonText}>
          📱 {tCommon("settings.versionInfo")}
        </ThemedText>
        <ThemedText style={styles.versionText}>
          v{versionJSON}
          {previousVersion && !isFirstLaunch && (
            <ThemedText style={styles.updateIndicator}>
              {" "}
              • {tCommon("settings.latestVersion")}
            </ThemedText>
          )}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.3)",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  versionText: {
    fontSize: 14,
    opacity: 0.8,
  },
  updateIndicator: {
    color: "#34C759",
    fontWeight: "bold",
  },
});
