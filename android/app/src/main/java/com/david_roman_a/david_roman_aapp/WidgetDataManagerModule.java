package com.david_roman_a.david_roman_aapp;

import android.content.Context;
import android.content.SharedPreferences;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class WidgetDataManagerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "WidgetDataManager";

    public WidgetDataManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void saveWidgetData(String key, String data, Promise promise) {
        try {
            android.util.Log.d("WidgetDataManager", "=== GUARDANDO DATOS DIRECTAMENTE EN SHAREDPREFS ===");
            android.util.Log.d("WidgetDataManager", "Clave: " + key);
            android.util.Log.d("WidgetDataManager", "Datos: " + data);
            
            // Guardar en ReactNative SharedPreferences (el que usa AsyncStorage por defecto)
            SharedPreferences reactPrefs = getReactApplicationContext()
                .getSharedPreferences("ReactNative", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = reactPrefs.edit();
            editor.putString(key, data);
            editor.apply();
            
            android.util.Log.d("WidgetDataManager", "✅ Datos guardados en ReactNative SharedPrefs");
            
            // También guardar en RCTAsyncLocalStorage por si acaso
            SharedPreferences asyncPrefs = getReactApplicationContext()
                .getSharedPreferences("RCTAsyncLocalStorage", Context.MODE_PRIVATE);
            SharedPreferences.Editor asyncEditor = asyncPrefs.edit();
            asyncEditor.putString(key, data);
            asyncEditor.apply();
            
            android.util.Log.d("WidgetDataManager", "✅ Datos guardados en RCTAsyncLocalStorage SharedPrefs");
            
            // Verificar que se guardaron
            String savedData = reactPrefs.getString(key, null);
            android.util.Log.d("WidgetDataManager", "🔍 Verificación - datos guardados: " + (savedData != null ? "SÍ" : "NO"));
            
            promise.resolve("Datos guardados exitosamente");
        } catch (Exception e) {
            android.util.Log.e("WidgetDataManager", "❌ Error guardando datos: " + e.getMessage());
            promise.reject("ERROR", "Error guardando datos: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getAllKeys(Promise promise) {
        try {
            SharedPreferences reactPrefs = getReactApplicationContext()
                .getSharedPreferences("ReactNative", Context.MODE_PRIVATE);
            
            java.util.Map<String, ?> allData = reactPrefs.getAll();
            android.util.Log.d("WidgetDataManager", "=== LISTANDO TODAS LAS CLAVES ===");
            android.util.Log.d("WidgetDataManager", "Total de claves: " + allData.size());
            
            for (String key : allData.keySet()) {
                Object value = allData.get(key);
                String valuePreview = value != null ? value.toString().substring(0, Math.min(50, value.toString().length())) : "null";
                android.util.Log.d("WidgetDataManager", "Clave: '" + key + "' = " + valuePreview + "...");
            }
            
            promise.resolve("Listado completo - ver logs");
        } catch (Exception e) {
            promise.reject("ERROR", "Error listando claves: " + e.getMessage());
        }
    }

    @ReactMethod
    public void forceWidgetUpdate(Promise promise) {
        try {
            android.util.Log.d("WidgetDataManager", "=== FORZANDO ACTUALIZACIÓN DEL WIDGET ===");
            
            android.appwidget.AppWidgetManager appWidgetManager = android.appwidget.AppWidgetManager.getInstance(getReactApplicationContext());
            android.content.ComponentName thisWidget = new android.content.ComponentName(getReactApplicationContext(), 
                com.david_roman_a.david_roman_aapp.widget.AgendaWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            
            android.util.Log.d("WidgetDataManager", "Encontrados " + appWidgetIds.length + " widgets para actualizar");
            
            if (appWidgetIds.length > 0) {
                android.content.Intent intent = new android.content.Intent(getReactApplicationContext(), 
                    com.david_roman_a.david_roman_aapp.widget.AgendaWidgetProvider.class);
                intent.setAction(android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                intent.putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
                getReactApplicationContext().sendBroadcast(intent);
                
                android.util.Log.d("WidgetDataManager", "✅ Broadcast enviado para actualizar widgets");
                promise.resolve("Widget actualizado exitosamente");
            } else {
                android.util.Log.d("WidgetDataManager", "❌ No se encontraron widgets para actualizar");
                promise.resolve("No hay widgets para actualizar");
            }
            
        } catch (Exception e) {
            android.util.Log.e("WidgetDataManager", "❌ Error forzando actualización: " + e.getMessage());
            promise.reject("ERROR", "Error forzando actualización: " + e.getMessage());
        }
    }
}
