# Sistema de Notificaciones para Recordatorios de Tareas

## Funcionalidades Implementadas

### 1. Servicio de Notificaciones (`notification-service.ts`)
- **Singleton Pattern**: Una sola instancia del servicio en toda la app
- **Programación de Notificaciones**: Permite programar notificaciones locales para recordatorios de tareas
- **Gestión de Permisos**: Solicita automáticamente permisos de notificaciones
- **Cancelación**: Puede cancelar notificaciones individuales o todas a la vez
- **Compatibilidad Multiplataforma**: Funciona en iOS y Android con configuraciones específicas

### 2. Store de Tareas Actualizado (`agenda-tasks-store.ts`)
- **Campo de Recordatorio**: Añadido campo `reminder` a la interfaz `AgendaTask`
- **ID de Notificación**: Campo `notificationId` para rastrear notificaciones programadas
- **Funciones Async**: `addTask`, `updateTask`, y `deleteTask` ahora manejan notificaciones automáticamente
- **Persistencia**: Los recordatorios se guardan con MMKV

### 3. Componente TaskReminder (`TaskReminder.tsx`)
- **DateTimePicker Nativo**: Usa `@react-native-community/datetimepicker`
- **Formato Español**: Muestra fechas y horas en español
- **UX Optimizada**: Diseño similar a MUI mobile variant
- **Validaciones**: No permite fechas pasadas ni después de la fecha de la tarea

### 4. Hook de Notificaciones (`use-notifications.ts`)
- **Inicialización Automática**: Se ejecuta al inicio de la app
- **Listeners**: Maneja notificaciones recibidas y tocadas por el usuario
- **Funciones Auxiliares**: Proporciona acceso a funciones del servicio

### 5. Pantalla de Configuración (`NotificationSettings.tsx`)
- **Lista de Notificaciones**: Muestra todas las notificaciones programadas
- **Notificación de Prueba**: Botón para enviar una notificación en 5 segundos
- **Gestión Individual**: Cancelar notificaciones específicas
- **Cancelar Todas**: Botón para limpiar todas las notificaciones

## Cómo Usar el Sistema

### Para el Usuario:
1. **Crear Tarea con Recordatorio**:
   - Abrir una tarea nueva o existente
   - Activar el toggle "Recordatorio"
   - Seleccionar fecha y hora
   - Guardar la tarea

2. **Gestionar Notificaciones**:
   - Tocar el botón 🔔 flotante en la pantalla principal
   - Ver todas las notificaciones programadas
   - Cancelar o probar notificaciones

3. **Recibir Notificaciones**:
   - Las notificaciones aparecen a la hora programada
   - Tocar la notificación puede llevar a la tarea (funcionalidad futura)
   - Se muestran incluso si la app está cerrada

### Para Desarrolladores:
```typescript
// Programar notificación manualmente
const notificationId = await notificationService.scheduleTaskReminder(
  'task-id',
  'Título de la tarea',
  'Descripción',
  new Date('2024-12-25T10:00:00'),
  '2024-12-25'
);

// Cancelar notificación
await notificationService.cancelTaskReminder('task-id');

// Obtener todas las notificaciones programadas
const scheduled = await notificationService.getScheduledNotifications();
```

## Características Técnicas

### Permisos y Configuración:
- **iOS**: Permisos automáticos solicitados al usuario
- **Android**: Canal de notificación "task-reminders" configurado
- **Expo Go**: Compatible sin necesidad de build nativo

### Persistencia:
- **MMKV**: Almacenamiento rápido y eficiente
- **Zustand**: Estado reactivo sincronizado
- **Notificaciones**: Programadas en el sistema operativo

### Validaciones:
- No permite recordatorios en fechas pasadas
- No permite recordatorios después de la fecha de la tarea
- Cancela automáticamente notificaciones al eliminar tareas
- Actualiza notificaciones al cambiar recordatorios

## Próximas Mejoras Sugeridas

1. **Navegación desde Notificaciones**: Al tocar una notificación, navegar directamente a la tarea
2. **Recordatorios Múltiples**: Permitir varios recordatorios por tarea
3. **Notificaciones Recursivas**: Para tareas que se repiten
4. **Configuración de Sonidos**: Permitir seleccionar diferentes sonidos
5. **Widgets de Sistema**: Mostrar próximos recordatorios en widgets nativos

## Comandos de Prueba

```bash
# Instalar dependencias
npx expo install expo-notifications expo-device expo-constants

# Verificar permisos
# (Usar la pantalla de configuración en la app)

# Probar notificación
# (Usar el botón "Enviar notificación de prueba")
```

## Archivos Principales

- `/services/notifications/notification-service.ts` - Lógica principal de notificaciones
- `/stores/agenda-tasks-store.ts` - Store con integración de notificaciones
- `/components/agendaComponents/bookFragments/TaskReminder.tsx` - Componente de UI
- `/hooks/use-notifications.ts` - Hook de inicialización
- `/components/agendaComponents/NotificationSettings.tsx` - Pantalla de configuración
- `/app.json` - Configuración de plugins y permisos
