# Changelog

**v1.10.0** - 2026-09-21
- ✨ ADD **Copia de seguridad** para pasar la agenda a otro móvil: en Ajustes → "Copia de seguridad" → "Crear copia" se elige una contraseña (mínimo 8 caracteres, escrita dos veces) y se genera un archivo cifrado (`justAnAgenda-backup-AAAA-MM-DD.json`, scrypt + AES-256-GCM) que se comparte con la hoja del sistema (Archivos, Drive, correo, AirDrop…). En el móvil nuevo, "Restaurar copia": se elige el archivo, se escribe la contraseña y, tras confirmar, **reemplaza** los datos del móvil (no los fusiona). Incluye tareas, notas, repeticiones, tipos y ajustes de vista (tema, tamaño de letra y libro). **No** incluye los archivos adjuntos (pesan demasiado): las tareas y notas viajan sin ellos, y las notas que solo tenían archivos se omiten y la pantalla lo avisa. Tampoco la sesión, la versión, el idioma ni las alarmas exactas. Sin cuentas ni servidores: el archivo solo va adonde tú lo mandes y la contraseña no se guarda en ningún sitio, así que si se olvida la copia no se puede recuperar. Los recordatorios no viajan con la copia: al restaurar se vuelven a programar los que aún no han pasado (y se renuevan los de tareas repetidas). Una contraseña equivocada, un archivo que no es una copia, uno manipulado o uno de una versión más nueva no tocan nada de lo que ya hay. Requiere una compilación nueva (módulo nativo `expo-crypto`; con una anterior la app funciona y solo falla la copia). Dependencias nuevas: `@noble/ciphers`, `@noble/hashes` y `expo-crypto`. Política de privacidad actualizada en los 4 idiomas (copias de seguridad, cifrado y compartir)
- ✨ ADD **Tipos de tarea** dinámicos: creas tipos (nombre y color) desde el calendario (🏷️ Tipos), desde Ajustes o con el ＋ de las pestañas, y aparece una pestaña por tipo encima del libro. La pestaña activa filtra el libro, el calendario, el detalle del día y las tareas pasadas (con sus estadísticas); el filtro es solo visual y nunca cambia qué líneas están ocupadas, así que no puede pisar tareas ocultas. Al crear una tarea se elige su tipo (por defecto el de la pestaña activa); las tareas antiguas no tienen tipo y, si las editas, se te pide elegir uno o "Sin tipo" al guardar. Al borrar un tipo sus tareas pasan a "Sin tipo" (no se borran). Las tareas repetidas heredan el tipo
- ✨ ADD **Archivos adjuntos** en las tareas (PDF, imágenes, documentos…): en el editor de la tarea, "Adjuntar archivo" abre el selector de archivos del sistema (hasta 5 por tarea y 25 MB cada uno). Las imágenes se ven dentro de la app; los PDF y demás se abren con la app del sistema que sepa leerlos, o se pueden compartir. Se guarda una copia en el almacenamiento privado de la app (el original no se toca) y no hace falta ningún permiso nuevo. Las tareas con archivo muestran 📎 en el libro y en el calendario, y las repetidas lo heredan. Al quitar un adjunto o borrar la tarea se borra su archivo (salvo que otra tarea lo use), y al arrancar se limpian los restos de borradores sin guardar. Los adjuntos no entran en la copia de seguridad de Google (tiene un tope de ~25 MB y, si se pasa, falla entera con las tareas incluidas), así que tras restaurar un teléfono el archivo puede faltar y la app lo avisa; en el traspaso directo a otro móvil sí viajan. Requiere una compilación nueva (módulos nativos nuevos: expo-document-picker, expo-sharing, expo-intent-launcher); con una compilación anterior la app funciona y solo avisa de que adjuntar necesita la última versión. Política de privacidad actualizada en los 4 idiomas
- ✨ ADD **Notas**: una sección por defecto, con su pestaña fija "📝 Notas" a la derecha de la tira de pestañas (la tira ahora se ve siempre; sin tipos creados muestra "Agenda" y "Notas"). Cada nota es un post-it de color (amarillo, naranja, rosa, verde, menta o azul), con su chincheta y una ligera inclinación, sobre un tablero de corcho con marco de madera que se reparte en 2 columnas en móvil y más en tablet. Se pueden adjuntar archivos e imágenes a cada nota (los mismos que en las tareas: hasta 5 y 25 MB cada uno), y la primera imagen se ve como vista previa en el post-it. Las notas **no son tareas**: tienen su propio almacenamiento y no aparecen en el libro, el calendario, las tareas pasadas ni los filtros por tipo (y tienen su propio widget). Al borrar una nota se borran sus archivos (salvo que otro elemento los use). La limpieza de adjuntos huérfanos de arranque ahora cuenta también los de las notas y espera a que carguen tareas y notas antes de tocar nada. Si tocas una notificación estando en Notas, la app vuelve a la agenda y abre la tarea. Política de privacidad actualizada en los 4 idiomas
- ✨ ADD **Vista de año**: junto a "Notas", la tira de pestañas tiene ahora un conmutador 📖 Libro / 🗓️ Año. La vista de año enseña el calendario con los doce meses (cada día con tareas lleva una marca azul, verde si están todas hechas, y hoy va resaltado) y, al lado, las tareas de lo que elijas: pulsa un día, un mes o el año entero. En el móvil el calendario va arriba y las tareas debajo; en pantallas anchas se dibujan como las dos páginas de un libro abierto, con el lomo de aros en medio. En la lista del año entero las tareas que se repiten no salen una vez por cada ocurrencia (una diaria serían 365 filas): salen aparte, en "Se repiten", con su regla y cuántas veces caen ese año; en un mes o un día sí salen todas. Se pueden marcar como hechas desde la lista, y al pulsar una tarea el libro se abre en ese día y la abre. Respeta el filtro por tipo de las pestañas. Flechas para cambiar de año, botón "Hoy", y al volver del libro la vista se queda donde estaba. Botón **↔ Horizontal** en la cabecera del año: fuerza la pantalla en horizontal (aunque tengas el giro automático apagado) y oculta la barra de pestañas de abajo para ganar altura; el mismo botón pasa a **↕ Vertical**. Al volver al libro, ir a las notas o tocar una notificación, la pantalla vuelve a como estaba (vertical), y lo pedido se recuerda para la próxima vez que abras el año. Solo sale en Android y en iPad (el proyecto de iPhone solo admite vertical). Requiere una compilación nueva (módulo nativo `expo-screen-orientation`, sin permisos); con una anterior el botón simplemente no aparece. Por dentro, la reconstrucción de "qué tareas hay en un día" se separó en crear el contexto una vez y construir cada día, así que el año entero se calcula con el mismo código que el libro sin recorrer todas las tareas 365 veces. Sin cambios en la política de privacidad: no guarda ni pide nada nuevo
- ✨ ADD **Reordenar notas arrastrando**: en Notas, mantén pulsado un post-it (un instante) y llévalo a otro sitio; la nota sobre la que estás se atenúa y, al soltar, se queda en su lugar y las demás se recolocan. Cerca de los bordes el tablero se desplaza solo. El orden se guarda (y va en las copias de seguridad) y el widget de notas lo sigue; una nota nueva sigue apareciendo la primera. Tocar un post-it sigue abriéndolo, y las notas que pide el widget se abren por su id, estén donde estén
- ✨ ADD **Widgets de Android** (el de tareas había desaparecido al borrarse su código nativo; ahora están en Kotlin). **Agenda de hoy**: un post-it que flota, con flechas ‹ › para mirar ayer y los próximos días (tocar el título vuelve a hoy), la hora del recordatorio, el color del tipo de cada tarea en su casilla, las completadas tachadas y un botón ＋ que abre una tarea nueva en ese día; al tocar una tarea se abre esa tarea. **Tablero de notas**: el corcho de la app con marco de madera y las últimas notas clavadas con su chincheta e inclinación, y un botón ＋ para una nota nueva; al tocar una nota se abre. Ambos siguen el idioma del sistema, se adaptan a su tamaño y pasan solos al día nuevo a medianoche (y tras reiniciar el móvil o cambiar la hora) sin abrir la app; si la app lleva más de una semana sin abrirse, piden abrirla en vez de enseñar tareas de otro día. La política de privacidad los menciona en los 4 idiomas
- 🐛 FIX Fechas calculadas en UTC en vez de hora local: el widget mostraba las tareas de mañana por la tarde-noche, el chequeo diario de notificaciones repetidas se saltaba la mañana siguiente, y los marcadores del calendario, las cabeceras y los filtros de "Tareas pasadas" se desplazaban un día según la zona horaria
- 🐛 FIX "Cada 2/3/5 días" daba días distintos en el libro y en las notificaciones; ahora hay una única regla en `utils/repeat-utils.ts`
- 🐛 FIX Repetición mensual desde el día 1 no aparecía algunos meses en zonas UTC-
- 🐛 FIX El aviso "nueva versión instalada" nunca se mostraba (la versión estaba fija en 1.4.0). Ahora usa la de app.json, está traducido a los 4 idiomas y "Ver cambios" enseña los cambios reales de esa versión; una instalación nueva ya no recibe un aviso falso de actualización
- 🔧 IMPROVE La lógica de "qué tareas hay en un día" (incluidas las instancias de tareas repetidas) vive en un único sitio, `utils/day-tasks.ts`, y la usan el libro, el calendario, el detalle del día y el widget; se eliminaron los parches de refresco (`forceRefresh`, `refreshKey`)
- ✨ ADD Al borrar una ocurrencia de una tarea repetida se puede elegir entre **solo esta**, **esta y las siguientes** o **toda la serie** (antes se borraba siempre la serie entera). También disponible desde el detalle del día, donde las repetidas no se podían borrar; borrar la tarea original de una serie pide confirmación porque elimina toda la serie. Si tras borrar la serie ya no se repite nunca más, la tarea vuelve a ser una tarea normal, y los avisos ya programados de lo borrado se cancelan
- ✨ ADD Al tocar una notificación de una tarea (recordatorio normal o aviso de una tarea repetida) la app se abre en el día de esa tarea y la abre; también si la app estaba cerrada
- ✨ ADD El libro ya puede ir hacia atrás desde hoy (antes el botón "Anterior" quedaba desactivado en la primera página). Las páginas anteriores se numeran -1, -2… y, fuera de hoy, pulsar el indicador de página vuelve a hoy
- ✨ ADD Alarmas exactas en Android 14+: al guardar el primer recordatorio se explica, una sola vez, que hay que activar "Alarmas y recordatorios" para que suene a su hora, y hay un botón permanente en Ajustes que abre esa pantalla. La app no puede saber si ya está concedido, por eso no insiste
- 🐛 FIX Los textos de las notificaciones (recordatorio, tarea repetida, "Tarea programada para" y el nombre del canal de Android) salían siempre en español; ahora están traducidos a los 4 idiomas y los avisos ya programados se reescriben si cambias de idioma
- 🐛 FIX Colores inválidos (`#rgb(255, 215, 0)`) en el calendario: el punto de las tareas repetidas y el borde de su tarjeta no se veían
- 🐛 FIX Las notificaciones de las tareas repetidas solo se programaban si abrías la app ese día, así que no sonaban si no la abrías. Ahora se programan los próximos 14 días por adelantado y se renuevan al abrir la app, al volver a ella y cada vez que cambian las tareas (se respetan las fechas saltadas, el fin de la serie y las ocurrencias ya completadas, y se ajusta al límite de 64 avisos pendientes de iOS)
- 🐛 FIX El número de líneas por página estaba fijo a 12 en el store aunque el ajuste permita de 6 a 15: el añadir rápido desde el calendario podía guardar una tarea en una línea que la página no dibuja (línea 7 con 6 líneas) y con 15 líneas no ofrecía las 13 a 15
- 🐛 FIX Al bajar las líneas por página (p. ej. de 12 a 6) las tareas escritas en las líneas más bajas dejaban de verse en el libro; ahora la página crece hasta la última línea con tarea
- 🔧 IMPROVE Permisos de Android reducidos a los necesarios (se bloquean `SYSTEM_ALERT_WINDOW`, almacenamiento externo, calendario y política de notificaciones) y eliminada la dependencia `expo-calendar`, que no se usaba
- 🔧 IMPROVE Política de privacidad reescrita para reflejar lo que la app hace realmente (incluido el envío opcional de reportes de bug)
- 🔧 IMPROVE Política de privacidad multilingüe (`privacy-policy-multilang.html`, en los 4 idiomas) actualizada con lo que hace la app hoy: sin widget, avisos de repetidas programados por adelantado, alarmas exactas, versión guardada, copias de seguridad de Android, Google Play y el servicio que recibe los reportes de bug (Formspree). Tests que la mantienen alineada con la app (mismo contenido en los 4 idiomas, correo de contacto, proveedor de reportes y widget)
- 🔧 IMPROVE Versión alineada en app.json, package.json y build.gradle (`npm run version:sync`)
- ✨ ADD Tests con Jest (fechas, repeticiones, tareas del día, configuración nativa) y CI en GitHub Actions

**v1.9.0** - 2025-11-11
- ✨ ADD Crear tareas directamente desde el calendario (QuickAddTaskButton)
- ✨ ADD Las líneas extra cuentan como líneas disponibles (total = líneas por página + líneas extra)
- ✨ ADD Botón flotante que se reduce y se oculta al hacer scroll, y cierra el menú automáticamente
- 🔧 IMPROVE Las tareas repetidas originales conservan su estado de completado en su día de creación
- 🔧 IMPROVE Mejor generación y filtrado de tareas virtuales, y menos re-renders
- 🐛 FIX Modificar el patrón de repetición duplicaba tareas virtuales; ahora actualiza el patrón existente
- 🐛 FIX Tareas creadas desde el calendario no aparecían en el libro
- 🐛 FIX Las tareas se guardaban un día antes de la fecha seleccionada (conversión de fecha local)

**v1.8.1** - 2025-11-03
- ✨ ADD Widget de Android con soporte para 5 idiomas, detección automática del idioma y fechas con formato regional
- 🐛 FIX El widget no mostraba tareas repetidas cuando no había tareas normales
- 🔧 IMPROVE El widget usa la misma lógica de tareas que el calendario y evita duplicados

**v1.8.0** - 2025-11-03
- ✨ ADD App en 4 idiomas (español, inglés, italiano y francés) con detección automática del idioma del dispositivo
- ✨ ADD Calendario localizado (nombres de meses y días) e i18next con namespaces
- 🔧 IMPROVE En las tareas repetidas, la original se queda en su línea de creación y no se borra por accidente

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