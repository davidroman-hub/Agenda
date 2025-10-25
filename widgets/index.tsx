import { AppRegistry } from 'react-native';
import AgendaWidget from './AgendaWidget';

// Registrar el widget para iOS
AppRegistry.registerComponent('AgendaWidget', () => AgendaWidget);

// Configuración del widget
export const widgetConfig = {
  kind: 'AgendaWidget',
  displayName: 'Mi Agenda',
  description: 'Muestra tus tareas del día actual',
  supportedFamilies: ['systemSmall', 'systemMedium'],
  intentConfiguration: {},
};
