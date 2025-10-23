import useBookSettingsStore from "@/stores/boook-settings";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ExpandoButton() {
  const { setDaysToShow, daysToShow, setViewMode } = useBookSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const handlePress = () => {
    setIsExpanded(!isExpanded);
  };

  const optiones = [
    { id: 1, label: daysToShow === 6 ? "3 dias" : "6 dias" },
    { id: 2, label: "expandido" },
    { id: 3, label: "singular" },
  ];

  const manageOptions = (optionId: number) => {
    if (optionId === 1) {
      const newDays = daysToShow === 6 ? 3 : 6;
      setDaysToShow(newDays);
      setViewMode('normal');
    } else if (optionId === 2) {
      setDaysToShow(6);
      setViewMode('expanded');
    } else if (optionId === 3) {
      setDaysToShow(1);
      setViewMode('single');
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
    bottom: 30,
    right: 20,
    alignItems: "center",
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
