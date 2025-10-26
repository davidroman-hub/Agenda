import React from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createSamplePastTasks, clearAllTasks } from '@/utils/sample-tasks';

export default function DevToolsButton() {
  const handleDevToolsPress = () => {
    Alert.alert(
      '🛠️ Herramientas de Desarrollo',
      'Opciones para probar la funcionalidad de tareas pasadas',
      [
        {
          text: 'Crear Tareas de Prueba',
          onPress: () => {
            createSamplePastTasks()
              .then(() => {
                Alert.alert(
                  '✅ Completado',
                  'Se han creado tareas de prueba en fechas pasadas. Ve a la pestaña "Tareas Pasadas" para verlas.'
                );
              })
              .catch(() => {
                Alert.alert('❌ Error', 'No se pudieron crear las tareas de prueba');
              });
          },
        },
        {
          text: 'Limpiar Todas las Tareas',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '⚠️ Confirmar',
              '¿Estás seguro de que quieres eliminar TODAS las tareas? Esta acción no se puede deshacer.',
              [
                {
                  text: 'Cancelar',
                  style: 'cancel',
                },
                {
                  text: 'Eliminar Todo',
                  style: 'destructive',
                  onPress: () => {
                    clearAllTasks();
                    Alert.alert('🗑️ Completado', 'Todas las tareas han sido eliminadas');
                  },
                },
              ]
            );
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleDevToolsPress}>
        <ThemedText style={styles.buttonText}>
          🛠️ Herramientas de Desarrollo
        </ThemedText>
        <ThemedText style={styles.buttonSubtext}>
          Crear tareas de prueba o limpiar datos
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  buttonSubtext: {
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
  },
});
