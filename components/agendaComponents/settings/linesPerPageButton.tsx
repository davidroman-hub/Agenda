import useBookSettingsStore from "@/stores/boook-settings";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LinesPerPageButton() {
  const { linesPerPage, setLinesPerPage } = useBookSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePress = () => {
    setIsExpanded(!isExpanded);
  };

  const lineOptions = [
    { lines: 6, label: "6 líneas" },
    { lines: 8, label: "8 líneas" },
    { lines: 10, label: "10 líneas" },
    { lines: 12, label: "12 líneas" },
    { lines: 15, label: "15 líneas" },
  ];

  const handleLineSelection = (lines: number) => {
    setLinesPerPage(lines);
    setIsExpanded(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.mainButton} onPress={handlePress}>
        <Text style={styles.mainButtonText}>
          📝 {linesPerPage} líneas
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.optionsContainer}>
          {lineOptions.map((option) => (
            <TouchableOpacity
              key={option.lines}
              style={[
                styles.optionButton,
                linesPerPage === option.lines && styles.selectedOption,
              ]}
              onPress={() => handleLineSelection(option.lines)}
            >
              <Text
                style={[
                  styles.optionText,
                  linesPerPage === option.lines && styles.selectedText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 1000,
  },
  mainButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  optionsContainer: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  selectedOption: {
    backgroundColor: "#007AFF20",
  },
  optionText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  selectedText: {
    color: "#007AFF",
    fontWeight: "600",
  },
});
