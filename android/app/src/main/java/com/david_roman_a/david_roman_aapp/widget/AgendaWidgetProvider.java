package com.david_roman_a.david_roman_aapp.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import com.david_roman_a.david_roman_aapp.MainActivity;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONArray;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.HashMap;
import java.util.Map;

public class AgendaWidgetProvider extends AppWidgetProvider {

    // Clase para manejar las traducciones del widget
    private static class WidgetTranslations {
        private final Map<String, String> translations;
        
        public WidgetTranslations(String language) {
            translations = new HashMap<>();
            loadTranslations(language);
        }
        
        private void loadTranslations(String language) {
            switch (language.toLowerCase()) {
                case "en":
                    loadEnglishTranslations();
                    break;
                case "fr":
                    loadFrenchTranslations();
                    break;
                case "pt":
                    loadPortugueseTranslations();
                    break;
                case "it":
                    loadItalianTranslations();
                    break;
                case "es":
                default:
                    loadSpanishTranslations();
                    break;
            }
        }
        
        private void loadSpanishTranslations() {
            translations.put("no_tasks", "Sin tareas");
            translations.put("completed_of", "de");
            translations.put("completed", "completadas");
            translations.put("all_completed", "¡Todas completadas!");
            translations.put("no_tasks_today", "Sin tareas hoy");
            translations.put("see_more", "Ver");
            translations.put("more_tasks", "tareas más...");
            translations.put("format_not_recognized", "Formato no reconocido");
            translations.put("format_error", "Error de formato");
            translations.put("widget_store_empty", "Widget Store vacío");
            translations.put("open_app_first", "Abre la app primero");
            translations.put("no_data", "Sin datos");
            translations.put("json_error", "Error JSON:");
            translations.put("general_error", "Error general");
            translations.put("open_app", "Abre la app");
            translations.put("error", "Error");
        }
        
        private void loadEnglishTranslations() {
            translations.put("no_tasks", "No tasks");
            translations.put("completed_of", "of");
            translations.put("completed", "completed");
            translations.put("all_completed", "All completed!");
            translations.put("no_tasks_today", "No tasks today");
            translations.put("see_more", "See");
            translations.put("more_tasks", "more tasks...");
            translations.put("format_not_recognized", "Format not recognized");
            translations.put("format_error", "Format error");
            translations.put("widget_store_empty", "Widget Store empty");
            translations.put("open_app_first", "Open app first");
            translations.put("no_data", "No data");
            translations.put("json_error", "JSON error:");
            translations.put("general_error", "General error");
            translations.put("open_app", "Open app");
            translations.put("error", "Error");
        }
        
        private void loadFrenchTranslations() {
            translations.put("no_tasks", "Aucune tâche");
            translations.put("completed_of", "de");
            translations.put("completed", "terminées");
            translations.put("all_completed", "Tout terminé!");
            translations.put("no_tasks_today", "Aucune tâche aujourd'hui");
            translations.put("see_more", "Voir");
            translations.put("more_tasks", "tâches de plus...");
            translations.put("format_not_recognized", "Format non reconnu");
            translations.put("format_error", "Erreur de format");
            translations.put("widget_store_empty", "Widget Store vide");
            translations.put("open_app_first", "Ouvrir l'app d'abord");
            translations.put("no_data", "Aucune donnée");
            translations.put("json_error", "Erreur JSON:");
            translations.put("general_error", "Erreur générale");
            translations.put("open_app", "Ouvrir l'app");
            translations.put("error", "Erreur");
        }
        
        private void loadPortugueseTranslations() {
            translations.put("no_tasks", "Sem tarefas");
            translations.put("completed_of", "de");
            translations.put("completed", "concluídas");
            translations.put("all_completed", "Todas concluídas!");
            translations.put("no_tasks_today", "Sem tarefas hoje");
            translations.put("see_more", "Ver");
            translations.put("more_tasks", "tarefas mais...");
            translations.put("format_not_recognized", "Formato não reconhecido");
            translations.put("format_error", "Erro de formato");
            translations.put("widget_store_empty", "Widget Store vazio");
            translations.put("open_app_first", "Abrir app primeiro");
            translations.put("no_data", "Sem dados");
            translations.put("json_error", "Erro JSON:");
            translations.put("general_error", "Erro geral");
            translations.put("open_app", "Abrir app");
            translations.put("error", "Erro");
        }
        
        private void loadItalianTranslations() {
            translations.put("no_tasks", "Nessun compito");
            translations.put("completed_of", "di");
            translations.put("completed", "completati");
            translations.put("all_completed", "Tutti completati!");
            translations.put("no_tasks_today", "Nessun compito oggi");
            translations.put("see_more", "Vedi");
            translations.put("more_tasks", "compiti in più...");
            translations.put("format_not_recognized", "Formato non riconosciuto");
            translations.put("format_error", "Errore di formato");
            translations.put("widget_store_empty", "Widget Store vuoto");
            translations.put("open_app_first", "Apri prima l'app");
            translations.put("no_data", "Nessun dato");
            translations.put("json_error", "Errore JSON:");
            translations.put("general_error", "Errore generale");
            translations.put("open_app", "Apri l'app");
            translations.put("error", "Errore");
        }
        
        public String get(String key) {
            return translations.getOrDefault(key, key);
        }
        
        public String getFormattedProgress(int completed, int total) {
            return "📋 " + completed + " " + get("completed_of") + " " + total + " " + get("completed");
        }
        
        public String getMoreTasksText(int remaining) {
            return "👁️ " + get("see_more") + " " + remaining + " " + get("more_tasks");
        }
    }

    public AgendaWidgetProvider() {
        super();
        android.util.Log.d("AgendaWidget", "=== CONSTRUCTOR AgendaWidgetProvider llamado ===");
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        android.util.Log.d("AgendaWidget", "=== onUpdate llamado con " + appWidgetIds.length + " widgets ===");
        for (int appWidgetId : appWidgetIds) {
            android.util.Log.d("AgendaWidget", "Actualizando widget ID: " + appWidgetId);
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        android.util.Log.d("AgendaWidget", "=== Widget HABILITADO por primera vez ===");
        
        // Forzar actualización inmediata cuando se habilita
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        android.content.ComponentName thisWidget = new android.content.ComponentName(context, AgendaWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        
        android.util.Log.d("AgendaWidget", "Forzando actualización para " + appWidgetIds.length + " widgets");
        onUpdate(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        android.util.Log.d("AgendaWidget", "=== onReceive: " + (intent != null ? intent.getAction() : "null") + " ===");
        
        // Manejar actualizaciones manuales
        if (intent != null && "android.appwidget.action.APPWIDGET_UPDATE".equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            android.content.ComponentName thisWidget = new android.content.ComponentName(context, AgendaWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        android.util.Log.d("AgendaWidget", "=== INICIANDO ACTUALIZACIÓN DE WIDGET " + appWidgetId + " ===");
        
        // Detectar idioma del sistema
        String systemLanguage = Locale.getDefault().getLanguage();
        android.util.Log.d("AgendaWidget", "🌐 Idioma del sistema detectado: " + systemLanguage);
        
        // Crear instancia de traducciones
        WidgetTranslations translations = new WidgetTranslations(systemLanguage);
        
        // Crear RemoteViews para el layout del widget
        RemoteViews views = new RemoteViews(context.getPackageName(), 
            context.getResources().getIdentifier("agenda_widget", "layout", context.getPackageName()));
        
        // Configurar título con fecha actual usando el idioma detectado
        SimpleDateFormat dateFormat;
        switch (systemLanguage.toLowerCase()) {
            case "en":
                dateFormat = new SimpleDateFormat("EEEE, MMM d", Locale.ENGLISH);
                break;
            case "fr":
                dateFormat = new SimpleDateFormat("EEEE d MMM", Locale.FRENCH);
                break;
            case "pt":
                dateFormat = new SimpleDateFormat("EEEE, d MMM", new Locale("pt", "BR"));
                break;
            case "it":
                dateFormat = new SimpleDateFormat("EEEE, d MMM", Locale.ITALIAN);
                break;
            case "es":
            default:
                dateFormat = new SimpleDateFormat("EEEE, d MMM", new Locale("es", "ES"));
                break;
        }
        
        String todayDate = dateFormat.format(new Date());
        views.setTextViewText(context.getResources().getIdentifier("widget_date", "id", context.getPackageName()), todayDate);
        
        // Intentar cargar datos desde Widget Store
        String[] taskTexts = {"", "", ""};
        String progressText = translations.get("no_tasks");
        
        try {
            // Buscar en múltiples SharedPreferences posibles
            String[] possibleSharedPrefsNames = {
                "ReactNative",
                "RCTAsyncLocalStorage",
                "RCTAsyncLocalStorage_V1", 
                "com.facebook.react.modules.storage.ReactDatabaseSupplier",
                "@react-native-async-storage/async-storage",
                "ReactNativeAsyncStorage",
                "AsyncLocalStorage",
                context.getPackageName() + "_preferences"
            };
            
            SharedPreferences asyncStoragePrefs = null;
            String foundPrefsName = null;
            
            android.util.Log.d("AgendaWidget", "=== BUSCANDO ASYNCSTORAGE EN DIFERENTES SHAREDPREFERENCES ===");
            
            // Buscar en todas las posibles fuentes
            for (String prefsName : possibleSharedPrefsNames) {
                try {
                    SharedPreferences testPrefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE);
                    java.util.Map<String, ?> testData = testPrefs.getAll();
                    android.util.Log.d("AgendaWidget", "SharedPrefs '" + prefsName + "': " + testData.size() + " claves");
                    
                    if (testData.size() > 0) {
                        asyncStoragePrefs = testPrefs;
                        foundPrefsName = prefsName;
                        break;
                    }
                } catch (Exception e) {
                    android.util.Log.d("AgendaWidget", "Error accediendo a '" + prefsName + "': " + e.getMessage());
                }
            }
            
            if (asyncStoragePrefs == null) {
                // Fallback a ReactNative por defecto
                asyncStoragePrefs = context.getSharedPreferences("ReactNative", Context.MODE_PRIVATE);
                foundPrefsName = "ReactNative (fallback)";
            }
            
            android.util.Log.d("AgendaWidget", "=== USANDO SHAREDPREFS: " + foundPrefsName + " ===");
            java.util.Map<String, ?> allPrefs = asyncStoragePrefs.getAll();
            android.util.Log.d("AgendaWidget", "Total de claves en AsyncStorage: " + allPrefs.size());
            
            // Mostrar las primeras 10 claves para debugging
            int keyCount = 0;
            for (String key : allPrefs.keySet()) {
                if (keyCount >= 10) break;
                Object value = allPrefs.get(key);
                String valuePreview = value != null ? value.toString().substring(0, Math.min(100, value.toString().length())) : "null";
                android.util.Log.d("AgendaWidget", "Clave #" + (++keyCount) + ": '" + key + "' = " + valuePreview + "...");
            }
            
            android.util.Log.d("AgendaWidget", "=== BUSCANDO WIDGET STORE ===");
            
            // Buscar las claves de la nueva Widget Store primero (ordenadas por prioridad)
            String[] widgetStoreKeys = {
                "widget_current_tasks",    // Datos más actualizados
                "agenda-widget-tasks",     // Datos del Widget Store
                "widget-data",
                "widget-simple-data"       // Datos de fallback
            };
            
            String widgetData = null;
            String foundKey = null;
            
            // Buscar en las claves de Widget Store (datos simples)
            for (String storeKey : widgetStoreKeys) {
                widgetData = asyncStoragePrefs.getString(storeKey, null);
                android.util.Log.d("AgendaWidget", "Probando Widget Store clave: '" + storeKey + "' = " + (widgetData != null ? "ENCONTRADO" : "null"));
                if (widgetData != null) {
                    foundKey = storeKey;
                    break;
                }
            }
            
            android.util.Log.d("AgendaWidget", "Widget Store encontrada en: " + (foundKey != null ? foundKey : "NINGUNA"));
            
            if (widgetData != null) {
                android.util.Log.d("AgendaWidget", "📄 Contenido Widget Store: " + widgetData.substring(0, Math.min(300, widgetData.length())) + "...");
                
                JSONObject storeData = new JSONObject(widgetData);
                
                // Verificar si son datos de Widget Store (formato simple)
                if (storeData.has("tasks") && storeData.has("totalTasks")) {
                    android.util.Log.d("AgendaWidget", "🎯 DATOS DE WIDGET STORE ENCONTRADOS");
                    
                    // Procesar datos simples de Widget Store
                    JSONArray tasksArray = storeData.optJSONArray("tasks");
                    int totalTasks = storeData.optInt("totalTasks", 0);
                    int completedTasks = storeData.optInt("completedTasks", 0);
                    String date = storeData.optString("date", "");
                    
                    android.util.Log.d("AgendaWidget", "📋 Widget Store - Total: " + totalTasks + ", Completadas: " + completedTasks + ", Fecha: " + date);
                    
                    // Configurar progreso correctamente
                    int pendingTasks = totalTasks - completedTasks;
                    progressText = translations.getFormattedProgress(completedTasks, totalTasks);
                    
                    if (tasksArray != null && tasksArray.length() > 0) {
                        // tasksArray contiene solo las tareas PENDIENTES (no completadas)
                        android.util.Log.d("AgendaWidget", "📋 Tareas pendientes en array: " + tasksArray.length());
                        
                        // Mostrar hasta 2 tareas pendientes
                        int tasksToShow = Math.min(tasksArray.length(), 2);
                        
                        for (int i = 0; i < tasksToShow; i++) {
                            String task = tasksArray.optString(i, "");
                            taskTexts[i] = "□ " + task + "\n  ──────────────";
                        }
                        
                        // Si hay más de 2 tareas pendientes, mostrar "Ver más" en la tercera posición
                        if (tasksArray.length() > 2) {
                            int remainingTasks = tasksArray.length() - 2; // Tareas pendientes restantes
                            taskTexts[2] = translations.getMoreTasksText(remainingTasks);
                        } else if (tasksToShow < 2) {
                            // Limpiar las posiciones no usadas
                            for (int i = tasksToShow; i < 3; i++) {
                                taskTexts[i] = "";
                            }
                        }
                        
                        android.util.Log.d("AgendaWidget", "✅ Widget actualizado: " + tasksToShow + " tareas mostradas, " + (tasksArray.length() - tasksToShow) + " restantes");
                    } else if (pendingTasks == 0 && totalTasks > 0) {
                        // Todas las tareas están completadas
                        taskTexts[0] = "✅ " + translations.get("all_completed") + "\n  ──────────────";
                        taskTexts[1] = "";
                        taskTexts[2] = "";
                        android.util.Log.d("AgendaWidget", "✅ Todas las tareas completadas");
                    } else {
                        // No hay tareas para hoy
                        taskTexts[0] = "📅 " + translations.get("no_tasks_today") + "\n  ──────────────";
                        taskTexts[1] = "";
                        taskTexts[2] = "";
                        android.util.Log.d("AgendaWidget", "📅 No hay tareas");
                    }
                } else {
                    android.util.Log.d("AgendaWidget", "❌ Formato de datos no reconocido");
                    taskTexts[0] = "❌ " + translations.get("format_not_recognized");
                    progressText = translations.get("format_error");
                }
            } else {
                android.util.Log.d("AgendaWidget", "❌ No se encontraron datos de Widget Store");
                taskTexts[0] = "❌ " + translations.get("widget_store_empty");
                taskTexts[1] = "📱 " + translations.get("open_app_first");
                taskTexts[2] = "";
                progressText = translations.get("no_data");
            }
            
        } catch (JSONException e) {
            android.util.Log.e("AgendaWidget", "❌ Error parseando JSON: " + e.getMessage());
            taskTexts[0] = "❌ " + translations.get("json_error") + " " + e.getMessage();
            progressText = translations.get("json_error").replace(":", "");
        } catch (Exception e) {
            android.util.Log.e("AgendaWidget", "❌ Error general: " + e.getMessage());
            taskTexts[0] = "❌ " + translations.get("general_error");
            taskTexts[1] = "📱 " + translations.get("open_app");
            taskTexts[2] = "";
            progressText = translations.get("error");
        }
        
        // Aplicar los datos al widget
        views.setTextViewText(context.getResources().getIdentifier("widget_progress", "id", context.getPackageName()), progressText);
        views.setTextViewText(context.getResources().getIdentifier("widget_task1", "id", context.getPackageName()), taskTexts[0]);
        views.setTextViewText(context.getResources().getIdentifier("widget_task2", "id", context.getPackageName()), taskTexts[1]);
        views.setTextViewText(context.getResources().getIdentifier("widget_task3", "id", context.getPackageName()), taskTexts[2]);
        
        android.util.Log.d("AgendaWidget", "📱 Widget actualizado con:");
        android.util.Log.d("AgendaWidget", "  Progreso: " + progressText);
        android.util.Log.d("AgendaWidget", "  Tarea 1: " + taskTexts[0]);
        android.util.Log.d("AgendaWidget", "  Tarea 2: " + taskTexts[1]);
        android.util.Log.d("AgendaWidget", "  Tarea 3: " + taskTexts[2]);
        
        // Configurar click para abrir la app
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(context.getResources().getIdentifier("widget_container", "id", context.getPackageName()), pendingIntent);
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
        android.util.Log.d("AgendaWidget", "=== WIDGET " + appWidgetId + " ACTUALIZADO EXITOSAMENTE ===");
    }
}
