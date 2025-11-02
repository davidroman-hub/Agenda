import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useI18n } from '@/hooks/use-i18n';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function TranslationTest() {
  const { 
    tCommon, 
    tAgenda, 
    changeLanguage, 
    resetToDeviceLanguage,
    currentLanguage, 
    deviceLanguage, 
    hasUserSelectedLanguage,
    userSelectedLanguage 
  } = useI18n();

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>🌍 Translation Test</ThemedText>
      
      {/* Información del dispositivo */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Device Language Info:</ThemedText>
        {deviceLanguage ? (
          <>
            <ThemedText>• Language Code: {deviceLanguage.languageCode}</ThemedText>
            <ThemedText>• Language Tag: {deviceLanguage.languageTag}</ThemedText>
            <ThemedText>• Region: {deviceLanguage.regionCode || 'N/A'}</ThemedText>
            <ThemedText>• Text Direction: {deviceLanguage.textDirection}</ThemedText>
          </>
        ) : (
          <ThemedText>• Could not detect device language</ThemedText>
        )}
      </ThemedView>
      
      {/* Información de preferencias */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Language Preferences:</ThemedText>
        <ThemedText>• User Selected: {hasUserSelectedLanguage() ? userSelectedLanguage : 'Auto (Device)'}</ThemedText>
        <ThemedText>• Current App Language: {currentLanguage}</ThemedText>
        <ThemedText>• Status: {hasUserSelectedLanguage() ? '🔒 Manual Override' : '🤖 Auto Detection'}</ThemedText>
      </ThemedView>
      
      {/* Idioma actual */}
      <ThemedText style={styles.subtitle}>
        Current App Language: {currentLanguage} {hasUserSelectedLanguage() ? '(User Selected)' : '(Auto)'}
      </ThemedText>
      
      {/* Botones para cambiar idioma */}
      <ThemedView style={styles.languageButtons}>
        <TouchableOpacity 
          style={[
            styles.languageButton,
            currentLanguage === 'es' && styles.activeLanguageButton
          ]}
          onPress={() => changeLanguage('es')}
        >
          <ThemedText style={[
            styles.languageButtonText,
            currentLanguage === 'es' && styles.activeLanguageButtonText
          ]}>
            🇪🇸 Español
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.languageButton,
            currentLanguage === 'en' && styles.activeLanguageButton
          ]}
          onPress={() => changeLanguage('en')}
        >
          <ThemedText style={[
            styles.languageButtonText,
            currentLanguage === 'en' && styles.activeLanguageButtonText
          ]}>
            🇺🇸 English
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
      
      {/* Botón para resetear a automático */}
      {hasUserSelectedLanguage() && (
        <ThemedView style={styles.resetSection}>
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetToDeviceLanguage}
          >
            <ThemedText style={styles.resetButtonText}>
              🤖 Reset to Device Language
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}
      
      {/* Ejemplos de traducciones comunes */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Common Translations:</ThemedText>
        <ThemedText>• {tCommon('buttons.save')}</ThemedText>
        <ThemedText>• {tCommon('buttons.cancel')}</ThemedText>
        <ThemedText>• {tCommon('general.today')}</ThemedText>
        <ThemedText>• {tCommon('navigation.agenda')}</ThemedText>
      </ThemedView>
      
      {/* Ejemplos de traducciones de agenda */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Agenda Translations:</ThemedText>
        <ThemedText>• {tAgenda('tasks.addTask')}</ThemedText>
        <ThemedText>• {tAgenda('tasks.noTasks')}</ThemedText>
        <ThemedText>• {tAgenda('calendar.title')}</ThemedText>
        <ThemedText>• {tAgenda('days.monday')}</ThemedText>
      </ThemedView>
      
      {/* Ejemplo de pluralización */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Pluralization Test:</ThemedText>
        <ThemedText>• {tAgenda('tasks.taskCount', { count: 1 })}</ThemedText>
        <ThemedText>• {tAgenda('tasks.taskCount', { count: 5 })}</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  languageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  languageButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  activeLanguageButton: {
    backgroundColor: '#FF6B35',
  },
  languageButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activeLanguageButtonText: {
    fontWeight: 'bold',
  },
  resetSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resetButton: {
    padding: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
