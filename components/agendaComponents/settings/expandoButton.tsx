import useBookSettingsStore from "@/stores/boook-settings";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ExpandoButton() {
  const { setDaysToShow, daysToShow, setViewMode, viewMode, linesPerPage, setLinesPerPage } =
    useBookSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePress = () => {
    setIsExpanded(!isExpanded);
  };

  const optiones = [
    { id: 1, label: daysToShow === 6 ? "3 dias" : "6 dias" },
    { id: 2, label: "•  •\n•  •\n•  •" },
    { id: 3, label: "•" },
  
  ];

  const manageOptions = (optionId: number) => {
    if (optionId === 1) {
      const newDays = daysToShow === 6 ? 3 : 6;
      setDaysToShow(newDays);
    } else if (optionId === 2 && daysToShow === 6) {
      setViewMode("expanded");
    } else if (optionId === 2 && daysToShow === 1) {
      setViewMode("expanded");
      setDaysToShow(6);
    } else if (optionId === 3) {
      setDaysToShow(1);
      setViewMode("single");
    } else if (optionId === 4) {
      // Ciclar entre diferentes números de líneas
      const lineOptions = [12];
      const currentIndex = lineOptions.indexOf(linesPerPage);
      const nextIndex = (currentIndex + 1) % lineOptions.length;
      setLinesPerPage(lineOptions[nextIndex]);
    }
    setIsExpanded(false);
  };

  return (
    <View style={styles.container}>
      {isExpanded && (
        <View style={styles.optionsContainer}>
          {optiones.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionButton}
              onPress={() => manageOptions(option.id)}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TouchableOpacity style={styles.floatingButton} onPress={handlePress}>
        <Text style={styles.floatingButtonText}>☰</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80, // Más margin-bottom (antes era 30)
    right: 20,
    alignItems: "center",
    zIndex: 1000,
  },
  optionsContainer: {
    marginBottom: 15,
    alignItems: "center",
    gap: 10,
  },
  optionButton: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  floatingButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
});
