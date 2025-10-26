import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

interface FilterChipsProps {
  years: number[];
  months: number[];
  selectedYear: number | null;
  selectedMonth: number | null;
  onYearSelect: (year: number | null) => void;
  onMonthSelect: (month: number | null) => void;
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const FilterChips: React.FC<FilterChipsProps> = ({
  years,
  months,
  selectedYear,
  selectedMonth,
  onYearSelect,
  onMonthSelect,
}) => {
  const primaryColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const tintColor = useThemeColor({}, "tint");

  const getChipStyle = (isSelected: boolean) => [
    styles.chip,
    {
      backgroundColor: isSelected ? tintColor : backgroundColor,
      borderColor: isSelected ? tintColor : primaryColor,
    },
  ];

  const getChipTextStyle = (isSelected: boolean) => [
    styles.chipText,
    {
      color: isSelected ? backgroundColor : primaryColor,
      fontWeight: isSelected ? "600" : "normal" as any,
    },
  ];

  return (
    <ThemedView style={styles.filtersContainer}>
      <ThemedText style={styles.filterTitle}>Filtros</ThemedText>
      
      {/* Filtro por Año */}
      <View style={styles.filterSection}>
        <ThemedText style={styles.filterLabel}>Año</ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContainer}
        >
          <TouchableOpacity
            style={getChipStyle(selectedYear === null)}
            onPress={() => onYearSelect(null)}
          >
            <ThemedText style={getChipTextStyle(selectedYear === null)}>
              Todos
            </ThemedText>
          </TouchableOpacity>
          
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={getChipStyle(selectedYear === year)}
              onPress={() => onYearSelect(year)}
            >
              <ThemedText style={getChipTextStyle(selectedYear === year)}>
                {year}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filtro por Mes */}
      {selectedYear && (
        <View style={styles.filterSection}>
          <ThemedText style={styles.filterLabel}>Mes</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScrollContainer}
          >
            <TouchableOpacity
              style={getChipStyle(selectedMonth === null)}
              onPress={() => onMonthSelect(null)}
            >
              <ThemedText style={getChipTextStyle(selectedMonth === null)}>
                Todos
              </ThemedText>
            </TouchableOpacity>
            
            {months.map((month) => (
              <TouchableOpacity
                key={month}
                style={getChipStyle(selectedMonth === month)}
                onPress={() => onMonthSelect(month)}
              >
                <ThemedText style={getChipTextStyle(selectedMonth === month)}>
                  {monthNames[month]}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  filtersContainer: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    opacity: 0.8,
  },
  chipScrollContainer: {
    paddingRight: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
  },
});
