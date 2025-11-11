import { useI18n } from "@/hooks/use-i18n";
import useBookSettingsStore from "@/stores/boook-settings";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ExpandoButtonProps {
  scrollProgress?: number; // 0 = top, 1 = bottom
  isAtBottom?: boolean;
}

export default function ExpandoButton({
  scrollProgress = 0,
  isAtBottom = false,
}: ExpandoButtonProps) {
  const { tCommon } = useI18n();

  console.group("ExpandoButton Render", scrollProgress);
  const { setDaysToShow, daysToShow, setViewMode } = useBookSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Animaciones
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Efecto para animar el botón basado en el scroll
  useEffect(() => {
    if (isAtBottom) {
      // Al llegar al fondo, hacer que desaparezca
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Cuando no está en el fondo, calcular la escala basada en scrollProgress
      const targetScale = Math.max(0.3, 1 - scrollProgress * 0.7);
      const targetOpacity = Math.max(0.3, 1 - scrollProgress * 0.7);

      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: targetScale,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: targetOpacity,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [scrollProgress, isAtBottom, scaleAnim, opacityAnim]);

  // Efecto para cerrar el botón cuando se hace muy pequeño
  useEffect(() => {
    if (scrollProgress > 0.153104 && isExpanded) {
      setIsExpanded(false);
    }
  }, [scrollProgress, isExpanded]);

  const handlePress = () => {
    setIsExpanded(!isExpanded);
  };

  const optiones = [
    {
      id: 1,
      label:
        daysToShow === 6
          ? `3 ${tCommon("general.days")}`
          : `6 ${tCommon("general.days")}`,
    },
    { id: 2, label: "•  •\n•  •\n•  •" },
    { id: 3, label: "•" },
  ];

  const manageOptions = (optionId: number) => {
    if (optionId === 1) {
      const newDays = daysToShow === 6 ? 3 : 6;
      setDaysToShow(newDays);
    } else if (optionId === 2) {
      setViewMode("expanded");
    } else if (optionId === 3) {
      setViewMode("single");
    }
    setIsExpanded(false);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
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
      <TouchableOpacity
        disabled={scrollProgress > 0.153104}
        style={styles.floatingButton}
        onPress={handlePress}
      >
        <Text style={styles.floatingButtonText}>☰</Text>
      </TouchableOpacity>
    </Animated.View>
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
