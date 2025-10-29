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

public class AgendaWidgetProvider extends AppWidgetProvider {

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
        
        // Crear RemoteViews para el layout del widget
        RemoteViews views = new RemoteViews(context.getPackageName(), 
            context.getResources().getIdentifier("agenda_widget", "layout", context.getPackageName()));
        
        // Configurar título con fecha actual
        SimpleDateFormat dateFormat = new SimpleDateFormat("EEEE, d MMM", new Locale("es", "ES"));
        String todayDate = dateFormat.format(new Date());
        views.setTextViewText(context.getResources().getIdentifier("widget_date", "id", context.getPackageName()), todayDate);
        
        // Intentar cargar datos desde Widget Store
        String[] taskTexts = {"", "", ""};
        String progressText = "Sin tareas";
        
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
                    progressText = "📋 " + completedTasks + " de " + totalTasks + " completadas";
                    
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
                            taskTexts[2] = "👁️ Ver " + remainingTasks + " tareas más...";
                        } else if (tasksToShow < 2) {
                            // Limpiar las posiciones no usadas
                            for (int i = tasksToShow; i < 3; i++) {
                                taskTexts[i] = "";
                            }
                        }
                        
                        android.util.Log.d("AgendaWidget", "✅ Widget actualizado: " + tasksToShow + " tareas mostradas, " + (tasksArray.length() - tasksToShow) + " restantes");
                    } else if (pendingTasks == 0 && totalTasks > 0) {
                        // Todas las tareas están completadas
                        taskTexts[0] = "✅ ¡Todas completadas!\n  ──────────────";
                        taskTexts[1] = "";
                        taskTexts[2] = "";
                        android.util.Log.d("AgendaWidget", "✅ Todas las tareas completadas");
                    } else {
                        // No hay tareas para hoy
                        taskTexts[0] = "📅 Sin tareas hoy\n  ──────────────";
                        taskTexts[1] = "";
                        taskTexts[2] = "";
                        android.util.Log.d("AgendaWidget", "📅 No hay tareas");
                    }
                } else {
                    android.util.Log.d("AgendaWidget", "❌ Formato de datos no reconocido");
                    taskTexts[0] = "❌ Formato no reconocido";
                    progressText = "Error de formato";
                }
            } else {
                android.util.Log.d("AgendaWidget", "❌ No se encontraron datos de Widget Store");
                taskTexts[0] = "❌ Widget Store vacío";
                taskTexts[1] = "📱 Abre la app primero";
                taskTexts[2] = "";
                progressText = "Sin datos";
            }
            
        } catch (JSONException e) {
            android.util.Log.e("AgendaWidget", "❌ Error parseando JSON: " + e.getMessage());
            taskTexts[0] = "❌ Error JSON: " + e.getMessage();
            progressText = "Error JSON";
        } catch (Exception e) {
            android.util.Log.e("AgendaWidget", "❌ Error general: " + e.getMessage());
            taskTexts[0] = "❌ Error general";
            taskTexts[1] = "📱 Abre la app";
            taskTexts[2] = "";
            progressText = "Error";
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
