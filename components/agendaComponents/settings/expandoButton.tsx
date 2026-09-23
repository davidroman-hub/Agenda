import { useI18n } from "@/hooks/use-i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import useBookSettingsStore, {
  COLUMN_OPTIONS,
  DAYS_OPTIONS,
} from "@/stores/boook-settings";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  const accent = useThemeColor({}, "accent");
  const onAccent = useThemeColor({}, "onAccent");

  const { setDaysToShow, daysToShow, setColumns, columns } =
    useBookSettingsStore();
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
        <View style={[styles.optionsContainer, { backgroundColor: accent }]}>
          {/* Días por hoja */}
          <View style={styles.optionsRow}>
            <MaterialCommunityIcons
              name="calendar-week"
              size={22}
              color={onAccent}
            />
            {DAYS_OPTIONS.map((days) => (
              <TouchableOpacity
                key={days}
                accessibilityRole="button"
                accessibilityLabel={`${days} ${tCommon("general.days")}`}
                style={[
                  styles.optionButton,
                  days === daysToShow && { backgroundColor: onAccent },
                ]}
                onPress={() => {
                  setDaysToShow(days);
                  setIsExpanded(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: days === daysToShow ? accent : onAccent },
                  ]}
                >
                  {days}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Páginas una junto a otra */}
          <View style={styles.optionsRow}>
            <MaterialCommunityIcons
              name="book-open-page-variant-outline"
              size={22}
              color={onAccent}
            />
            {COLUMN_OPTIONS.map((count) => {
              const active = count === columns;
              const color = active ? accent : onAccent;
              return (
                <TouchableOpacity
                  key={count}
                  accessibilityRole="button"
                  accessibilityLabel={`${count}`}
                  style={[
                    styles.optionButton,
                    active && { backgroundColor: onAccent },
                  ]}
                  onPress={() => {
                    setColumns(count);
                    setIsExpanded(false);
                  }}
                >
                  {/* Una barra por página que se ve a la vez */}
                  <View style={styles.columnsGlyph}>
                    {Array.from({ length: count }, (_, i) => (
                      <View
                        key={i}
                        style={[styles.columnBar, { borderColor: color }]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.columnCount, { color }]}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      <TouchableOpacity
        disabled={scrollProgress > 0.153104}
        style={[styles.floatingButton, { backgroundColor: accent }]}
        onPress={handlePress}
      >
        <Text style={[styles.floatingButtonText, { color: onAccent }]}>☰</Text>
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
    padding: 10,
    borderRadius: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionButton: {
    width: 44,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  columnsGlyph: {
    flexDirection: "row",
    gap: 2,
  },
  columnBar: {
    width: 5,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 1.5,
  },
  columnCount: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    fontSize: 24,
    fontWeight: "bold",
  },
});
