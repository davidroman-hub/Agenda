import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/hooks/use-i18n";
import useFontSettingsStore, {
  FONT_SIZES,
  FontSizeKey,
} from "@/stores/font-settings-store";
import React, { useState } from "react";
import { FlatList, Modal, StyleSheet, TouchableOpacity } from "react-native";

export default function TaskFontSizeButton() {
  const { tCommon } = useI18n();

  const { taskFontSize, setTaskFontSize } = useFontSettingsStore();
  const [modalVisible, setModalVisible] = useState(false);

  const handleFontSizeChange = (size: FontSizeKey) => {
    setTaskFontSize(size);
    setModalVisible(false);
  };

  const renderTheFontOptionString = (key: FontSizeKey) => {
    if (key === "small") return tCommon("settings.fontSize.small");
    if (key === "normal") return tCommon("settings.fontSize.medium");
    if (key === "large") return tCommon("settings.fontSize.large");
    if (key === "veryLarge") return tCommon("settings.fontSize.veryLarge");
    if (key === "extraLarge") return tCommon("settings.fontSize.extraLarge");
    // cast FONT_SIZES to an indexable type so TypeScript knows .label exists for the keyed entry
    return "";
  };

  const renderFontSizeOption = ({ item }: { item: FontSizeKey }) => {
    const isSelected = taskFontSize === item;
    return (
      <TouchableOpacity
        style={[styles.optionButton, isSelected && styles.selectedOption]}
        onPress={() => handleFontSizeChange(item)}
      >
        <ThemedText
          style={[styles.optionText, isSelected && styles.selectedOptionText]}
        >
          {renderTheFontOptionString(item)}
        </ThemedText>
        <ThemedText
          style={[
            styles.previewText,
            { fontSize: 14 * FONT_SIZES[item].multiplier },
            isSelected && styles.selectedOptionText,
          ]}
        >
          {tCommon("settings.fontSize.taskExample")}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.mainButton}
        onPress={() => setModalVisible(true)}
      >
        <ThemedView style={styles.buttonContent}>
          <ThemedText style={styles.buttonTitle}>
            {tCommon("settings.fontSize.title")}
          </ThemedText>
          <ThemedText style={styles.buttonSubtitle}>
            {tCommon("settings.fontSize.current")}:{" "}
            {renderTheFontOptionString(taskFontSize)}
          </ThemedText>
        </ThemedView>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>
              {tCommon("settings.fontSize.selectFontSize")}
            </ThemedText>

            <FlatList
              data={Object.keys(FONT_SIZES) as FontSizeKey[]}
              renderItem={renderFontSizeOption}
              keyExtractor={(item) => item}
              style={styles.optionsList}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={styles.closeButtonText}>{tCommon("buttons.close")}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  mainButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    minWidth: 200,
    alignItems: "center",
  },
  buttonContent: {
    alignItems: "center",
    backgroundColor: "transparent",
  },
  buttonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  buttonSubtitle: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  optionsList: {
    width: "100%",
    maxHeight: 300,
  },
  optionButton: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  selectedOption: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  previewText: {
    fontStyle: "italic",
    opacity: 0.8,
  },
  selectedOptionText: {
    color: "#FFFFFF",
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },
});
