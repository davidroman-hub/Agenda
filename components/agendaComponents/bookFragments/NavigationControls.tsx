import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React from "react";
import { TouchableOpacity } from "react-native";
import { styles } from "../bookStyles";

interface NavigationControlsProps {
  readonly currentPageIndex: number;
  readonly daysToShow: number;
  readonly viewMode: string;
  readonly dynamicStyles: any;
  readonly goToPrevPage: () => void;
  readonly goToNextPage: () => void;
  readonly tCommon: (key: string, options?: any) => string;
}

export default function NavigationControls({
  currentPageIndex,
  daysToShow,
  viewMode,
  dynamicStyles,
  goToPrevPage,
  goToNextPage,
  tCommon,
}: NavigationControlsProps) {
  return (
    <ThemedView style={dynamicStyles.navigationControls}>
      <TouchableOpacity
        style={[
          styles.navButton,
          currentPageIndex === 0 && styles.navButtonDisabled,
        ]}
        onPress={goToPrevPage}
        disabled={currentPageIndex === 0}
      >
        <ThemedText style={styles.navButtonText}>
          ← {tCommon("general.previous")}
        </ThemedText>
      </TouchableOpacity>

      <ThemedView style={styles.pageIndicatorContainer}>
        <ThemedText style={styles.pageIndicator}>
          {tCommon("general.page")} {currentPageIndex + 1}
        </ThemedText>
        <ThemedText style={styles.modeIndicator}>
          {(() => {
            if (viewMode === "expanded") return `6 ${tCommon("general.days")}`;
            if (viewMode === "single") return `1 ${tCommon("general.day")}`;
            return `${daysToShow} ${tCommon("general.days")}`;
          })()}
        </ThemedText>
      </ThemedView>

      <TouchableOpacity style={styles.navButton} onPress={goToNextPage}>
        <ThemedText style={styles.navButtonText}>{`${tCommon(
          "general.next"
        )} →`}</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}
