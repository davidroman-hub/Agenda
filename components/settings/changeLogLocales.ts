export const changeLogLocales = {
  en: {
    changes: `🚀 **Version 1.10.0 - Notes, Attachments, Task Types, Year View & Backups**

📝 **What's new:**
• **Notes**: a new section with colorful post-its, separate from your tasks. Each note can carry files and images
• **Attachments**: add PDFs, images and documents to tasks and notes (up to 5 per item, 25 MB each). They are stored inside the app and need no permission
• **Task types**: create your own categories with a name and a color; each type gets a tab above the book and filters the book, the calendar and past tasks
• **Year view**: all twelve months at a glance, with the tasks of a day, a month or the whole year. On Android and iPad there is a button to switch it to landscape
• **Backup**: in Settings you can create a file encrypted with a password and restore it on another phone. It includes tasks, notes, types and view settings, but not attachments. No accounts, no servers; if you forget the password, the backup can't be recovered

🔄 **Repeating tasks & reminders:**
• **Deleting a repeat**: choose between only this one, this and the following ones, or the whole series
• **Reminders ahead of time**: reminders for repeating tasks are scheduled 14 days in advance and ring even if you don't open the app
• **Tapping a notification** opens the task directly
• **Exact alarms on Android 14+**: the app explains how to turn them on, with a shortcut in Settings

📖 **Book & calendar:**
• The book can now go backwards from today (pages -1, -2…)
• Lowering the lines per page no longer hides tasks on the lowest lines

🐛 **Fixes:**
• Dates now use your local time zone: the calendar, page headers and past tasks no longer shift by a day
• "Every 2/3/5 days" now matches between the book and notifications
• Notification texts appear in your language
• The "new version installed" notice now shows the real changes

🔒 **Privacy:** the policy has been updated to cover notes, attachments and backups. Your data stays on your phone

🎯 **Version 1.9.0 - Enhanced Line Management & Smart UI**

📝 **Major Line Management Improvements:**
• **Extra Lines per Page**: Enhanced linesPerPage functionality to include extraLines in available lines calculation
• **Dynamic Line Availability**: Book pages now properly calculate totalLines = linesPerPage + extraLines for better space utilization
• **Smart Line Distribution**: Improved line management system for better task organization and user experience

🔄 **Advanced Repeating Tasks System:**
• **Duplicate Prevention**: Fixed critical issue where modifying repeat patterns created duplicate virtual tasks
• **Pattern Update Logic**: Enhanced addRepeatingPattern to detect existing patterns and update instead of creating duplicates
• **Original Task Preservation**: Original repeated tasks now properly maintain completion status in their creation day
• **Virtual Task Management**: Improved virtual task generation with better filtering and state management

📱 **Calendar Integration Fixes:**
• **Quick Task Creation**: Added ability to create tasks directly from calendar with QuickAddTaskButton integration
• **Task Visibility Enhancement**: Fixed tasks not appearing in book after creation from calendar
• **Force Refresh Mechanisms**: Added automatic state updates for better UI reactivity
• **Timezone Handling**: Resolved critical timezone issue causing tasks to save one day before selected date
• **Local Date Processing**: Implemented proper local date string conversion to prevent UTC offset issues

🎨 **Smart UI & UX Enhancements:**
• **Scroll-Responsive Floating Button**: Floating menu button now intelligently scales down and disappears based on scroll position
• **Progressive Button Animation**: Smooth animations with button reducing from 100% to 30% scale during scroll
• **Auto-Close on Scroll**: Menu automatically closes when button becomes too small (scrollProgress > 0.153104)
• **Disabled State Management**: Button becomes non-interactive when scaled down significantly

🔧 **Technical Infrastructure:**
• **Enhanced State Management**: Improved Zustand store interactions for better data consistency
• **Date Utility Improvements**: Better handling of local vs UTC date conversions throughout the app
• **Performance Optimizations**: Reduced unnecessary re-renders and improved component efficiency
• **Error Prevention**: Added validation layers to prevent common task management edge cases

� **Version 1.8.1 - Widget Translations & Repeating Tasks Fix**

📱 **New Features:**
• **5-Language Widget Support**: Android widget now fully supports Spanish, English, French, Portuguese, and Italian
• **Automatic Widget Language Detection**: Widget automatically detects system language and displays content accordingly
• **Localized Date Formatting**: Widget dates are formatted according to each language's regional standards
• **Multilingual Task Progress**: Progress indicators like "5 of 10 completed" are properly translated

🔧 **Critical Bug Fixes:**
• **Repeating Tasks Widget Recognition**: Fixed critical issue where Android widget wouldn't show repeating tasks when no normal tasks existed
• **Unified Task Logic**: Widget now uses the same proven task calculation logic as the calendar
• **Task Duplication Prevention**: Improved filtering to prevent duplicate tasks in widget display
• **Widget Data Synchronization**: Enhanced widget sync to properly handle all task scenarios

🌍 **Previous Features (v1.8.0):**
• **4-Language App Support**: Complete translation system for Spanish, English, Italian, and French
• **Automatic Language Detection**: App detects device language and sets it as default
• **Calendar Localization**: Calendar displays month and day names in selected language
• **i18next Framework**: Complete internationalization with namespace support
• **Repeating Tasks Management**: Original tasks stay in creation line, preventing accidental deletion

🎨 **UI/UX Improvements:**
• **Widget Error Messages**: All widget error states are now properly translated
• **Progress Text Formatting**: Improved readability of task completion indicators
• **Language-Specific Icons**: Added appropriate visual indicators for different task states
• **Seamless Language Switching**: Both app and widget update language without restart`,
  },
  es: {
    changes: `🚀 **Versión 1.10.0 - Notas, Adjuntos, Tipos de Tarea, Vista de Año y Copia de Seguridad**

📝 **Novedades:**
• **Notas**: una sección nueva con post-its de colores, aparte de tus tareas. Cada nota puede llevar archivos e imágenes
• **Archivos adjuntos**: añade PDF, imágenes y documentos a tareas y notas (hasta 5 por elemento y 25 MB cada uno). Se guardan dentro de la app y no hace falta ningún permiso
• **Tipos de tarea**: crea tus propias categorías con nombre y color; cada tipo tiene su pestaña encima del libro y filtra el libro, el calendario y las tareas pasadas
• **Vista de año**: los doce meses de un vistazo, con las tareas de un día, de un mes o del año entero. En Android y iPad hay un botón para ponerla en horizontal
• **Copia de seguridad**: en Ajustes puedes crear un archivo cifrado con una contraseña y restaurarlo en otro móvil. Incluye tareas, notas, tipos y ajustes de vista, pero no los archivos adjuntos. Sin cuentas ni servidores; si olvidas la contraseña, la copia no se puede recuperar

🔄 **Tareas repetidas y avisos:**
• **Borrar una repetición**: elige entre solo esta, esta y las siguientes, o toda la serie
• **Avisos por adelantado**: los de las tareas repetidas se programan con 14 días de antelación y suenan aunque no abras la app
• **Tocar una notificación** abre directamente la tarea
• **Alarmas exactas en Android 14+**: la app te explica cómo activarlas, con un acceso directo en Ajustes

📖 **Libro y calendario:**
• El libro ya puede ir hacia atrás desde hoy (páginas -1, -2…)
• Al bajar las líneas por página ya no se ocultan las tareas de las líneas más bajas

🐛 **Correcciones:**
• Las fechas usan tu zona horaria: el calendario, las cabeceras de página y las tareas pasadas ya no se desplazan un día
• «Cada 2/3/5 días» ahora coincide en el libro y en las notificaciones
• Los textos de las notificaciones salen en tu idioma
• El aviso de «nueva versión instalada» ahora enseña los cambios reales

🔒 **Privacidad:** la política se ha actualizado para incluir notas, adjuntos y copias de seguridad. Tus datos siguen en tu teléfono

🎯 **Versión 1.9.0 - Gestión Avanzada de Líneas e Interfaz Inteligente**

📝 **Mejoras Importantes en Gestión de Líneas:**
• **Líneas Extra por Página**: Funcionalidad linesPerPage mejorada para incluir líneas extra en el cálculo de líneas disponibles
• **Disponibilidad Dinámica de Líneas**: Las páginas del libro ahora calculan correctamente totalLines = linesPerPage + extraLines para mejor utilización del espacio
• **Distribución Inteligente de Líneas**: Sistema mejorado de gestión de líneas para mejor organización de tareas y experiencia de usuario

🔄 **Sistema Avanzado de Tareas Repetidas:**
• **Prevención de Duplicados**: Corregido problema crítico donde modificar patrones de repetición creaba tareas virtuales duplicadas
• **Lógica de Actualización de Patrones**: Mejorado addRepeatingPattern para detectar patrones existentes y actualizar en lugar de crear duplicados
• **Preservación de Tareas Originales**: Las tareas repetidas originales ahora mantienen correctamente el estado de completado en su día de creación
• **Gestión de Tareas Virtuales**: Mejorada la generación de tareas virtuales con mejor filtrado y gestión de estado

📱 **Correcciones de Integración del Calendario:**
• **Creación Rápida de Tareas**: Agregada capacidad de crear tareas directamente desde el calendario con integración de QuickAddTaskButton
• **Mejora de Visibilidad de Tareas**: Corregido problema donde las tareas no aparecían en el libro después de crearlas desde el calendario
• **Mecanismos de Actualización Forzada**: Agregadas actualizaciones automáticas de estado para mejor reactividad de la interfaz
• **Manejo de Zona Horaria**: Resuelto problema crítico de zona horaria que causaba que las tareas se guardaran un día antes de la fecha seleccionada
• **Procesamiento de Fecha Local**: Implementada conversión correcta de cadenas de fecha local para prevenir problemas de offset UTC

🎨 **Mejoras Inteligentes de UI y UX:**
• **Botón Flotante Responsivo al Scroll**: El botón del menú flotante ahora se reduce y desaparece inteligentemente según la posición del scroll
• **Animación Progresiva del Botón**: Animaciones suaves con el botón reduciéndose del 100% al 30% de escala durante el scroll
• **Auto-Cierre en Scroll**: El menú se cierra automáticamente cuando el botón se vuelve muy pequeño (scrollProgress > 0.153104)
• **Gestión de Estado Deshabilitado**: El botón se vuelve no interactivo cuando se reduce significativamente

🔧 **Infraestructura Técnica:**
• **Gestión de Estado Mejorada**: Mejoradas las interacciones del store Zustand para mejor consistencia de datos
• **Mejoras en Utilidades de Fecha**: Mejor manejo de conversiones de fecha local vs UTC en toda la aplicación
• **Optimizaciones de Rendimiento**: Reducidos re-renders innecesarios y mejorada la eficiencia de componentes
• **Prevención de Errores**: Agregadas capas de validación para prevenir casos límite comunes en gestión de tareas

🎯 **Versión 1.8.1 - Traducciones del Widget y Corrección de Tareas Repetidas**

📱 **Nuevas Funcionalidades:**
• **Soporte Widget 5 Idiomas**: El widget de Android ahora soporta completamente Español, Inglés, Francés, Portugués e Italiano
• **Detección Automática de Idioma del Widget**: El widget detecta automáticamente el idioma del sistema y muestra el contenido correspondiente
• **Formato de Fecha Localizado**: Las fechas del widget se formatean según los estándares regionales de cada idioma
• **Progreso de Tareas Multiidioma**: Indicadores de progreso como "5 de 10 completadas" están correctamente traducidos

🔧 **Correcciones Críticas:**
• **Reconocimiento de Tareas Repetidas en Widget**: Corregido problema crítico donde el widget de Android no mostraba tareas repetidas cuando no existían tareas normales
• **Lógica Unificada de Tareas**: El widget ahora usa la misma lógica probada de cálculo de tareas que el calendario
• **Prevención de Duplicación de Tareas**: Mejorado el filtrado para prevenir tareas duplicadas en la visualización del widget
• **Sincronización de Datos del Widget**: Mejorada la sincronización del widget para manejar adecuadamente todos los escenarios de tareas

🌍 **Funcionalidades Anteriores (v1.8.0):**
• **Soporte App 4 Idiomas**: Sistema completo de traducción para Español, Inglés, Italiano y Francés
• **Detección Automática de Idioma**: La app detecta el idioma del dispositivo y lo establece por defecto
• **Localización del Calendario**: El calendario muestra nombres de meses y días en el idioma seleccionado
• **Framework i18next**: Internacionalización completa con soporte de espacios de nombres
• **Gestión de Tareas Repetidas**: Las tareas originales permanecen en la línea de creación, evitando borrado accidental

🎨 **Mejoras de UI/UX:**
• **Mensajes de Error del Widget**: Todos los estados de error del widget están ahora correctamente traducidos
• **Formato de Texto de Progreso**: Mejorada la legibilidad de los indicadores de completado de tareas
• **Iconos Específicos por Idioma**: Agregados indicadores visuales apropiados para diferentes estados de tareas
• **Cambio de Idioma Fluido**: Tanto la app como el widget actualizan el idioma sin reiniciar`,
  },
  fr: {
    changes: `🚀 **Version 1.10.0 - Notes, Pièces jointes, Types de tâche, Vue annuelle et Sauvegarde**

📝 **Nouveautés :**
• **Notes** : une nouvelle section avec des post-it de couleur, séparée de vos tâches. Chaque note peut contenir des fichiers et des images
• **Pièces jointes** : ajoutez des PDF, images et documents aux tâches et aux notes (jusqu'à 5 par élément, 25 Mo chacun). Ils sont stockés dans l'application et ne demandent aucune autorisation
• **Types de tâche** : créez vos propres catégories avec un nom et une couleur ; chaque type a son onglet au-dessus du livre et filtre le livre, le calendrier et les tâches passées
• **Vue annuelle** : les douze mois d'un coup d'œil, avec les tâches d'un jour, d'un mois ou de l'année entière. Sur Android et iPad, un bouton permet de la passer en paysage
• **Sauvegarde** : dans les Paramètres, vous pouvez créer un fichier chiffré par mot de passe et le restaurer sur un autre téléphone. Il contient les tâches, les notes, les types et les réglages d'affichage, mais pas les pièces jointes. Ni compte ni serveur ; si vous oubliez le mot de passe, la sauvegarde est irrécupérable

🔄 **Tâches récurrentes et rappels :**
• **Supprimer une occurrence** : choisissez entre celle-ci seulement, celle-ci et les suivantes, ou toute la série
• **Rappels programmés à l'avance** : ceux des tâches récurrentes sont programmés 14 jours à l'avance et sonnent même si vous n'ouvrez pas l'application
• **Toucher une notification** ouvre directement la tâche
• **Alarmes exactes sous Android 14+** : l'application explique comment les activer, avec un raccourci dans les Paramètres

📖 **Livre et calendrier :**
• Le livre peut maintenant remonter en arrière depuis aujourd'hui (pages -1, -2…)
• Réduire le nombre de lignes par page ne masque plus les tâches des lignes les plus basses

🐛 **Corrections :**
• Les dates utilisent désormais votre fuseau horaire : le calendrier, les en-têtes de page et les tâches passées ne se décalent plus d'un jour
• « Tous les 2/3/5 jours » est maintenant identique dans le livre et dans les notifications
• Les textes des notifications s'affichent dans votre langue
• L'avis « nouvelle version installée » montre maintenant les vrais changements

🔒 **Confidentialité :** la politique a été mise à jour pour inclure les notes, les pièces jointes et les sauvegardes. Vos données restent sur votre téléphone

🎯 **Version 1.9.0 - Gestion Avancée des Lignes et Interface Intelligente**

📝 **Améliorations Majeures de Gestion des Lignes:**
• **Lignes Supplémentaires par Page**: Fonctionnalité linesPerPage améliorée pour inclure les lignes extra dans le calcul des lignes disponibles
• **Disponibilité Dynamique des Lignes**: Les pages du livre calculent maintenant correctement totalLines = linesPerPage + extraLines pour une meilleure utilisation de l'espace
• **Distribution Intelligente des Lignes**: Système amélioré de gestion des lignes pour une meilleure organisation des tâches et expérience utilisateur

🔄 **Système Avancé de Tâches Répétitives:**
• **Prévention des Doublons**: Corrigé le problème critique où modifier les motifs de répétition créait des tâches virtuelles dupliquées
• **Logique de Mise à Jour des Motifs**: Amélioré addRepeatingPattern pour détecter les motifs existants et mettre à jour au lieu de créer des doublons
• **Préservation des Tâches Originales**: Les tâches répétitives originales maintiennent maintenant correctement l'état d'achèvement dans leur jour de création
• **Gestion des Tâches Virtuelles**: Améliorée la génération de tâches virtuelles avec un meilleur filtrage et gestion d'état

📱 **Corrections d'Intégration du Calendrier:**
• **Création Rapide de Tâches**: Ajoutée la capacité de créer des tâches directement depuis le calendrier avec intégration QuickAddTaskButton
• **Amélioration de Visibilité des Tâches**: Corrigé le problème où les tâches n'apparaissaient pas dans le livre après création depuis le calendrier
• **Mécanismes de Rafraîchissement Forcé**: Ajoutées des mises à jour automatiques d'état pour une meilleure réactivité de l'interface
• **Gestion du Fuseau Horaire**: Résolu le problème critique de fuseau horaire causant la sauvegarde des tâches un jour avant la date sélectionnée
• **Traitement de Date Locale**: Implémentée la conversion correcte des chaînes de date locale pour prévenir les problèmes d'offset UTC

🎨 **Améliorations Intelligentes UI et UX:**
• **Bouton Flottant Réactif au Défilement**: Le bouton du menu flottant se réduit et disparaît intelligemment selon la position du défilement
• **Animation Progressive du Bouton**: Animations fluides avec le bouton se réduisant de 100% à 30% d'échelle pendant le défilement
• **Fermeture Automatique au Défilement**: Le menu se ferme automatiquement quand le bouton devient trop petit (scrollProgress > 0.153104)
• **Gestion d'État Désactivé**: Le bouton devient non interactif quand il est considérablement réduit

🔧 **Infrastructure Technique:**
• **Gestion d'État Améliorée**: Améliorées les interactions du store Zustand pour une meilleure consistance des données
• **Améliorations des Utilitaires de Date**: Meilleure gestion des conversions de date locale vs UTC dans toute l'application
• **Optimisations de Performance**: Réduits les re-renders inutiles et améliorée l'efficacité des composants
• **Prévention d'Erreurs**: Ajoutées des couches de validation pour prévenir les cas limites communs en gestion de tâches

🎯 **Version 1.8.1 - Traductions Widget et Correction Tâches Répétitives**

📱 **Nouvelles Fonctionnalités:**
• **Support Widget 5 Langues**: Le widget Android supporte maintenant complètement l'Espagnol, l'Anglais, le Français, le Portugais et l'Italien
• **Détection Automatique de Langue Widget**: Le widget détecte automatiquement la langue du système et affiche le contenu correspondant
• **Format de Date Localisé**: Les dates du widget sont formatées selon les standards régionaux de chaque langue
• **Progrès Tâches Multilingue**: Les indicateurs de progrès comme "5 de 10 terminées" sont correctement traduits

🔧 **Corrections Critiques:**
• **Reconnaissance Tâches Répétitives Widget**: Corrigé le problème critique où le widget Android n'affichait pas les tâches répétitives quand aucune tâche normale n'existait
• **Logique Unifiée des Tâches**: Le widget utilise maintenant la même logique éprouvée de calcul des tâches que le calendrier
• **Prévention Duplication Tâches**: Amélioré le filtrage pour prévenir les tâches dupliquées dans l'affichage du widget
• **Synchronisation Données Widget**: Améliorée la synchronisation du widget pour gérer correctement tous les scénarios de tâches

🌍 **Fonctionnalités Précédentes (v1.8.0):**
• **Support App 4 Langues**: Système complet de traduction pour l'Espagnol, l'Anglais, l'Italien et le Français
• **Détection Automatique de Langue**: L'app détecte la langue de l'appareil et la définit par défaut
• **Localisation du Calendrier**: Le calendrier affiche les noms des mois et jours dans la langue sélectionnée
• **Framework i18next**: Internationalisation complète avec support des espaces de noms
• **Gestion Tâches Répétitives**: Les tâches originales restent dans la ligne de création, évitant la suppression accidentelle

🎨 **Améliorations UI/UX:**
• **Messages d'Erreur Widget**: Tous les états d'erreur du widget sont maintenant correctement traduits
• **Format Texte Progrès**: Améliorée la lisibilité des indicateurs d'achèvement des tâches
• **Icônes Spécifiques par Langue**: Ajoutés des indicateurs visuels appropriés pour différents états de tâches
• **Changement de Langue Fluide**: L'app et le widget mettent à jour la langue sans redémarrage`,
  },
  it: {
    changes: `🚀 **Versione 1.10.0 - Note, Allegati, Tipi di Attività, Vista Annuale e Backup**

📝 **Novità:**
• **Note**: una nuova sezione con post-it colorati, separata dalle attività. Ogni nota può contenere file e immagini
• **Allegati**: aggiungi PDF, immagini e documenti ad attività e note (fino a 5 per elemento, 25 MB ciascuno). Vengono salvati nell'app e non richiedono alcuna autorizzazione
• **Tipi di attività**: crea le tue categorie con nome e colore; ogni tipo ha una scheda sopra il libro e filtra il libro, il calendario e le attività passate
• **Vista annuale**: i dodici mesi a colpo d'occhio, con le attività di un giorno, di un mese o dell'intero anno. Su Android e iPad c'è un pulsante per metterla in orizzontale
• **Backup**: nelle Impostazioni puoi creare un file cifrato con una password e ripristinarlo su un altro telefono. Include attività, note, tipi e impostazioni di visualizzazione, ma non gli allegati. Nessun account, nessun server; se dimentichi la password, il backup non può essere recuperato

🔄 **Attività ripetute e promemoria:**
• **Eliminare una ripetizione**: scegli tra solo questa, questa e le successive, o l'intera serie
• **Promemoria in anticipo**: quelli delle attività ripetute vengono pianificati 14 giorni prima e suonano anche se non apri l'app
• **Toccare una notifica** apre direttamente l'attività
• **Sveglie esatte su Android 14+**: l'app spiega come attivarle, con una scorciatoia nelle Impostazioni

📖 **Libro e calendario:**
• Il libro ora può andare indietro a partire da oggi (pagine -1, -2…)
• Riducendo le righe per pagina non si nascondono più le attività nelle righe più basse

🐛 **Correzioni:**
• Le date ora usano il tuo fuso orario: calendario, intestazioni delle pagine e attività passate non si spostano più di un giorno
• «Ogni 2/3/5 giorni» ora coincide tra libro e notifiche
• I testi delle notifiche appaiono nella tua lingua
• L'avviso «nuova versione installata» ora mostra le modifiche reali

🔒 **Privacy:** l'informativa è stata aggiornata per includere note, allegati e backup. I tuoi dati restano sul telefono

🎯 **Versione 1.9.0 - Gestione Avanzata Righe e Interfaccia Intelligente**

📝 **Miglioramenti Maggiori Gestione Righe:**
• **Righe Extra per Pagina**: Funzionalità linesPerPage migliorata per includere righe extra nel calcolo delle righe disponibili
• **Disponibilità Dinamica Righe**: Le pagine del libro ora calcolano correttamente totalLines = linesPerPage + extraLines per migliore utilizzo dello spazio
• **Distribuzione Intelligente Righe**: Sistema migliorato di gestione righe per migliore organizzazione attività ed esperienza utente

🔄 **Sistema Avanzato Attività Ripetute:**
• **Prevenzione Duplicati**: Corretto problema critico dove modificare schemi di ripetizione creava attività virtuali duplicate
• **Logica Aggiornamento Schemi**: Migliorato addRepeatingPattern per rilevare schemi esistenti e aggiornare invece di creare duplicati
• **Preservazione Attività Originali**: Le attività ripetute originali ora mantengono correttamente lo stato di completamento nel loro giorno di creazione
• **Gestione Attività Virtuali**: Migliorata la generazione di attività virtuali con migliore filtraggio e gestione stato

📱 **Correzioni Integrazione Calendario:**
• **Creazione Rapida Attività**: Aggiunta capacità di creare attività direttamente dal calendario con integrazione QuickAddTaskButton
• **Miglioramento Visibilità Attività**: Corretto problema dove le attività non apparivano nel libro dopo creazione dal calendario
• **Meccanismi Aggiornamento Forzato**: Aggiunti aggiornamenti automatici di stato per migliore reattività dell'interfaccia
• **Gestione Fuso Orario**: Risolto problema critico di fuso orario che causava il salvataggio delle attività un giorno prima della data selezionata
• **Elaborazione Data Locale**: Implementata conversione corretta di stringhe data locale per prevenire problemi offset UTC

🎨 **Miglioramenti Intelligenti UI e UX:**
• **Pulsante Flottante Reattivo allo Scorrimento**: Il pulsante del menu flottante ora si ridimensiona e scompare intelligentemente basato sulla posizione di scorrimento
• **Animazione Progressiva Pulsante**: Animazioni fluide con il pulsante che si riduce dal 100% al 30% di scala durante lo scorrimento
• **Chiusura Automatica allo Scorrimento**: Il menu si chiude automaticamente quando il pulsante diventa troppo piccolo (scrollProgress > 0.153104)
• **Gestione Stato Disabilitato**: Il pulsante diventa non interattivo quando viene ridotto significativamente

🔧 **Infrastruttura Tecnica:**
• **Gestione Stato Migliorata**: Migliorate le interazioni dello store Zustand per migliore consistenza dati
• **Miglioramenti Utilità Data**: Migliore gestione delle conversioni data locale vs UTC in tutta l'applicazione
• **Ottimizzazioni Performance**: Ridotti re-render non necessari e migliorata l'efficienza dei componenti
• **Prevenzione Errori**: Aggiunti livelli di validazione per prevenire casi limite comuni nella gestione attività

🎯 **Versione 1.8.1 - Traduzioni Widget e Correzione Attività Ripetute**

📱 **Nuove Funzionalità:**
• **Supporto Widget 5 Lingue**: Il widget Android ora supporta completamente Spagnolo, Inglese, Francese, Portoghese e Italiano
• **Rilevamento Automatico Lingua Widget**: Il widget rileva automaticamente la lingua del sistema e visualizza il contenuto corrispondente
• **Formato Data Localizzato**: Le date del widget sono formattate secondo gli standard regionali di ogni lingua
• **Progresso Attività Multilingue**: Gli indicatori di progresso come "5 di 10 completati" sono correttamente tradotti

🔧 **Correzioni Critiche:**
• **Riconoscimento Attività Ripetute Widget**: Corretto il problema critico dove il widget Android non mostrava attività ripetute quando non esistevano attività normali
• **Logica Unificata Attività**: Il widget ora usa la stessa logica provata di calcolo attività del calendario
• **Prevenzione Duplicazione Attività**: Migliorato il filtraggio per prevenire attività duplicate nella visualizzazione del widget
• **Sincronizzazione Dati Widget**: Migliorata la sincronizzazione del widget per gestire correttamente tutti gli scenari di attività

🌍 **Funzionalità Precedenti (v1.8.0):**
• **Supporto App 4 Lingue**: Sistema completo di traduzione per Spagnolo, Inglese, Italiano e Francese
• **Rilevamento Automatico Lingua**: L'app rileva la lingua del dispositivo e la imposta come predefinita
• **Localizzazione Calendario**: Il calendario mostra nomi di mesi e giorni nella lingua selezionata
• **Framework i18next**: Internazionalizzazione completa con supporto namespace
• **Gestione Attività Ripetute**: Le attività originali rimangono nella linea di creazione, prevenendo cancellazione accidentale

🎨 **Miglioramenti UI/UX:**
• **Messaggi Errore Widget**: Tutti gli stati di errore del widget sono ora correttamente tradotti
• **Formato Testo Progresso**: Migliorata la leggibilità degli indicatori di completamento attività
• **Icone Specifiche per Lingua**: Aggiunti indicatori visivi appropriati per diversi stati delle attività
• **Cambio Lingua Fluido**: Sia app che widget aggiornano la lingua senza riavvio`,
  },
};
