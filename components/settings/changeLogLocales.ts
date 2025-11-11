export const changeLogLocales = {
  en: {
    changes: `🚀 **Version 1.9.0 - Enhanced Line Management & Smart UI**

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
    changes: `🚀 **Versión 1.9.0 - Gestión Avanzada de Líneas e Interfaz Inteligente**

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
    changes: `🚀 **Version 1.9.0 - Gestion Avancée des Lignes et Interface Intelligente**

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
    changes: `🚀 **Versione 1.9.0 - Gestione Avanzata Righe e Interfaccia Intelligente**

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
