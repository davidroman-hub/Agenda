import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useState } from 'react';
import { Modal, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

export type RepeatOption = 'none' | 'daily' | 'weekly' | 'monthly';

interface TaskRepeatProps {
  readonly repeatOption?: RepeatOption;
  readonly onRepeatChange: (option: RepeatOption) => void;
  readonly isEnabled?: boolean;
  readonly onToggleEnabled: (enabled: boolean) => void;
}

export default function TaskRepeat({
  repeatOption = 'none',
  onRepeatChange,
  isEnabled = false,
  onToggleEnabled,
}: TaskRepeatProps) {
  const [showOptions, setShowOptions] = useState(false);

  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  const repeatOptions: { value: RepeatOption; label: string; emoji: string }[] = [
    { value: 'daily', label: 'Diariamente', emoji: '📅' },
    { value: 'weekly', label: 'Semanalmente', emoji: '📆' },
    { value: 'monthly', label: 'Mensualmente', emoji: '🗓️' },
  ];

  const getRepeatLabel = (option: RepeatOption) => {
    const found = repeatOptions.find(opt => opt.value === option);
    return found ? `${found.emoji} ${found.label}` : 'Seleccionar frecuencia';
  };

  const handleRepeatSelect = (option: RepeatOption) => {
    onRepeatChange(option);
    setShowOptions(false);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header con toggle */}
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Repetir tarea
        </ThemedText>
        <Switch
          value={isEnabled}
          onValueChange={onToggleEnabled}
          trackColor={{ false: '#767577', true: tintColor + '50' }}
          thumbColor={isEnabled ? tintColor : '#f4f3f4'}
        />
      </View>

      {isEnabled && (
        <View style={styles.optionsContainer}>
          {/* Botón para seleccionar frecuencia */}
          <TouchableOpacity
            style={[
              styles.selectButton,
              { backgroundColor: backgroundColor, borderColor: tintColor }
            ]}
            onPress={() => setShowOptions(true)}
          >
            <ThemedText style={[styles.selectText, { color: tintColor }]}>
              {repeatOption === 'none' ? 'Seleccionar frecuencia' : getRepeatLabel(repeatOption)}
            </ThemedText>
          </TouchableOpacity>

          {/* Modal con opciones */}
          <Modal
            visible={showOptions}
            transparent
            animationType="fade"
            onRequestClose={() => setShowOptions(false)}
          >
            <View style={styles.modalOverlay}>
              <ThemedView style={[styles.modalContainer, { backgroundColor }]}>
                <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                  Frecuencia de repetición
                </ThemedText>

                {repeatOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      repeatOption === option.value && { backgroundColor: tintColor + '20' }
                    ]}
                    onPress={() => handleRepeatSelect(option.value)}
                  >
                    <ThemedText style={[styles.optionText, { color: textColor }]}>
                      {option.emoji} {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowOptions(false)}
                >
                  <ThemedText style={[styles.cancelText, { color: '#666' }]}>
                    Cancelar
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </View>
          </Modal>

          {/* Mostrar selección actual */}
          {repeatOption !== 'none' && (
            <View style={styles.selectedOption}>
              <ThemedText style={[styles.selectedText, { color: textColor }]}>
                {getRepeatLabel(repeatOption)}
              </ThemedText>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRepeatChange('none')}
              >
                <ThemedText style={[styles.removeText, { color: '#ff4444' }]}>
                  Quitar repetición
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionsContainer: {
    marginTop: 8,
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedOption: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
