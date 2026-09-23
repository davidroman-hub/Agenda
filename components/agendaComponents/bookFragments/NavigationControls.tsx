import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getPageNumber } from "@/utils/book-navigation";
import React from "react";
import { TouchableOpacity } from "react-native";
import { styles } from "../bookStyles";

interface NavigationControlsProps {
  readonly currentPageIndex: number;
  readonly daysToShow: number;
  readonly columns: number;
  readonly dynamicStyles: any;
  readonly goToPrevPage: () => void;
  readonly goToNextPage: () => void;
  readonly goToToday: () => void;
  readonly tCommon: (key: string, options?: any) => string;
}

export default function NavigationControls({
  currentPageIndex,
  daysToShow,
  columns,
  dynamicStyles,
  goToPrevPage,
  goToNextPage,
  goToToday,
  tCommon,
}: NavigationControlsProps) {
  return (
    <ThemedView style={dynamicStyles.navigationControls}>
      <TouchableOpacity style={dynamicStyles.navButton} onPress={goToPrevPage}>
        <ThemedText style={dynamicStyles.navButtonText}>
          ← {tCommon("general.previous")}
        </ThemedText>
      </TouchableOpacity>

      <ThemedView style={styles.pageIndicatorContainer}>
        {/* Fuera de la página de hoy, pulsar el indicador vuelve a hoy */}
        <TouchableOpacity
          style={styles.pageIndicatorContainer}
          onPress={goToToday}
          disabled={currentPageIndex === 0}
        >
          <ThemedText style={styles.pageIndicator}>
            {tCommon("general.page")} {getPageNumber(currentPageIndex)}
          </ThemedText>
          <ThemedText style={styles.modeIndicator}>
            {(() => {
              if (currentPageIndex !== 0) return `↩ ${tCommon("general.today")}`;
              return `${daysToShow} ${tCommon("general.days")}`;
            })()}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <TouchableOpacity style={dynamicStyles.navButton} onPress={goToNextPage}>
        <ThemedText style={dynamicStyles.navButtonText}>{`${tCommon(
          "general.next"
        )} →`}</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}
