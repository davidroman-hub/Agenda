import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/hooks/use-i18n";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

export default function TranslationTest() {
  const { changeLanguage, tCommon, currentLanguage } = useI18n();

  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const languages = [
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "en", name: "English", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
  ];

  const handleLanguageSelect = (languageCode: string) => {
    changeLanguage(languageCode);
    setShowLanguageMenu(false);
  };

  const getCurrentLanguageName = () => {
    const currentLang = languages.find((lang) => lang.code === currentLanguage);
    return currentLang
      ? `${currentLang.flag} ${currentLang.name}`
      : currentLanguage;
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>🌍 {tCommon("settings.languageSettings.title")}</ThemedText>

      {/* Selector de idioma */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>
          {tCommon("settings.languageSettings.selectLanguage")}
        </ThemedText>
        <TouchableOpacity
          style={styles.languageSelector}
          onPress={() => setShowLanguageMenu(!showLanguageMenu)}
        >
          <ThemedText style={styles.languageSelectorText}>
            {getCurrentLanguageName()}
          </ThemedText>
          <ThemedText style={styles.dropdownArrow}>
            {showLanguageMenu ? "▲" : "▼"}
          </ThemedText>
        </TouchableOpacity>

        {/* Menú desplegable */}
        {showLanguageMenu && (
          <ThemedView style={styles.languageMenu}>
            {languages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  currentLanguage === language.code &&
                    styles.activeLanguageOption,
                ]}
                onPress={() => handleLanguageSelect(language.code)}
              >
                <ThemedText
                  style={[
                    styles.languageOptionText,
                    currentLanguage === language.code &&
                      styles.activeLanguageOptionText,
                  ]}
                >
                  {language.flag} {language.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  languageSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    marginTop: 10,
  },
  languageSelectorText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  dropdownArrow: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  languageMenu: {
    marginTop: 5,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    overflow: "hidden",
  },
  languageOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  activeLanguageOption: {
    backgroundColor: "#FF6B35",
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  activeLanguageOptionText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  resetSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  resetButton: {
    padding: 12,
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
