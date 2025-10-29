# Changelog

**v1.7.0** - 2025-10-29
- ✨ ADD Enlaces clickeables en tareas: URLs automáticamente detectadas y convertidas en hipervínculos
- ✨ ADD Soporte completo para múltiples formatos de URL (https://, http://, www., dominios)
- ✨ ADD Componente LinkableText para renderizar texto con enlaces interactivos
- ✨ ADD Utilidades url-utils para detección, normalización y apertura de enlaces
- ✨ ADD ScrollView en configuración de notificaciones para mejor navegación
- ✨ ADD Límite de texto extendido para tareas (de 100 a 500 caracteres)
- ✨ ADD Sistema de migración de fechas para compatibilidad global de zonas horarias
- 🔧 IMPROVE Enlaces con estilos adaptativos para modo claro/oscuro (azul con subrayado)
- 🔧 IMPROVE Widget simplificado: solo abre la app, eliminada sincronización agresiva
- 🔧 IMPROVE Manejo de errores al abrir enlaces con alertas informativas
- 🔧 IMPROVE Altura de campo de entrada de tareas aumentada (120px → 200px)
- 🔧 IMPROVE Límites de visualización de texto aumentados (30/25 → 80/75 caracteres)
- 🔧 IMPROVE Sistema de fechas completamente compatible con todas las zonas horarias
- 🐛 FIX Widget ya no causa pérdida de datos al tocarlo
- 🐛 FIX Problemas de compilación Android en WidgetDataManagerModule y AgendaWidgetProvider
- 🐛 FIX Tareas aparecían 1 hora después del cambio de día por problemas de timezone
- 🐛 FIX Sistema de migración automática ejecuta una sola vez por instalación
- 🐛 FIX Uso correcto de dateToLocalDateString en lugar de toISOString().split('T')[0]

**v1.6.0** - 2025-10-27
- ✨ ADD Sistema automático de notificaciones para tareas repetidas con verificación diaria
- ✨ ADD Organización inteligente de tareas: sin horario arriba, con horario ordenado por tiempo abajo
- ✨ ADD Visualización de horarios en formato HH:MM (hora arriba, minutos abajo) en lugar de números de línea
- ✨ ADD Configuración de líneas por página (6, 8, 10, 12, 15) integrada en botón flotante
- ✨ ADD Panel de estadísticas y gestión manual en NotificationSettings
- ✨ ADD Activación automática del sistema al abrir la app principal
- 🔧 IMPROVE Hook useRepeatedTaskNotifications para monitoreo de estado de app
- 🔧 IMPROVE Servicio centralizado RepeatedTaskNotificationService para gestión eficiente
- 🔧 IMPROVE Formato de tiempo en 24 horas sin caracteres extra
- 🔧 IMPROVE Persistencia de configuraciones usando MMKV
- 🔧 IMPROVE Reducción de complejidad cognitiva en componentes
- 🐛 FIX Problema de zona horaria en recordatorios (programación para día correcto)
- 🐛 FIX Tareas repetidas ahora se programan para el día de repetición, no el día original
- 🐛 FIX Eliminación de duplicación de tareas en vista con patrones activos
- 🐛 FIX Organización automática respeta límites configurables de líneas por página

**v1.5.0** - 2025-10-27
- ✨ ADD Sistema completo de tareas repetidas (diarias, semanales, mensuales)
- ✨ ADD Notificaciones independientes para tareas repetidas
- ✨ ADD Estado de completado independiente para cada instancia de tarea repetida
- ✨ ADD Integración de tareas repetidas con widget Android (indicador 🔄)
- 🔧 IMPROVE Manejo mejorado de fechas y timezone en recordatorios
- 🔧 IMPROVE Prevención de duplicación de tareas al activar repetición
- 🐛 FIX Problema de date picker mostrando día anterior por defecto
- 🐛 FIX Issue con taskDate undefined para tareas nuevas
- 🐛 FIX Problemas de timezone en creación de fechas locales
- 🗑️ REMOVE Botón de testing de tareas del menú de configuración

**v1.4.0**
- ADD sistema de notificación de actualizaciones
- FIX eliminado botón debug que causaba interferencias
- ADD sistema de seguimiento de versiones
- IMPROVE optimización del widget con datos dinámicos

**v1.3.0**
- ADD widget

**v1.1.0**

- ADD font size change 
- ADD changelog

**v1.0.0**

- ADD just an agenda features as add remndires to taks,
- ADD tasks to our days