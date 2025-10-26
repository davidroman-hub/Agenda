package com.david_roman_a.david_roman_aapp;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.david_roman_a.david_roman_aapp.widget.WidgetUpdateService;
import android.util.Log;

public class WidgetDataModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "WidgetDataModule";
    
    public WidgetDataModule(ReactApplicationContext reactContext) {
        super(reactContext);
        Log.d(TAG, "WidgetDataModule creado");
    }
    
    @Override
    public String getName() {
        Log.d(TAG, "getName() llamado, retornando: WidgetDataManager");
        return "WidgetDataManager";
    }
    
    @ReactMethod
    public void updateTasks(String date, String tasksJson, Promise promise) {
        Log.d(TAG, "updateTasks llamado con fecha: " + date + ", datos: " + tasksJson);
        try {
            WidgetUpdateService.saveTasksToWidget(getReactApplicationContext(), date, tasksJson);
            Log.d(TAG, "Widget actualizado exitosamente");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error actualizando widget: " + e.getMessage());
            promise.reject("ERROR", e.getMessage());
        }
    }
}
