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
}

export default function NavigationControls({ 
  currentPageIndex, 
  daysToShow, 
  viewMode, 
  dynamicStyles, 
  goToPrevPage, 
  goToNextPage 
}: NavigationControlsProps) {
  
  return (
    <ThemedView style={dynamicStyles.navigationControls}>
      <TouchableOpacity 
        style={[styles.navButton, currentPageIndex === 0 && styles.navButtonDisabled]}
        onPress={goToPrevPage}
        disabled={currentPageIndex === 0}
      >
        <ThemedText style={styles.navButtonText}>← Anterior</ThemedText>
      </TouchableOpacity>
      
      <ThemedView style={styles.pageIndicatorContainer}>
        <ThemedText style={styles.pageIndicator}>
          Página {currentPageIndex + 1}
        </ThemedText>
        <ThemedText style={styles.modeIndicator}>
          {(() => {
            if (viewMode === 'expanded') return '6 días';
            if (viewMode === 'single') return '1 día';
            return `${daysToShow} días`;
          })()}
        </ThemedText>
      </ThemedView>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={goToNextPage}
      >
        <ThemedText style={styles.navButtonText}>Siguiente →</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}
