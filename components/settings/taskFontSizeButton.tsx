import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import useFontSettingsStore, { FONT_SIZES, FontSizeKey } from "@/stores/font-settings-store";
import React, { useState } from "react";
import { FlatList, Modal, StyleSheet, TouchableOpacity } from "react-native";

export default function TaskFontSizeButton() {
  const { taskFontSize, setTaskFontSize } = useFontSettingsStore();
  const [modalVisible, setModalVisible] = useState(false);

  const handleFontSizeChange = (size: FontSizeKey) => {
    setTaskFontSize(size);
    setModalVisible(false);
  };

  const renderFontSizeOption = ({ item }: { item: FontSizeKey }) => {
    const isSelected = taskFontSize === item;
    return (
      <TouchableOpacity
        style={[
          styles.optionButton,
          isSelected && styles.selectedOption
        ]}
        onPress={() => handleFontSizeChange(item)}
      >
        <ThemedText style={[
          styles.optionText,
          isSelected && styles.selectedOptionText
        ]}>
          {FONT_SIZES[item].label}
        </ThemedText>
        <ThemedText style={[
          styles.previewText,
          { fontSize: 14 * FONT_SIZES[item].multiplier },
          isSelected && styles.selectedOptionText
        ]}>
          Ejemplo de tarea
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
            Tamaño de fuente de tareas
          </ThemedText>
          <ThemedText style={styles.buttonSubtitle}>
            Actual: {FONT_SIZES[taskFontSize].label}
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
              Seleccionar tamaño de fuente
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
              <ThemedText style={styles.closeButtonText}>
                Cerrar
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  mainButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonContent: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  buttonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
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
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsList: {
    width: '100%',
    maxHeight: 300,
  },
  optionButton: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  previewText: {
    fontStyle: 'italic',
    opacity: 0.8,
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
});
